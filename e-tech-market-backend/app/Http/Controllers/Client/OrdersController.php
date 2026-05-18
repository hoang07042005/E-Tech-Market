<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Coupon;
use App\Models\CouponUsage;
use App\Models\FlashSaleItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\AdminSetting;
use App\Models\ShippingMethod;
use App\Models\ShippingZone;
use App\Models\OrderStatusHistory;
use App\Models\OrderReturnRequest;
use App\Notifications\OrderConfirmationNotification;
use Illuminate\Support\Facades\Notification as NotificationFacade;
use App\Models\Notification;
use App\Models\User;
use App\Support\ProductInventorySync;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Str;

class OrdersController extends Controller
{
    private function getAdminSetting(string $key, mixed $default = null): mixed
    {
        $row = AdminSetting::query()->where('key', $key)->first();
        return $row ? ($row->value ?? $default) : $default;
    }

    private function findPurchasableVariant(Product $product, ?int $variantId): ProductVariant
    {
        $query = ProductVariant::query()
            ->where('product_id', $product->id)
            ->where('is_active', true);

        if ($variantId) {
            $query->where('id', $variantId);
        } else {
            $query->orderBy('id');
        }

        $variant = $query->first();
        if (!$variant) {
            throw ValidationException::withMessages([
                'items' => "Phiên bản của sản phẩm {$product->name} không hợp lệ.",
            ]);
        }

        return $variant;
    }

    private function reserveVariantStock(Product $product, ?int $variantId, int $qty): ProductVariant
    {
        $query = ProductVariant::query()
            ->where('product_id', $product->id)
            ->where('is_active', true)
            ->lockForUpdate();

        if ($variantId) {
            $query->where('id', $variantId);
        } else {
            $query->orderBy('id');
        }

        $variant = $query->first();
        if (!$variant) {
            throw ValidationException::withMessages([
                'items' => "Phiên bản của sản phẩm {$product->name} không hợp lệ.",
            ]);
        }

        $stock = (int) ($variant->stock_quantity ?? 0);
        if ($stock < $qty) {
            throw ValidationException::withMessages([
                'items' => "Sản phẩm {$product->name} chỉ còn {$stock} sản phẩm.",
            ]);
        }

        $variant->stock_quantity = $stock - $qty;
        $variant->save();

        ProductInventorySync::syncFromVariants($product->fresh(), 'order_checkout');

        return $variant;
    }

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
        $user = $request->user();
        if ((int) $order->user_id !== (int) $user->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

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
        $user = $request->user();
        if ((int) $order->user_id !== (int) $user->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $cur = strtolower((string) ($order->status ?? ''));
        if (!in_array($cur, ['pending', 'processing'], true)) {
            return response()->json(['message' => 'Không thể hủy đơn ở trạng thái này.'], 422);
        }

        $prevStatus = $cur;
        $order->status = 'cancelled';
        $order->save();

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
        $user = $request->user();
        if ((int) $order->user_id !== (int) $user->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

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
        $user = $request->user();
        if ((int) $order->user_id !== (int) $user->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

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

    public function requestReturn(Order $order, Request $request): JsonResponse
    {
        $user = $request->user();
        if ((int) $order->user_id !== (int) $user->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $cur = strtolower((string) ($order->status ?? ''));
        if ($cur !== 'delivered') {
            return response()->json(['message' => 'Chỉ có thể yêu cầu hoàn trả khi đơn ở trạng thái đã giao.'], 422);
        }

        $order->loadMissing(['returnRequest']);
        if ($order->returnRequest) {
            return response()->json(['message' => 'Đơn hàng này đã có yêu cầu hoàn trả.'], 422);
        }

        $data = $request->validate([
            'content' => ['required', 'string', 'min:5', 'max:4000'],
            'media' => ['nullable', 'array', 'max:8'],
            'media.*' => ['file', 'max:51200'], // 50MB each (images/videos)
        ]);

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
        $user = $request->user();
        if ((int) $order->user_id !== (int) $user->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

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

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'shipping_name' => ['required', 'string', 'max:255'],
            'shipping_phone' => ['required', 'string', 'max:30'],
            'shipping_address_line' => ['required', 'string'],
            'shipping_province' => ['nullable', 'string', 'max:100'],
            'shipping_district' => ['nullable', 'string', 'max:100'],
            'shipping_ward' => ['nullable', 'string', 'max:100'],
            'shipping_method_id' => ['nullable', 'integer', 'min:1'],
            'shipping_zone_id' => ['nullable', 'integer', 'min:1'],
            'coupon_code' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string'],
            'payment_method' => ['nullable', 'string', 'max:50'], // cod | vnpay | momo
        ]);

        $cart = Cart::query()->where('user_id', $user->id)->first();
        if (!$cart) {
            return response()->json(['message' => 'Cart not found'], 422);
        }

        $items = CartItem::query()
            ->where('cart_id', $cart->id)
            ->with(['product', 'variant'])
            ->get();

        if ($items->isEmpty()) {
            return response()->json(['message' => 'Cart is empty'], 422);
        }

        return DB::transaction(function () use ($user, $cart, $items, $data) {
            $subtotal = 0.0;
            $pricedItems = [];
            foreach ($items as $it) {
                /** @var Product $product */
                $product = $it->product;
                $variant = $this->findPurchasableVariant($product, $it->variant_id ? (int) $it->variant_id : null);
                $unitPrice = (float) $variant->effective_price;
                $pricedItems[$it->id] = ['variant' => $variant, 'unit_price' => $unitPrice];
                $subtotal += $unitPrice * (int) $it->quantity;
            }
            
            $flashSaleDiscount = 0;
            foreach ($items as $it) {
                $productId = $it->product_id;
                $variantId = $it->variant_id;

                // Priority: Specific Variant Sale -> Product-wide Sale
                $activeFlashSale = FlashSaleItem::query()
                    ->where('product_id', $productId)
                    ->where(function($q) use ($variantId) {
                        $q->where('variant_id', $variantId)
                          ->orWhereNull('variant_id');
                    })
                    ->whereHas('flashSale', function($q) {
                        $q->where('status', \App\Models\FlashSale::STATUS_ACTIVE)
                          ->where('start_at', '<=', now())
                          ->where('end_at', '>=', now());
                    })
                    ->orderByRaw('variant_id IS NULL ASC') // Variant-specific first
                    ->first();

                if ($activeFlashSale) {
                    // Check limit
                    if ($activeFlashSale->quantity_limit !== null && $activeFlashSale->sold_quantity + $it->quantity > $activeFlashSale->quantity_limit) {
                        throw new \Exception("Sản phẩm {$it->product->name} đã hết suất Flash Sale.");
                    }

                    $unitPrice = (float) ($pricedItems[$it->id]['unit_price'] ?? 0);
                    $saving = ($unitPrice - (float)$activeFlashSale->flash_sale_price) * $it->quantity;
                    $flashSaleDiscount += max(0, $saving);
                    
                    // Increment sold quantity
                    $activeFlashSale->increment('sold_quantity', $it->quantity);
                }
            }

            $discount = $flashSaleDiscount;
            $coupon = null;
            if (!empty($data['coupon_code'])) {
                $coupon = Coupon::query()->where('code', $data['coupon_code'])->first();
                if (!$coupon || !$coupon->isValidNow()) {
                    return response()->json(['message' => 'Coupon invalid'], 422);
                }
                
                $calcBase = max(0, $subtotal - $flashSaleDiscount);
                
                if ($calcBase < (float) $coupon->min_order_amount) {
                    return response()->json(['message' => 'Coupon min order not met'], 422);
                }

                $usageCount = CouponUsage::query()->where('coupon_id', $coupon->id)->count();
                if ($coupon->max_uses !== null && $usageCount >= $coupon->max_uses) {
                    return response()->json(['message' => 'Coupon usage limit reached'], 422);
                }

                $userUsageCount = CouponUsage::query()
                    ->where('coupon_id', $coupon->id)
                    ->where('user_id', $user->id)
                    ->count();
                if ($coupon->max_uses_per_user !== null && $userUsageCount >= $coupon->max_uses_per_user) {
                    return response()->json(['message' => 'Coupon usage per user limit reached'], 422);
                }

                $couponDiscount = 0;
                if ($coupon->coupon_type === 'percentage') {
                    $couponDiscount = $calcBase * ((float) $coupon->value / 100);
                } else {
                    $couponDiscount = (float) $coupon->value;
                }
                $discount += min($couponDiscount, $calcBase);
            }

            $shippingFee = 0;
            $shippingMethodId = null;
            $shippingZoneId = null;
            if (!empty($data['shipping_method_id'])) {
                $shippingMethodId = (int) $data['shipping_method_id'];
                $shippingMethod = ShippingMethod::query()->find($shippingMethodId);
                if (!$shippingMethod || !$shippingMethod->is_active) {
                    return response()->json(['message' => 'Shipping method invalid'], 422);
                }
                $shippingFee = (float) $shippingMethod->base_fee;
            }
            if (!empty($data['shipping_zone_id'])) {
                $shippingZoneId = (int) $data['shipping_zone_id'];
                $zone = ShippingZone::query()->find($shippingZoneId);
                if (!$zone || !$zone->is_active) {
                    return response()->json(['message' => 'Shipping zone invalid'], 422);
                }
                $shippingFee += (float) $zone->fee;
            }

            $shippingPolicy = (array) $this->getAdminSetting('shipping_policy', [
                'free_shipping_min' => 0,
                'apply_global' => true,
            ]);
            $freeMin = (float) ($shippingPolicy['free_shipping_min'] ?? 0);
            $applyGlobal = (bool) ($shippingPolicy['apply_global'] ?? true);
            if ($applyGlobal && $freeMin > 0 && $subtotal >= $freeMin) {
                $shippingFee = 0;
            }

            $orderCode = $this->generateOrderCode();

            $order = Order::query()->create([
                'order_code' => $orderCode,
                'user_id' => $user->id,
                'cart_id' => $cart->id,
                'coupon_id' => $coupon?->id,
                'shipping_method_id' => $shippingMethodId,
                'shipping_zone_id' => $shippingZoneId,
                'status' => 'pending',
                'payment_status' => 'pending',
                'currency' => 'VND',
                'subtotal_amount' => $subtotal,
                'discount_amount' => $discount,
                'shipping_fee' => $shippingFee,
                'total_amount' => max(0, $subtotal - $discount + $shippingFee),
                'shipping_name' => $data['shipping_name'],
                'shipping_phone' => $data['shipping_phone'],
                'shipping_address_line' => $data['shipping_address_line'],
                'shipping_province' => $data['shipping_province'] ?? null,
                'shipping_district' => $data['shipping_district'] ?? null,
                'shipping_ward' => $data['shipping_ward'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            $paymentMethod = (string) ($data['payment_method'] ?? 'cod');
            if (!in_array($paymentMethod, ['cod', 'vnpay', 'momo'], true)) {
                $paymentMethod = 'cod';
            }

            Payment::query()->create([
                'order_id' => $order->id,
                'method' => $paymentMethod,
                'amount' => $order->total_amount,
                'currency' => $order->currency ?? 'VND',
                'status' => 'pending',
            ]);

            foreach ($items as $it) {
                /** @var Product $product */
                $product = $it->product;
                $reservedVariant = $this->reserveVariantStock($product, $it->variant_id ? (int) $it->variant_id : null, (int) $it->quantity);
                $unitPrice = (float) ($pricedItems[$it->id]['unit_price'] ?? $reservedVariant->effective_price);
                OrderItem::query()->create([
                    'order_id' => $order->id,
                    'product_id' => $product->id,
                    'variant_id' => $reservedVariant->id,
                    'product_name_snapshot' => $product->name,
                    'quantity' => $it->quantity,
                    'unit_price' => $unitPrice,
                    'total_price' => $unitPrice * $it->quantity,
                ]);
            }

            if ($coupon) {
                CouponUsage::query()->create([
                    'coupon_id' => $coupon->id,
                    'user_id' => $user->id,
                    'order_id' => $order->id,
                    'discount_amount' => $discount,
                ]);
            }

            // Clear cart after checkout.
            CartItem::query()->where('cart_id', $cart->id)->delete();
            $cart->status = 'active';
            $cart->save();

            $order->load(['items.product', 'items.variant']);
            return response()->json($order, 201);
        });
    }

    /**
     * Create order directly from frontend-provided items (localStorage cart).
     * This avoids creating multiple orders by allowing the client to retry payment for the same order id.
     */
    public function storeFromItems(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'shipping_name' => ['required', 'string', 'max:255'],
            'shipping_phone' => ['required', 'string', 'max:30'],
            'shipping_address_line' => ['required', 'string'],
            'shipping_province' => ['nullable', 'string', 'max:100'],
            'shipping_district' => ['nullable', 'string', 'max:100'],
            'shipping_ward' => ['nullable', 'string', 'max:100'],
            'shipping_method_id' => ['nullable', 'integer', 'min:1'],
            'shipping_zone_id' => ['nullable', 'integer', 'min:1'],
            'coupon_code' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string'],
            'payment_method' => ['required', 'string', 'max:50'], // cod | vnpay | momo
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'min:1'],
            'items.*.variant_id' => ['nullable', 'integer', 'min:1'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        $paymentMethod = (string) $data['payment_method'];
        if (!in_array($paymentMethod, ['cod', 'vnpay', 'momo'], true)) {
            return response()->json(['message' => 'Payment method invalid'], 422);
        }

        $itemsInput = $data['items'];

        return DB::transaction(function () use ($user, $data, $itemsInput, $paymentMethod) {
            $subtotal = 0.0;
            
            // Tính subtotal trước
            foreach ($itemsInput as $it) {
                $productId = (int) $it['product_id'];
                $variantId = isset($it['variant_id']) ? (int) $it['variant_id'] : null;
                $qty = (int) $it['quantity'];

                $product = Product::query()->where('id', $productId)->where('is_active', true)->first();
                if (!$product) {
                    return response()->json(['message' => 'Product invalid'], 422);
                }

                $variant = $this->findPurchasableVariant($product, $variantId);
                $originalPrice = (float) $variant->effective_price;
                $subtotal += ($originalPrice * $qty);
            }

            $flashSaleDiscount = 0;
            foreach ($itemsInput as $it) {
                $productId = (int) $it['product_id'];
                $variantId = isset($it['variant_id']) ? (int) $it['variant_id'] : null;
                $product = Product::find($productId);
                if (!$product) continue;

                // Priority: Specific Variant Sale -> Product-wide Sale
                $activeFlashSale = FlashSaleItem::query()
                    ->where('product_id', $productId)
                    ->where(function($q) use ($variantId) {
                        $q->where('variant_id', $variantId)
                          ->orWhereNull('variant_id');
                    })
                    ->whereHas('flashSale', function($q) {
                        $q->where('status', \App\Models\FlashSale::STATUS_ACTIVE)
                          ->where('start_at', '<=', now())
                          ->where('end_at', '>=', now());
                    })
                    ->orderByRaw('variant_id IS NULL ASC') // Variant-specific first
                    ->first();

                if ($activeFlashSale) {
                    $qty = (int)$it['quantity'];
                    
                    // Check limit
                    if ($activeFlashSale->quantity_limit !== null && $activeFlashSale->sold_quantity + $qty > $activeFlashSale->quantity_limit) {
                        throw new \Exception("Sản phẩm {$product->name} đã hết suất Flash Sale.");
                    }

                    $variant = $this->findPurchasableVariant($product, $variantId);
                    $originalPrice = (float) $variant->effective_price;
                    $saving = ($originalPrice - (float)$activeFlashSale->flash_sale_price) * $qty;
                    $flashSaleDiscount += max(0, $saving);

                    // Increment sold quantity
                    $activeFlashSale->increment('sold_quantity', $qty);
                }
            }

            $discount = $flashSaleDiscount;
            $coupon = null;
            if (!empty($data['coupon_code'])) {
                $coupon = Coupon::query()->where('code', $data['coupon_code'])->first();
                if ($coupon && $coupon->isValidNow()) {
                    $calcBase = max(0, $subtotal - $flashSaleDiscount);
                    if ($calcBase >= (float) $coupon->min_order_amount) {
                        $couponDiscount = 0;
                        if ($coupon->coupon_type === 'percentage') {
                            $couponDiscount = $calcBase * ((float) $coupon->value / 100);
                        } else {
                            $couponDiscount = (float) $coupon->value;
                        }
                        $discount += min($couponDiscount, $calcBase);
                    }
                }
            }

            $orderCode = $this->generateOrderCode();

            $shippingFee = 0.0;
            $shippingMethodId = null;
            $shippingZoneId = null;
            if (!empty($data['shipping_method_id'])) {
                $shippingMethodId = (int) $data['shipping_method_id'];
                $shippingMethod = ShippingMethod::query()->find($shippingMethodId);
                if (!$shippingMethod || !$shippingMethod->is_active) {
                    return response()->json(['message' => 'Shipping method invalid'], 422);
                }
                $shippingFee = (float) $shippingMethod->base_fee;
            }
            if (!empty($data['shipping_zone_id'])) {
                $shippingZoneId = (int) $data['shipping_zone_id'];
                $zone = ShippingZone::query()->find($shippingZoneId);
                if (!$zone || !$zone->is_active) {
                    return response()->json(['message' => 'Shipping zone invalid'], 422);
                }
                $shippingFee += (float) $zone->fee;
            }

            $order = Order::query()->create([
                'order_code' => $orderCode,
                'user_id' => $user->id,
                'cart_id' => null,
                'coupon_id' => $coupon?->id,
                'shipping_method_id' => $shippingMethodId,
                'shipping_zone_id' => $shippingZoneId,
                'status' => 'pending',
                'payment_status' => 'pending',
                'currency' => 'VND',
                'subtotal_amount' => $subtotal,
                'discount_amount' => $discount,
                'shipping_fee' => $shippingFee,
                'total_amount' => 0,
                'shipping_name' => $data['shipping_name'],
                'shipping_phone' => $data['shipping_phone'],
                'shipping_address_line' => $data['shipping_address_line'],
                'shipping_province' => $data['shipping_province'] ?? null,
                'shipping_district' => $data['shipping_district'] ?? null,
                'shipping_ward' => $data['shipping_ward'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            foreach ($itemsInput as $it) {
                // We already calculated subtotal above, just create items
                $productId = (int) $it['product_id'];
                $variantId = isset($it['variant_id']) ? (int) $it['variant_id'] : null;
                $qty = (int) $it['quantity'];

                $product = Product::find($productId);
                $variant = $this->reserveVariantStock($product, $variantId, $qty);
                $unitPrice = (float) $variant->effective_price;
                $lineTotal = $unitPrice * $qty;

                OrderItem::query()->create([
                    'order_id' => $order->id,
                    'product_id' => $product->id,
                    'variant_id' => $variant->id,
                    'product_name_snapshot' => $product->name,
                    'quantity' => $qty,
                    'unit_price' => $unitPrice,
                    'total_price' => $lineTotal,
                ]);
            }

            $order->subtotal_amount = $subtotal;
            $shippingPolicy = (array) $this->getAdminSetting('shipping_policy', [
                'free_shipping_min' => 0,
                'apply_global' => true,
            ]);
            $freeMin = (float) ($shippingPolicy['free_shipping_min'] ?? 0);
            $applyGlobal = (bool) ($shippingPolicy['apply_global'] ?? true);
            if ($applyGlobal && $freeMin > 0 && $subtotal >= $freeMin) {
                $order->shipping_fee = 0;
            }
            $order->total_amount = max(0, $subtotal - $discount + (float) ($order->shipping_fee ?? 0));
            $order->save();

            if ($coupon) {
                CouponUsage::query()->create([
                    'coupon_id' => $coupon->id,
                    'user_id' => $user->id,
                    'order_id' => $order->id,
                    'discount_amount' => $discount,
                ]);
            }

            Payment::query()->create([
                'order_id' => $order->id,
                'method' => $paymentMethod,
                'amount' => $order->total_amount,
                'currency' => $order->currency ?? 'VND',
                'status' => 'pending',
            ]);

            $order->load(['items.product', 'items.variant', 'payment']);

            if ($paymentMethod === 'cod') {
                $email = $user->email ?? null;
                if ($email) {
                    NotificationFacade::route('mail', $email)->notify(new OrderConfirmationNotification($order));
                }
            }

            return response()->json($order, 201);
        });
    }

    private function generateOrderCode(): string
    {
        // Keep it simple; collisions are extremely unlikely.
        return 'OD-' . Str::upper(Str::random(10));
    }
}
