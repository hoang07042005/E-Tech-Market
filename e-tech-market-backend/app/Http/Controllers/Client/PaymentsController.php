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

    public function createVnpay(Order $order, Request $request): JsonResponse
    {
        $this->authorize('view', $order);

        $result = $this->paymentService->createVnpayPaymentUrl($order, $request->ip());

        if (isset($result['error'])) {
            return response()->json(['message' => $result['error']], $result['code']);
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

    public function createMomo(Order $order, Request $request): JsonResponse
    {
        $this->authorize('view', $order);

        $validated = $request->validate([
            'request_type' => ['nullable', 'string', 'max:50'],
        ]);

        $result = $this->paymentService->createMomoPaymentUrl($order, $validated['request_type'] ?? null);

        if (isset($result['error'])) {
            return response()->json(
                ['message' => $result['error'], 'detail' => $result['detail'] ?? null],
                $result['code']
            );
        }

        return response()->json($result);
    }

    public function momoIpn(Request $request): JsonResponse
    {
        $data = $request->all();
        if (! is_array($data)) {
            return response()->json(['message' => 'Invalid payload'], 400);
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
