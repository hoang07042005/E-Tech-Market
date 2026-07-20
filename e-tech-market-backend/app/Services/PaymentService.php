<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Payment;
use App\Models\Transaction;
use App\Notifications\OrderConfirmationNotification;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Str;

class PaymentService
{
    // ─── VNPAY ────────────────────────────────────────────────────────

    /**
     * Build the VNPAY payment URL for a given order.
     *
     * @return array{pay_url: string, payment_id: int}|array{error: string, code: int}
     */
    public function createVnpayPaymentUrl(Order $order, ?string $clientIp): array
    {
        $order = $this->recalculateOrderTotal($order);
        $payment = $this->findOrCreatePayment($order, 'vnpay');

        // Allow creating payment URL for:
        // - pending orders (COD that hasn't been paid)
        // - pending_payment orders (waiting for VnPay/MoMo payment)
        $isPaid = $payment->status === 'paid' || $order->payment_status === 'paid';
        $canPay = $order->status === 'pending' || $order->status === 'pending_payment' || $order->payment_status === 'pending';

        if ($isPaid || ! $canPay) {
            return ['error' => 'Order already paid', 'code' => 422];
        }

        $tmnCode = (string) config('services.vnpay.tmn_code');
        $hashSecret = (string) config('services.vnpay.hash_secret');
        $baseUrl = (string) config('services.vnpay.url');

        if ($tmnCode === '' || $hashSecret === '' || $baseUrl === '') {
            return ['error' => 'VNPAY not configured', 'code' => 500];
        }

        $appUrl = rtrim((string) config('app.url'), '/');
        $returnUrl = $appUrl.'/api/v1/payments/vnpay/return';

        \Illuminate\Support\Facades\Log::info('VNPay amount debug', [
            'order_code'      => $order->order_code,
            'subtotal_amount' => $order->subtotal_amount,
            'discount_amount' => $order->discount_amount,
            'shipping_fee'    => $order->shipping_fee,
            'points_used'     => $order->points_used,
            'points_discount' => $order->points_discount,
            'total_amount'    => $order->total_amount,
        ]);
        $amountVnd = (int) round((float) $order->total_amount);
        $startTime = Carbon::now('Asia/Ho_Chi_Minh');
        $expireTime = $startTime->copy()->addMinutes(15);

        $inputData = [
            'vnp_Version' => '2.1.0',
            'vnp_TmnCode' => $tmnCode,
            'vnp_Amount' => $amountVnd * 100,
            'vnp_Command' => 'pay',
            'vnp_CreateDate' => $startTime->format('YmdHis'),
            'vnp_CurrCode' => 'VND',
            'vnp_IpAddr' => $clientIp,
            'vnp_Locale' => 'vn',
            'vnp_OrderInfo' => 'Thanh toan don '.$order->order_code,
            'vnp_OrderType' => 'other',
            'vnp_ReturnUrl' => $returnUrl,
            'vnp_TxnRef' => $order->order_code,
            'vnp_ExpireDate' => $expireTime->format('YmdHis'),
        ];

        ksort($inputData);
        $hashData = $this->buildVnpayHashData($inputData);
        $query = '';
        foreach ($inputData as $key => $value) {
            $query .= urlencode((string) $key).'='.urlencode((string) $value).'&';
        }

        $vnpUrl = rtrim($baseUrl, '?').'?'.$query;
        $secureHash = hash_hmac('sha512', $hashData, $hashSecret);
        $vnpUrl .= 'vnp_SecureHash='.$secureHash;

        return [
            'order_id' => $order->id,
            'order_code' => $order->order_code,
            'payment_id' => $payment->id,
            'pay_url' => $vnpUrl,
        ];
    }

    /**
     * Process a VNPAY callback (return or IPN).
     *
     * @return array{verified: bool, success: bool, order_code: ?string, order_id: ?int}
     */
    public function handleVnpayCallback(array $queryParams): array
    {
        $hashSecret = (string) config('services.vnpay.hash_secret');

        $inputData = [];
        foreach ($queryParams as $key => $value) {
            if (is_string($key) && str_starts_with($key, 'vnp_')) {
                $inputData[$key] = $value;
            }
        }

        $secureHash = (string) ($inputData['vnp_SecureHash'] ?? '');
        unset($inputData['vnp_SecureHash'], $inputData['vnp_SecureHashType']);

        ksort($inputData);
        $hashData = $this->buildVnpayHashData($inputData);

        $verified = hash_equals(hash_hmac('sha512', $hashData, $hashSecret), $secureHash);

        $orderCode = (string) ($inputData['vnp_TxnRef'] ?? '');
        $vnpTransactionNo = (string) ($inputData['vnp_TransactionNo'] ?? '');
        if ($vnpTransactionNo === '0') {
            $vnpTransactionNo = '';
        }
        $amount = isset($inputData['vnp_Amount']) ? ((float) $inputData['vnp_Amount'] / 100) : null;
        $respCode = (string) ($inputData['vnp_ResponseCode'] ?? '');
        $tranStatus = (string) ($inputData['vnp_TransactionStatus'] ?? '');
        $success = $verified && $respCode === '00' && $tranStatus === '00';

        $orderId = null;
        if ($verified && $orderCode !== '') {
            DB::transaction(function () use ($orderCode, $success, $vnpTransactionNo, $amount, $inputData) {
                $order = Order::query()->where('order_code', $orderCode)->lockForUpdate()->first();
                if (! $order) {
                    return;
                }

                $order = $this->recalculateOrderTotal($order);
        $payment = $this->findOrCreatePayment($order, 'vnpay');

                // idempotent: if already paid, keep it.
                if ($payment->status === 'paid' || $order->payment_status === 'paid') {
                    return;
                }

                $this->settlePayment($payment, $order, $success, $vnpTransactionNo);

                Transaction::query()->create([
                    'payment_id' => $payment->id,
                    'provider' => 'vnpay',
                    'provider_transaction_id' => $vnpTransactionNo !== '' ? $vnpTransactionNo : null,
                    'amount' => $amount ?? (float) $order->total_amount,
                    'currency' => $order->currency ?? 'VND',
                    'status' => $success ? 'success' : 'failed',
                    'raw_response' => $inputData,
                ]);
            });

            $orderId = Order::query()->where('order_code', $orderCode)->value('id');
        }

        return [
            'verified' => $verified,
            'success' => $success,
            'order_code' => $orderCode !== '' ? $orderCode : null,
            'order_id' => $orderId,
        ];
    }

    // ─── MOMO ─────────────────────────────────────────────────────────

    /**
     * Build the MoMo payment URL for a given order.
     *
     * @return array{pay_url: string, ...}|array{error: string, code: int}
     */
    public function createMomoPaymentUrl(Order $order, ?string $requestType): array
    {
        $order = $this->recalculateOrderTotal($order);
        $payment = $this->findOrCreatePayment($order, 'momo');

        // Allow creating payment URL for:
        // - pending orders (COD that hasn't been paid)
        // - pending_payment orders (waiting for MoMo payment)
        $isPaid = $payment->status === 'paid' || $order->payment_status === 'paid';
        $canPay = $order->status === 'pending' || $order->status === 'pending_payment' || $order->payment_status === 'pending';

        if ($isPaid || ! $canPay) {
            return ['error' => 'Order already paid', 'code' => 422];
        }

        $partnerCode = (string) config('services.momo.partner_code');
        $accessKey = (string) config('services.momo.access_key');
        $secretKey = (string) config('services.momo.secret_key');
        $endpoint = (string) config('services.momo.endpoint');

        if ($partnerCode === '' || $accessKey === '' || $secretKey === '' || $endpoint === '') {
            return ['error' => 'MoMo not configured', 'code' => 500];
        }

        $appUrl = rtrim((string) config('app.url'), '/');
        $redirectUrl = $appUrl.'/api/v1/payments/momo/return';
        $ipnUrl = $appUrl.'/api/v2/webhooks/momo/ipn';

        $amountVnd = (string) ((int) round((float) $order->total_amount));
        $orderId = $order->order_code.'__'.Str::uuid()->toString();
        $momoRequestId = Str::uuid()->toString();
        $orderInfo = 'Thanh toán đơn '.$order->order_code;

        $requestType = (string) ($requestType ?? 'payWithMethod');
        if (! in_array($requestType, ['captureWallet', 'payWithATM', 'payWithMethod'], true)) {
            $requestType = 'payWithMethod';
        }

        $extraData = base64_encode(json_encode([
            'order_code' => $order->order_code,
            'order_id' => $order->id,
        ], JSON_UNESCAPED_UNICODE));

        $rawHash = 'accessKey='.$accessKey.
            '&amount='.$amountVnd.
            '&extraData='.$extraData.
            '&ipnUrl='.$ipnUrl.
            '&orderId='.$orderId.
            '&orderInfo='.$orderInfo.
            '&partnerCode='.$partnerCode.
            '&redirectUrl='.$redirectUrl.
            '&requestId='.$momoRequestId.
            '&requestType='.$requestType;

        $signature = hash_hmac('sha256', $rawHash, $secretKey);

        $payload = [
            'partnerCode' => $partnerCode,
            'partnerName' => 'E-Tech Market',
            'storeId' => 'ETechMarket',
            'requestId' => $momoRequestId,
            'amount' => $amountVnd,
            'orderId' => $orderId,
            'orderInfo' => $orderInfo,
            'requestType' => $requestType,
            'redirectUrl' => $redirectUrl,
            'ipnUrl' => $ipnUrl,
            'lang' => 'vi',
            'extraData' => $extraData,
            'signature' => $signature,
        ];

        $resp = Http::timeout(10)->acceptJson()->asJson()->post($endpoint, $payload);
        if (! $resp->ok()) {
            \Illuminate\Support\Facades\Log::error('MoMo Create Failed', ['status' => $resp->status(), 'body' => $resp->body(), 'payload' => $payload]);
            return ['error' => 'MoMo create payment failed', 'detail' => $resp->body(), 'code' => 502];
        }

        $json = $resp->json();
        if (! is_array($json)) {
            return ['error' => 'MoMo invalid response', 'detail' => $json, 'code' => 502];
        }

        $resultCode = isset($json['resultCode']) ? (string) $json['resultCode'] : null;
        if ($resultCode !== null && $resultCode !== '0') {
            $message = isset($json['message']) ? (string) $json['message'] : 'MoMo error';
            \Illuminate\Support\Facades\Log::error('MoMo Error Result', ['resultCode' => $resultCode, 'message' => $message, 'detail' => $json]);
            return ['error' => $message, 'detail' => $json, 'code' => 502];
        }

        $candidateKeys = ['payUrl', 'shortLink', 'deeplink', 'deeplinkMiniApp', 'qrCodeUrl'];
        $payUrl = null;
        foreach ($candidateKeys as $k) {
            if (isset($json[$k]) && is_string($json[$k]) && $json[$k] !== '') {
                $payUrl = $json[$k];
                break;
            }
        }
        if (! is_string($payUrl)) {
            return ['error' => 'MoMo redirect url missing', 'detail' => $json, 'code' => 502];
        }

        return [
            'order_id' => $order->id,
            'order_code' => $order->order_code,
            'payment_id' => $payment->id,
            'pay_url' => $payUrl,
            'raw' => $json,
        ];
    }

    /**
     * Process a MoMo callback (IPN or return redirect).
     *
     * @return array{verified: bool, success: bool, order_code: ?string, order_id: ?int}
     */
    public function handleMomoCallback(array $data): array
    {
        $partnerCode = (string) ($data['partnerCode'] ?? '');
        $orderIdRaw = (string) ($data['orderId'] ?? '');
        $requestId = (string) ($data['requestId'] ?? '');
        $amount = (string) ($data['amount'] ?? '');
        $orderInfo = (string) ($data['orderInfo'] ?? '');
        $orderType = (string) ($data['orderType'] ?? '');
        $transId = (string) ($data['transId'] ?? '');
        $resultCode = (string) ($data['resultCode'] ?? '');
        $message = (string) ($data['message'] ?? '');
        $payType = (string) ($data['payType'] ?? '');
        $responseTime = (string) ($data['responseTime'] ?? '');
        $extraData = (string) ($data['extraData'] ?? '');
        $momoSignature = (string) ($data['signature'] ?? '');

        $accessKey = (string) config('services.momo.access_key');
        $secretKey = (string) config('services.momo.secret_key');

        $rawHash = 'accessKey='.$accessKey.
            '&amount='.$amount.
            '&extraData='.$extraData.
            '&message='.$message.
            '&orderId='.$orderIdRaw.
            '&orderInfo='.$orderInfo.
            '&orderType='.$orderType.
            '&partnerCode='.$partnerCode.
            '&payType='.$payType.
            '&requestId='.$requestId.
            '&responseTime='.$responseTime.
            '&resultCode='.$resultCode.
            '&transId='.$transId;

        $partnerSignature = hash_hmac('sha256', $rawHash, $secretKey);
        $verified = hash_equals($partnerSignature, $momoSignature);
        $success = $verified && $resultCode === '0';

        $orderCode = '';
        if ($orderIdRaw !== '' && str_contains($orderIdRaw, '__')) {
            $orderCode = explode('__', $orderIdRaw, 2)[0];
        }
        if ($orderCode === '') {
            $decoded = base64_decode($extraData, true);
            if (is_string($decoded) && $decoded !== '') {
                $parsed = json_decode($decoded, true);
                if (is_array($parsed) && isset($parsed['order_code']) && is_string($parsed['order_code'])) {
                    $orderCode = $parsed['order_code'];
                }
            }
        }

        $orderId = null;
        if ($verified && $orderCode !== '') {
            DB::transaction(function () use ($orderCode, $success, $transId, $amount, $data, &$orderId) {
                $order = Order::query()->where('order_code', $orderCode)->lockForUpdate()->first();
                if (! $order) {
                    return;
                }

                $order = $this->recalculateOrderTotal($order);
        $payment = $this->findOrCreatePayment($order, 'momo');

                if ($payment->status !== 'paid' && $order->payment_status !== 'paid') {
                    $this->settlePayment($payment, $order, $success, $transId !== '' ? $transId : null);
                }

                Transaction::query()->create([
                    'payment_id' => $payment->id,
                    'provider' => 'momo',
                    'provider_transaction_id' => $transId !== '' ? $transId : null,
                    'amount' => is_numeric($amount) ? (float) $amount : (float) $order->total_amount,
                    'currency' => $order->currency ?? 'VND',
                    'status' => $success ? 'success' : 'failed',
                    'raw_response' => $data,
                ]);

                $orderId = $order->id;
            });
        }

        return [
            'verified' => $verified,
            'success' => $success,
            'order_code' => $orderCode !== '' ? $orderCode : null,
            'order_id' => $orderId,
        ];
    }

    // ─── Shared Helpers ───────────────────────────────────────────────

    private function recalculateOrderTotal(Order $order): Order
    {
        // Do NOT recalculate - the total_amount was already correctly computed
        // during order creation (including points_discount, coupon discount, etc.)
        // Overwriting it here would lose those discounts.
        // Just ensure items are loaded for any callers that need them.
        $order->loadMissing(["items"]);
        return $order;
    }


    private function findOrCreatePayment(Order $order, string $method): Payment
    {
        $payment = Payment::query()
            ->where('order_id', $order->id)
            ->where('method', $method)
            ->first();

        if ($payment) {
            // Always sync amount from order to ensure correct total before payment
            $payment->amount = $order->total_amount;
            $payment->currency = $order->currency ?? 'VND';
            $payment->save();

            return $payment;
        }

        return Payment::query()->create([
            'order_id' => $order->id,
            'method' => $method,
            'amount' => $order->total_amount,
            'currency' => $order->currency ?? 'VND',
            'status' => 'pending',
        ]);
    }

    /**
     * Settle (mark paid/failed) and optionally send confirmation email.
     * For orders with 'pending_payment' status:
     * - On success: convert to 'pending' (visible to user)
     * - On failure: delete the order
     */
    private function settlePayment(Payment $payment, Order $order, bool $success, ?string $transactionCode): void
    {
        if ($success) {
            $payment->status = 'paid';
            $payment->transaction_code = $transactionCode ?? $payment->transaction_code;
            $payment->paid_at = now();
            $payment->save();

            $order->payment_status = 'paid';

            // Convert from 'pending_payment' to 'pending' (make visible to user)
            if ($order->status === 'pending_payment') {
                $order->status = 'pending';
            }

            $order->save();

            $email = $order->user?->email ?? null;
            if ($email) {
                Notification::route('mail', $email)->notify(new OrderConfirmationNotification($order));
            }

            try {
                Redis::connection()->publish('user-events.' . $order->user_id, json_encode([
                    'type' => 'payment_confirmed',
                    'order_id' => $order->id,
                    'order_code' => $order->order_code,
                    'status' => 'paid',
                ]));
            } catch (\Exception $e) {}
        } else {
            $payment->status = 'failed';
            $payment->transaction_code = $transactionCode ?? $payment->transaction_code;
            $payment->save();

            // For orders in 'pending_payment' status, cancel them on failure instead of deleting
            // This ensures inventory is restored properly and avoids foreign key constraint errors
            if ($order->status === 'pending_payment') {
                app(\App\Services\OrderService::class)->cancelOrder($order, $order->user);
                $payment->status = 'failed';
                $payment->transaction_code = $transactionCode ?? $payment->transaction_code;
                $payment->save();
                return;
            }

            $order->payment_status = 'failed';
            $order->save();

            try {
                Redis::connection()->publish('user-events.' . $order->user_id, json_encode([
                    'type' => 'payment_failed',
                    'order_id' => $order->id,
                    'order_code' => $order->order_code,
                    'status' => 'failed',
                ]));
            } catch (\Exception $e) {}
        }
    }

    private function buildVnpayHashData(array $inputData): string
    {
        $i = 0;
        $hashData = '';
        foreach ($inputData as $key => $value) {
            if ($i === 1) {
                $hashData .= '&'.urlencode((string) $key).'='.urlencode((string) $value);
            } else {
                $hashData .= urlencode((string) $key).'='.urlencode((string) $value);
                $i = 1;
            }
        }

        return $hashData;
    }
}
