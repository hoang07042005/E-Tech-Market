<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
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
use App\Http\Requests\Client\StoreOrderRequest;
use App\Http\Requests\Client\RequestReturnOrderRequest;

class OrdersController extends Controller
{

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $orders = Order::query()
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->with(['items.product', 'payment'])
            ->paginate(12);

        return response()->json($orders);
    }

    public function show(Order $order, Request $request): JsonResponse
    {
        $this->authorize('view', $order);

        $order->load(['items.product', 'payment', 'returnRequest', 'statusHistories', 'statusHistories.changedBy']);

        $payload = $order->toArray();
        // Ensure frontend always receives `return_request` (snake_case) consistently.
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
        $user = $request->user();

        $cur = strtolower((string) ($order->status ?? ''));
        if (!in_array($cur, ['pending', 'processing'], true)) {
            return response()->json(['message' => 'Không thể hủy đơn ở trạng thái này.'], 422);
        }

        $prevStatus = $cur;
        $order->status = 'cancelled';
        $order->save();

        // Restore stock
        $order->loadMissing('items');
        $productIdsToSync = [];
        foreach ($order->items as $item) {
            if ($item->variant_id) {
                $variant = ProductVariant::find($item->variant_id);
                if ($variant) {
                    $variant->stock_quantity = (int) ($variant->stock_quantity ?? 0) + (int) $item->quantity;
                    $variant->save();
                    $productIdsToSync[$variant->product_id] = true;
                }
            }
        }
        foreach (array_keys($productIdsToSync) as $pid) {
            $p = Product::find($pid);
            if ($p) {
                ProductInventorySync::syncFromVariants($p, 'order_cancelled');
            }
        }

        OrderStatusHistory::create([
            'order_id' => (int) $order->id,
            'from_status' => $prevStatus !== '' ? $prevStatus : null,
            'to_status' => 'cancelled',
            'changed_by_user_id' => $user->id,
            'note' => null,
        ]);

        return $this->show($order, $request);
    }

    public function confirmReceived(Order $order, Request $request): JsonResponse
    {
        $this->authorize('update', $order);
        $user = $request->user();

        $cur = strtolower((string) ($order->status ?? ''));
        if ($cur !== 'delivered') {
            return response()->json(['message' => 'Chỉ có thể xác nhận khi đơn ở trạng thái đã giao.'], 422);
        }

        $order->status = 'completed';
        $order->save();

        OrderStatusHistory::create([
            'order_id' => (int) $order->id,
            'from_status' => 'delivered',
            'to_status' => 'completed',
            'changed_by_user_id' => $user->id,
            'note' => null,
        ]);

        return $this->show($order, $request);
    }

    public function confirmPayment(Order $order, Request $request): JsonResponse
    {
        $this->authorize('update', $order);
        $user = $request->user();

        $order->loadMissing(['payment']);
        if (!$order->payment || strtolower((string) $order->payment->method) !== 'cod') {
            return response()->json(['message' => 'Chỉ có thể xác nhận thanh toán cho đơn hàng COD.'], 422);
        }

        if ($order->payment->status === 'paid') {
            return response()->json(['message' => 'Đơn hàng này đã được xác nhận thanh toán.'], 422);
        }

        $order->payment->status = 'paid';
        $order->payment->paid_at = now();
        $order->payment->save();

        $order->payment_status = 'paid';
        $order->save();

        return $this->show($order, $request);
    }

    public function requestReturn(Order $order, RequestReturnOrderRequest $request): JsonResponse
    {
        $this->authorize('update', $order);
        $user = $request->user();

        $cur = strtolower((string) ($order->status ?? ''));
        if ($cur !== 'delivered') {
            return response()->json(['message' => 'Chỉ có thể yêu cầu hoàn trả khi đơn ở trạng thái đã giao.'], 422);
        }

        $order->loadMissing(['returnRequest']);
        if ($order->returnRequest) {
            return response()->json(['message' => 'Đơn hàng này đã có yêu cầu hoàn trả.'], 422);
        }

        $data = $request->validated();

        $files = $request->file('media', []);
        $mediaMeta = [];
        foreach ($files as $f) {
            if (!$f) continue;
            $mime = (string) ($f->getMimeType() ?? '');
            $isVideo = str_starts_with(strtolower($mime), 'video/');
            $type = $isVideo ? 'video' : 'image';
            $path = $f->storePublicly('returns/' . (int) $order->id, ['disk' => 'public']);
            $mediaMeta[] = [
                'type' => $type,
                'url' => '/storage/' . ltrim($path, '/'),
                'original_name' => (string) ($f->getClientOriginalName() ?? ''),
                'mime' => $mime !== '' ? $mime : null,
                'size' => (int) ($f->getSize() ?? 0),
            ];
        }

        OrderReturnRequest::create([
            'order_id' => (int) $order->id,
            'user_id' => (int) $user->id,
            'status' => 'pending',
            'content' => (string) $data['content'],
            'media' => $mediaMeta,
        ]);

        // Notify all admins (if notifications table is present in this project).
        $adminUsers = User::query()
            ->whereHas('roles', function ($r) {
                $r->where('slug', '=', 'admin');
            })
            ->select(['id'])
            ->get();

        foreach ($adminUsers as $au) {
            Notification::create([
                'user_id' => (int) $au->id,
                'type' => 'order_return_request',
                'title' => 'Yêu cầu hoàn trả mới',
                'body' => 'Đơn #' . ($order->order_code ?: ('ET-' . $order->id)) . ' vừa có yêu cầu hoàn trả.',
                'data' => [
                    'order_id' => (int) $order->id,
                    'order_code' => (string) ($order->order_code ?: ('ET-' . $order->id)),
                ],
                'read_at' => null,
            ]);
        }

        // Reload with returnRequest
        $order->load(['returnRequest']);
        return $this->show($order, $request);
    }

    public function confirmRefundReceived(Order $order, Request $request): JsonResponse
    {
        $this->authorize('update', $order);
        $user = $request->user();

        $order->loadMissing(['returnRequest']);
        if (!$order->returnRequest) {
            return response()->json(['message' => 'Đơn hàng này chưa có yêu cầu hoàn trả.'], 422);
        }

        $rrStatus = strtolower((string) ($order->returnRequest->status ?? ''));
        if ($rrStatus !== 'refunded') {
            return response()->json(['message' => 'Chỉ có thể xác nhận khi admin đã hoàn tiền.'], 422);
        }

        if ($order->returnRequest->customer_confirmed_at) {
            return response()->json(['message' => 'Bạn đã xác nhận nhận tiền hoàn trước đó.'], 422);
        }

        $order->returnRequest->customer_confirmed_at = now();
        $order->returnRequest->save();

        // Optional: notify admins that customer confirmed receiving refund
        $adminUsers = User::query()
            ->whereHas('roles', function ($r) {
                $r->where('slug', '=', 'admin');
            })
            ->select(['id'])
            ->get();

        foreach ($adminUsers as $au) {
            Notification::create([
                'user_id' => (int) $au->id,
                'type' => 'order_refund_confirmed',
                'title' => 'Khách đã xác nhận nhận tiền hoàn',
                'body' => 'Đơn #' . ($order->order_code ?: ('ET-' . $order->id)) . ' đã được khách xác nhận nhận tiền hoàn.',
                'data' => [
                    'order_id' => (int) $order->id,
                    'order_code' => (string) ($order->order_code ?: ('ET-' . $order->id)),
                ],
                'read_at' => null,
            ]);
        }

        $order->load(['returnRequest']);
        return $this->show($order, $request);
    }

    public function store(StoreOrderRequest $request, OrderService $orderService): JsonResponse
    {
        $user = $request->user();
        $data = $request->validated();

        $cart = Cart::query()->where('user_id', $user->id)->first();
        if (!$cart) {
            return response()->json(['message' => 'Không tìm thấy giỏ hàng'], 422);
        }

        $items = CartItem::query()
            ->where('cart_id', $cart->id)
            ->with(['product', 'variant'])
            ->get();

        if ($items->isEmpty()) {
            return response()->json(['message' => 'Giỏ hàng của bạn đang trống'], 422);
        }

        $itemsInput = $items->map(function ($it) {
            return [
                'product_id' => clone $it->product_id,
                'variant_id' => clone $it->variant_id,
                'quantity' => clone $it->quantity,
            ];
        })->toArray();

        // Pass actual array of values without relying on eloquent mapping clone issues
        $cleanItemsInput = [];
        foreach($itemsInput as $it) {
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
     * This avoids creating multiple orders by allowing the client to retry payment for the same order id.
     */
    public function storeFromItems(StoreOrderRequest $request, OrderService $orderService): JsonResponse
    {
        $user = $request->user();
        $data = $request->validated();

        $paymentMethod = (string) $data['payment_method'];
        if (!in_array($paymentMethod, ['cod', 'vnpay', 'momo'], true)) {
            return response()->json(['message' => 'Phương thức thanh toán không hợp lệ'], 422);
        }

        $order = $orderService->createOrder($user, $data, $data['items'], null);

        return response()->json($order, 201);
    }
}
