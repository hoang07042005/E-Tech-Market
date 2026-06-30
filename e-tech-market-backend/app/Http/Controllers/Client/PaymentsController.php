<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class PaymentsController extends Controller
{
    public function __construct(
        private readonly PaymentService $paymentService,
    ) {}

    // ─── VNPAY ────────────────────────────────────────────────────────

    /**
     * Create VNPAY payment URL.
     * Accepts order_id in request body to support pending_payment orders.
     */
    public function createVnpay(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_id' => ['required', 'integer'],
        ]);

        $order = Order::query()->find($data['order_id']);
        if (! $order) {
            abort(404, 'Order not found');
        }

        // Allow payment for pending_payment orders (not visible in regular list, but accessible here)
        $this->authorize('view', $order);

        $result = $this->paymentService->createVnpayPaymentUrl($order, $request->ip());

        if (isset($result['error'])) {
            abort($result['code'], $result['error']);
        }

        return response()->json($result);
    }

    public function vnpayReturn(Request $request): RedirectResponse
    {
        $result = $this->paymentService->handleVnpayCallback($request->query());
        $frontendUrl = rtrim((string) config('app.frontend_url', ''), '/');

        if ($frontendUrl === '') {
            return redirect('/');
        }

        $qs = http_build_query([
            'gateway' => 'vnpay',
            'success' => $result['success'] ? '1' : '0',
            'order_code' => $result['order_code'] ?? null,
            'order_id' => $result['order_id'] ?? null,
        ]);

        return redirect($frontendUrl.'/checkout?'.$qs);
    }

    public function vnpayIpn(Request $request): JsonResponse
    {
        $result = $this->paymentService->handleVnpayCallback($request->query());

        if (! $result['verified']) {
            return response()->json(['RspCode' => '97', 'Message' => 'Invalid signature']);
        }

        return response()->json(['RspCode' => '00', 'Message' => 'Confirm Success']);
    }

    // ─── MOMO ─────────────────────────────────────────────────────────

    /**
     * Create MoMo payment URL.
     * Accepts order_id in request body to support pending_payment orders.
     */
    public function createMomo(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_id' => ['required', 'integer'],
            'request_type' => ['nullable', 'string', 'max:50'],
        ]);

        $order = Order::query()->find($data['order_id']);
        if (! $order) {
            abort(404, 'Order not found');
        }

        // Allow payment for pending_payment orders (not visible in regular list, but accessible here)
        $this->authorize('view', $order);

        $result = $this->paymentService->createMomoPaymentUrl($order, $data['request_type'] ?? null);

        if (isset($result['error'])) {
            // Extract detailed message from MoMo response for better UX
            $detailMsg = $result['error'];
            if (isset($result['detail']) && is_string($result['detail'])) {
                $decoded = json_decode($result['detail'], true);
                if (is_array($decoded) && isset($decoded['message'])) {
                    $detailMsg = $decoded['message'];
                }
            } elseif (isset($result['detail']) && is_array($result['detail']) && isset($result['detail']['message'])) {
                $detailMsg = $result['detail']['message'];
            }
            return response()->json(
                ['message' => $detailMsg, 'detail' => $result['detail'] ?? null],
                $result['code']
            );
        }

        return response()->json($result);
    }

    public function momoIpn(Request $request): JsonResponse
    {
        $data = $request->all();
        if (! is_array($data)) {
            abort(400, 'Invalid payload');
        }

        $result = $this->paymentService->handleMomoCallback($data);

        return response()->json($result);
    }

    public function momoReturn(Request $request): RedirectResponse
    {
        $frontendUrl = rtrim((string) config('app.frontend_url', ''), '/');
        if ($frontendUrl === '') {
            return redirect('/');
        }

        $result = $this->paymentService->handleMomoCallback($request->query());

        $qs = http_build_query([
            'gateway' => 'momo',
            'success' => $result['success'] ? '1' : '0',
            'order_code' => $result['order_code'] ?? null,
            'order_id' => $result['order_id'] ?? null,
        ]);

        return redirect($frontendUrl.'/checkout?'.$qs);
    }
}