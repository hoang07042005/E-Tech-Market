<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Transaction;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use App\Notifications\OrderConfirmationNotification;
use Illuminate\Support\Facades\Notification;

class PaymentsController extends Controller
{
    private function handleMomoCallback(array $data): array
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

        $rawHash = 'accessKey=' . $accessKey .
            '&amount=' . $amount .
            '&extraData=' . $extraData .
            '&message=' . $message .
            '&orderId=' . $orderIdRaw .
            '&orderInfo=' . $orderInfo .
            '&orderType=' . $orderType .
            '&partnerCode=' . $partnerCode .
            '&payType=' . $payType .
            '&requestId=' . $requestId .
            '&responseTime=' . $responseTime .
            '&resultCode=' . $resultCode .
            '&transId=' . $transId;

        $partnerSignature = hash_hmac('sha256', $rawHash, $secretKey);
        $verified = hash_equals($partnerSignature, $momoSignature);
        $success = $verified && $resultCode === '0';

        $orderCode = '';
        if ($orderIdRaw !== '' && str_contains($orderIdRaw, '__')) {
            $orderCode = explode('__', $orderIdRaw, 2)[0];
        }
        if ($orderCode === '' && $extraData !== '') {
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
                if (!$order) {
                    return;
                }

                $payment = Payment::query()->firstOrCreate(
                    ['order_id' => $order->id],
                    [
                        'method' => 'momo',
                        'amount' => $order->total_amount,
                        'currency' => $order->currency ?? 'VND',
                        'status' => 'pending',
                    ]
                );

                if ($payment->status !== 'paid' && $order->payment_status !== 'paid') {
                    if ($success) {
                        $payment->status = 'paid';
                        $payment->transaction_code = $transId !== '' ? $transId : $payment->transaction_code;
                        $payment->paid_at = now();
                        $payment->save();

                        $order->payment_status = 'paid';
                        $order->save();

                        $email = $order->user?->email ?? null;
                        if ($email) {
                            Notification::route('mail', $email)->notify(new OrderConfirmationNotification($order));
                        }
                    } else {
                        $payment->status = 'failed';
                        $payment->transaction_code = $transId !== '' ? $transId : $payment->transaction_code;
                        $payment->save();

                        $order->payment_status = 'failed';
                        $order->save();
                    }
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

    public function createVnpay(Order $order, Request $request): JsonResponse
    {
        $this->authorize('view', $order);
        $user = $request->user();

        $payment = Payment::query()->firstOrCreate(
            ['order_id' => $order->id],
            [
                'method' => 'vnpay',
                'amount' => $order->total_amount,
                'currency' => $order->currency ?? 'VND',
                'status' => 'pending',
            ]
        );

        if ($payment->status === 'paid' || $order->payment_status === 'paid') {
            return response()->json(['message' => 'Order already paid'], 422);
        }

        $tmnCode = (string) config('services.vnpay.tmn_code');
        $hashSecret = (string) config('services.vnpay.hash_secret');
        $baseUrl = (string) config('services.vnpay.url');

        if ($tmnCode === '' || $hashSecret === '' || $baseUrl === '') {
            return response()->json(['message' => 'VNPAY not configured'], 500);
        }

        $appUrl = rtrim((string) config('app.url'), '/');
        $returnUrl = $appUrl . '/api/payments/vnpay/return';

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
            'vnp_IpAddr' => $request->ip(),
            'vnp_Locale' => 'vn',
            'vnp_OrderInfo' => 'Thanh toan don ' . $order->order_code,
            'vnp_OrderType' => 'other',
            'vnp_ReturnUrl' => $returnUrl,
            'vnp_TxnRef' => $order->order_code,
            'vnp_ExpireDate' => $expireTime->format('YmdHis'),
        ];

        ksort($inputData);
        $query = '';
        $hashData = '';
        $i = 0;
        foreach ($inputData as $key => $value) {
            if ($i === 1) {
                $hashData .= '&' . urlencode((string) $key) . '=' . urlencode((string) $value);
            } else {
                $hashData .= urlencode((string) $key) . '=' . urlencode((string) $value);
                $i = 1;
            }
            $query .= urlencode((string) $key) . '=' . urlencode((string) $value) . '&';
        }

        $vnpUrl = rtrim($baseUrl, '?') . '?' . $query;
        $secureHash = hash_hmac('sha512', $hashData, $hashSecret);
        $vnpUrl .= 'vnp_SecureHash=' . $secureHash;

        return response()->json([
            'order_id' => $order->id,
            'order_code' => $order->order_code,
            'payment_id' => $payment->id,
            'pay_url' => $vnpUrl,
        ]);
    }

    public function vnpayReturn(Request $request): RedirectResponse
    {
        $result = $this->handleVnpayCallback($request);
        $frontendUrl = rtrim((string) config('app.frontend_url', ''), '/');

        if ($frontendUrl === '') {
            // fallback: just redirect to home
            return redirect('/');
        }

        $qs = http_build_query([
            'gateway' => 'vnpay',
            'success' => $result['success'] ? '1' : '0',
            'order_code' => $result['order_code'] ?? null,
            'order_id' => $result['order_id'] ?? null,
        ]);

        return redirect($frontendUrl . '/checkout?' . $qs);
    }

    public function vnpayIpn(Request $request): JsonResponse
    {
        $result = $this->handleVnpayCallback($request);
        if (!$result['verified']) {
            return response()->json(['RspCode' => '97', 'Message' => 'Invalid signature']);
        }

        return response()->json(['RspCode' => '00', 'Message' => 'Confirm Success']);
    }

    private function handleVnpayCallback(Request $request): array
    {
        $hashSecret = (string) config('services.vnpay.hash_secret');

        $inputData = [];
        foreach ($request->query() as $key => $value) {
            if (is_string($key) && str_starts_with($key, 'vnp_')) {
                $inputData[$key] = $value;
            }
        }

        $secureHash = (string) ($inputData['vnp_SecureHash'] ?? '');
        unset($inputData['vnp_SecureHash'], $inputData['vnp_SecureHashType']);

        ksort($inputData);
        $i = 0;
        $hashData = '';
        foreach ($inputData as $key => $value) {
            if ($i === 1) {
                $hashData .= '&' . urlencode((string) $key) . '=' . urlencode((string) $value);
            } else {
                $hashData .= urlencode((string) $key) . '=' . urlencode((string) $value);
                $i = 1;
            }
        }

        $verified = hash_hmac('sha512', $hashData, $hashSecret) === $secureHash;

        $orderCode = (string) ($inputData['vnp_TxnRef'] ?? '');
        $vnpTransactionNo = (string) ($inputData['vnp_TransactionNo'] ?? '');
        $amount = isset($inputData['vnp_Amount']) ? ((float) $inputData['vnp_Amount'] / 100) : null;
        $respCode = (string) ($inputData['vnp_ResponseCode'] ?? '');
        $tranStatus = (string) ($inputData['vnp_TransactionStatus'] ?? '');
        $success = $verified && $respCode === '00' && $tranStatus === '00';

        $orderId = null;
        if ($verified && $orderCode !== '') {
            DB::transaction(function () use ($orderCode, $success, $vnpTransactionNo, $amount, $inputData) {
                $order = Order::query()->where('order_code', $orderCode)->lockForUpdate()->first();
                if (!$order) {
                    return;
                }

                $payment = Payment::query()->firstOrCreate(
                    ['order_id' => $order->id],
                    [
                        'method' => 'vnpay',
                        'amount' => $order->total_amount,
                        'currency' => $order->currency ?? 'VND',
                        'status' => 'pending',
                    ]
                );

                // idempotent: if already paid, keep it.
                if ($payment->status === 'paid' || $order->payment_status === 'paid') {
                    return;
                }

                if ($success) {
                    $payment->status = 'paid';
                    $payment->transaction_code = $vnpTransactionNo !== '' ? $vnpTransactionNo : $payment->transaction_code;
                    $payment->paid_at = now();
                    $payment->save();

                    $order->payment_status = 'paid';
                    $order->save();

                    $email = $order->user?->email ?? null;
                    if ($email) {
                        Notification::route('mail', $email)->notify(new OrderConfirmationNotification($order));
                    }
                } else {
                    $payment->status = 'failed';
                    $payment->transaction_code = $vnpTransactionNo !== '' ? $vnpTransactionNo : $payment->transaction_code;
                    $payment->save();

                    $order->payment_status = 'failed';
                    $order->save();
                }

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

    public function createMomo(Order $order, Request $request): JsonResponse
    {
        $this->authorize('view', $order);
        $user = $request->user();

        $validated = $request->validate([
            'request_type' => ['nullable', 'string', 'max:50'], // captureWallet | payWithATM | payWithMethod
        ]);

        $payment = Payment::query()->firstOrCreate(
            ['order_id' => $order->id],
            [
                'method' => 'momo',
                'amount' => $order->total_amount,
                'currency' => $order->currency ?? 'VND',
                'status' => 'pending',
            ]
        );

        if ($payment->status === 'paid' || $order->payment_status === 'paid') {
            return response()->json(['message' => 'Order already paid'], 422);
        }

        $partnerCode = (string) config('services.momo.partner_code');
        $accessKey = (string) config('services.momo.access_key');
        $secretKey = (string) config('services.momo.secret_key');
        $endpoint = (string) config('services.momo.endpoint');

        if ($partnerCode === '' || $accessKey === '' || $secretKey === '' || $endpoint === '') {
            return response()->json(['message' => 'MoMo not configured'], 500);
        }

        $appUrl = rtrim((string) config('app.url'), '/');
        $redirectUrl = $appUrl . '/api/payments/momo/return';
        $ipnUrl = $appUrl . '/api/payments/momo/ipn';

        $amountVnd = (string) ((int) round((float) $order->total_amount));
        // MoMo requires orderId to be unique per create request; otherwise it rejects retries.
        // Keep stable reference in prefix so we can map callbacks to our order.
        $orderId = $order->order_code . '__' . Str::uuid()->toString();
        $requestId = Str::uuid()->toString();
        $orderInfo = 'Thanh toán đơn ' . $order->order_code;
        $requestType = (string) ($validated['request_type'] ?? 'payWithMethod');
        if (!in_array($requestType, ['captureWallet', 'payWithATM', 'payWithMethod'], true)) {
            $requestType = 'payWithMethod';
        }
        // Encode our order_code for robust callback mapping.
        $extraData = base64_encode(json_encode([
            'order_code' => $order->order_code,
            'order_id' => $order->id,
        ], JSON_UNESCAPED_UNICODE));

        $rawHash = 'accessKey=' . $accessKey .
            '&amount=' . $amountVnd .
            '&extraData=' . $extraData .
            '&ipnUrl=' . $ipnUrl .
            '&orderId=' . $orderId .
            '&orderInfo=' . $orderInfo .
            '&partnerCode=' . $partnerCode .
            '&redirectUrl=' . $redirectUrl .
            '&requestId=' . $requestId .
            '&requestType=' . $requestType;

        $signature = hash_hmac('sha256', $rawHash, $secretKey);

        $payload = [
            'partnerCode' => $partnerCode,
            'partnerName' => 'E-Tech Market',
            'storeId' => 'ETechMarket',
            'requestId' => $requestId,
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
        if (!$resp->ok()) {
            return response()->json(['message' => 'MoMo create payment failed', 'detail' => $resp->body()], 502);
        }

        $json = $resp->json();
        if (!is_array($json)) {
            return response()->json(['message' => 'MoMo invalid response', 'detail' => $json], 502);
        }

        // If MoMo returned an error, surface it clearly.
        $resultCode = isset($json['resultCode']) ? (string) $json['resultCode'] : null;
        if ($resultCode !== null && $resultCode !== '' && $resultCode !== '0') {
            $message = isset($json['message']) ? (string) $json['message'] : 'MoMo error';
            return response()->json(['message' => $message, 'detail' => $json], 502);
        }

        // Different request types may return different redirect URLs.
        // Prefer web payUrl, then shortLink / deeplink, then qrCodeUrl.
        $candidateKeys = ['payUrl', 'shortLink', 'deeplink', 'deeplinkMiniApp', 'qrCodeUrl'];
        $payUrl = null;
        foreach ($candidateKeys as $k) {
            if (isset($json[$k]) && is_string($json[$k]) && $json[$k] !== '') {
                $payUrl = $json[$k];
                break;
            }
        }
        if (!is_string($payUrl) || $payUrl === '') {
            return response()->json(['message' => 'MoMo redirect url missing', 'detail' => $json], 502);
        }

        return response()->json([
            'order_id' => $order->id,
            'order_code' => $order->order_code,
            'payment_id' => $payment->id,
            'pay_url' => $payUrl,
            'raw' => $json,
        ]);
    }

    public function momoIpn(Request $request): JsonResponse
    {
        $data = $request->all();
        if (!is_array($data)) {
            return response()->json(['message' => 'Invalid payload'], 400);
        }
        $result = $this->handleMomoCallback($data);
        return response()->json($result);
    }

    public function momoReturn(Request $request): RedirectResponse
    {
        // MoMo typically redirects with query params; we simply forward to frontend.
        $frontendUrl = rtrim((string) config('app.frontend_url', ''), '/');
        if ($frontendUrl === '') {
            return redirect('/');
        }
        $result = $this->handleMomoCallback($request->query());

        $qs = http_build_query([
            'gateway' => 'momo',
            'success' => $result['success'] ? '1' : '0',
            'order_code' => $result['order_code'] ?? null,
            'order_id' => $result['order_id'] ?? null,
        ]);

        return redirect($frontendUrl . '/checkout?' . $qs);
    }
}

