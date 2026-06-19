<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Http\Requests\Client\RequestReturnOrderRequest;
use App\Http\Requests\Client\StoreOrderRequest;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderReturnRequest;
use App\Models\OrderStatusHistory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\OrderService;
use App\Support\ProductInventorySync;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrdersController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $orders = app(OrderService::class)->getClientOrders($request->user());
        return response()->json($orders);
    }

    public function show(Order $order, Request $request): JsonResponse
    {
        $this->authorize('view', $order);

        try {
            $order = app(OrderService::class)->getClientOrder($order, $request->user());
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], $e->getCode() ?: 403);
        }

        $payload = $order->toArray();
        $payload['return_request'] = $order->returnRequest ? [
            'id' => (int) $order->returnRequest->id,
            'status' => (string) ($order->returnRequest->status ?? ''),
            'content' => $order->returnRequest->content ? (string) $order->returnRequest->content : null,
            'media' => $order->returnRequest->media ?? null,
            'admin_note' => $order->returnRequest->admin_note ? (string) $order->returnRequest->admin_note : null,
            'refund_proof' => $order->returnRequest->refund_proof ?? null,
            'approved_at' => $order->returnRequest->approved_at ? $order->returnRequest->approved_at->toISOString() : null,
            'refunded_at' => $order->returnRequest->refunded_at ? $order->returnRequest->refunded_at->toISOString() : null,
            'customer_confirmed_at' => $order->returnRequest->customer_confirmed_at ? $order->returnRequest->customer_confirmed_at->toISOString() : null,
            'created_at' => $order->returnRequest->created_at ? $order->returnRequest->created_at->toISOString() : null,
            'updated_at' => $order->returnRequest->updated_at ? $order->returnRequest->updated_at->toISOString() : null,
        ] : null;

        $payload['status_history'] = ($order->statusHistories ?? collect())->map(static function ($h) {
            return [
                'id' => (int) $h->id,
                'from_status' => $h->from_status ? (string) $h->from_status : null,
                'to_status' => (string) ($h->to_status ?? ''),
                'note' => $h->note ? (string) $h->note : null,
                'changed_at' => $h->created_at ? $h->created_at->toISOString() : null,
                'changed_by' => $h->changedBy ? [
                    'id' => (int) $h->changedBy->id,
                    'name' => (string) ($h->changedBy->name ?? '—'),
                    'avatar_url' => $h->changedBy->avatar_url ? (string) $h->changedBy->avatar_url : null,
                ] : null,
            ];
        })->values()->all();

        return response()->json($payload);
    }

    public function cancel(Order $order, Request $request): JsonResponse
    {
        $this->authorize('update', $order);
        try {
            $order = app(OrderService::class)->cancelOrder($order, $request->user());
            return $this->show($order, $request);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], $e->getCode() ?: 422);
        }
    }

    public function confirmReceived(Order $order, Request $request): JsonResponse
    {
        $this->authorize('update', $order);
        try {
            $order = app(OrderService::class)->confirmReceived($order, $request->user());
            return $this->show($order, $request);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], $e->getCode() ?: 422);
        }
    }

    public function confirmPayment(Order $order, Request $request): JsonResponse
    {
        $this->authorize('update', $order);
        try {
            $order = app(OrderService::class)->confirmPayment($order, $request->user());
            return $this->show($order, $request);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], $e->getCode() ?: 422);
        }
    }

    public function requestReturn(Order $order, RequestReturnOrderRequest $request): JsonResponse
    {
        $this->authorize('update', $order);
        try {
            $files = $request->file('media', []);
            $order = app(OrderService::class)->requestReturn($order, $request->user(), $request->validated(), is_array($files) ? $files : [$files]);
            return $this->show($order, $request);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], $e->getCode() ?: 422);
        }
    }

    public function confirmRefundReceived(Order $order, Request $request): JsonResponse
    {
        $this->authorize('update', $order);
        try {
            $order = app(OrderService::class)->confirmRefundReceived($order, $request->user());
            return $this->show($order, $request);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], $e->getCode() ?: 422);
        }
    }

    public function store(StoreOrderRequest $request, OrderService $orderService): JsonResponse
    {
        $user = $request->user();
        $data = $request->validated();

        $cart = Cart::query()->where('user_id', $user->id)->first();
        if (! $cart) {
            return response()->json(['message' => 'Không tìm thấy giỏ hàng'], 422);
        }

        $items = CartItem::query()
            ->where('cart_id', $cart->id)
            ->with(['product', 'variant'])
            ->get();

        if ($items->isEmpty()) {
            return response()->json(['message' => 'Giỏ hàng của bạn đang trống'], 422);
        }

        $itemsInput = [];
        foreach ($items as $it) {
            $itemsInput[] = [
                'product_id' => $it->product_id,
                'variant_id' => $it->variant_id,
                'quantity' => $it->quantity,
            ];
        }

        $cleanItemsInput = [];
        foreach ($itemsInput as $it) {
            $cleanItemsInput[] = [
                'product_id' => (int) $it['product_id'],
                'variant_id' => $it['variant_id'] ? (int) $it['variant_id'] : null,
                'quantity' => (int) $it['quantity'],
            ];
        }

        $order = $orderService->createOrder($user, $data, $cleanItemsInput, $cart);

        return response()->json($order, 201);
    }

    /**
     * Create order directly from frontend-provided items (localStorage cart).
     * For COD: creates order immediately.
     * For VnPay/MoMo: creates order with status 'pending_payment' (not visible to user until paid).
     * Order becomes visible when payment callback succeeds.
     */
    public function storeFromItems(StoreOrderRequest $request, OrderService $orderService): JsonResponse
    {
        $user = $request->user();
        $data = $request->validated();

        $paymentMethod = (string) $data['payment_method'];
        if (! in_array($paymentMethod, ['cod', 'vnpay', 'momo'], true)) {
            return response()->json(['message' => 'Phương thức thanh toán không hợp lệ'], 422);
        }

        // COD: create order immediately as before
        if ($paymentMethod === 'cod') {
            $order = $orderService->createOrder($user, $data, $data['items'], null);

            return response()->json($order, 201);
        }

        // VnPay/MoMo: create order with 'pending_payment' status
        // Order will be confirmed (status = 'pending') when payment succeeds
        $order = $orderService->createOrderPendingPayment($user, $data, $data['items'], null);

        return response()->json($order, 201);
    }
}
