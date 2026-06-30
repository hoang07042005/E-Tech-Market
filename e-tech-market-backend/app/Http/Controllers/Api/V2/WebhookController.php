<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    public function __construct(
        private readonly PaymentService $paymentService
    ) {}

    /**
     * VNPAY IPN Webhook Endpoint (V2)
     */
    public function vnpay(Request $request): JsonResponse
    {
        Log::channel('single')->info('VNPAY IPN V2 Data received: ', $request->all());

        try {
            $result = $this->paymentService->handleVnpayCallback($request->query());

            if (!$result['verified']) {
                Log::channel('single')->warning('VNPAY IPN V2 - Invalid signature', $request->query());
                return response()->json([
                    'RspCode' => '97',
                    'Message' => 'Invalid signature'
                ]);
            }

            if (!$result['success']) {
                Log::channel('single')->warning('VNPAY IPN V2 - Payment failed or invalid status', $request->query());
                // VNPAY still considers 00 as successful receipt of the webhook, even if the transaction failed.
                return response()->json([
                    'RspCode' => '00',
                    'Message' => 'Transaction failed but webhook received'
                ]);
            }

            Log::channel('single')->info('VNPAY IPN V2 - Successfully processed order: ' . ($result['order_code'] ?? 'Unknown'));

            return response()->json([
                'RspCode' => '00',
                'Message' => 'Confirm Success'
            ]);

        } catch (\Exception $e) {
            Log::error('VNPAY IPN V2 Error: ' . $e->getMessage());
            return response()->json([
                'RspCode' => '99',
                'Message' => 'Unknown error'
            ]);
        }
    }

    /**
     * MoMo IPN Webhook Endpoint (V2)
     */
    public function momo(Request $request): JsonResponse
    {
        Log::channel('single')->info('MoMo IPN V2 Data received: ', $request->all());

        try {
            $data = $request->all();
            if (empty($data)) {
                return response()->json(['message' => 'Invalid payload'], 400);
            }

            $result = $this->paymentService->handleMomoCallback($data);

            if (!$result['verified']) {
                Log::channel('single')->warning('MoMo IPN V2 - Invalid signature', $data);
                return response()->json(['message' => 'Invalid signature'], 400);
            }

            Log::channel('single')->info('MoMo IPN V2 - Successfully processed order: ' . ($result['order_code'] ?? 'Unknown'));

            // MoMo requires a 204 No Content for successful webhook processing
            return response()->json(null, 204);

        } catch (\Exception $e) {
            Log::error('MoMo IPN V2 Error: ' . $e->getMessage());
            return response()->json(['message' => 'Internal server error'], 500);
        }
    }
}
