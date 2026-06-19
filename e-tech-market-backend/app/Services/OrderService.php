<?php

namespace App\Services;

use App\Models\AdminSetting;
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
use App\Models\ShippingMethod;
use App\Models\ShippingZone;
use App\Models\User;
use App\Models\Notification;
use App\Models\OrderReturnRequest;
use App\Models\OrderStatusHistory;
use App\Notifications\OrderConfirmationNotification;
use App\Support\ProductInventorySync;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification as NotificationFacade;
use Illuminate\Validation\ValidationException;

class OrderService
{
    public function createOrder(?User $user, array $data, array $itemsInput, ?Cart $cart = null): Order
    {
        return $this->createOrderInternal($user, $data, $itemsInput, $cart, 'pending');
    }

    /**
     * Create order for VnPay/MoMo - order is NOT visible until payment succeeds.
     * Payment status starts as 'pending_payment', becomes 'paid' after callback.
     */
    public function createOrderPendingPayment(?User $user, array $data, array $itemsInput, ?Cart $cart = null): Order
    {
        return $this->createOrderInternal($user, $data, $itemsInput, $cart, 'pending_payment');
    }

    private function createOrderInternal(?User $user, array $data, array $itemsInput, ?Cart $cart = null, string $initialStatus = 'pending'): Order
    {
        return DB::transaction(function () use ($user, $data, $itemsInput, $cart, $initialStatus) {
            $subtotal = 0.0;
            $processedItems = [];

            // 1. Calculate subtotal and resolve variants
            foreach ($itemsInput as $it) {
                $productId = (int) $it['product_id'];
                $variantId = isset($it['variant_id']) ? (int) $it['variant_id'] : null;
                $qty = (int) $it['quantity'];

                $product = Product::query()->where('id', $productId)->where('is_active', true)->first();
                if (! $product) {
                    throw ValidationException::withMessages(['items' => 'Sản phẩm không hợp lệ']);
                }

                $variant = $this->findPurchasableVariant($product, $variantId);
                // Use frontend price if provided, otherwise use variant price
                $originalPrice = isset($it['unit_price']) && $it['unit_price'] > 0
                    ? (float) $it['unit_price']
                    : (float) $variant->effective_price;
                $subtotal += ($originalPrice * $qty);

                $processedItems[] = [
                    'product' => $product,
                    'variant' => $variant,
                    'quantity' => $qty,
                    'unit_price' => $originalPrice,
                ];
            }

            // 2. Flash Sale Discount
            $flashSaleDiscount = 0;
            foreach ($processedItems as $it) {
                $productId = $it['product']->id;
                $variantId = $it['variant']->id;
                $qty = $it['quantity'];

                $activeFlashSale = FlashSaleItem::query()
                    ->where('product_id', $productId)
                    ->where(function ($q) use ($variantId) {
                        $q->where('variant_id', $variantId)
                            ->orWhereNull('variant_id');
                    })
                    ->whereHas('flashSale', function ($q) {
                        $q->where('status', \App\Models\FlashSale::STATUS_ACTIVE)
                            ->where('start_at', '<=', now())
                            ->where('end_at', '>=', now());
                    })
                    ->orderByRaw('variant_id IS NULL ASC')
                    ->lockForUpdate()
                    ->first();

                if ($activeFlashSale) {
                    if ($activeFlashSale->quantity_limit !== null && $activeFlashSale->sold_quantity + $qty > $activeFlashSale->quantity_limit) {
                        throw ValidationException::withMessages(['items' => "Sản phẩm {$it['product']->name} đã hết suất Flash Sale."]);
                    }

                    $originalPrice = (float) $it['unit_price'];
                    $saving = ($originalPrice - (float) $activeFlashSale->flash_sale_price) * $qty;
                    $flashSaleDiscount += max(0, $saving);

                    $activeFlashSale->increment('sold_quantity', $qty);
                }
            }

            // 3. Coupon Discount
            $discount = $flashSaleDiscount;
            $coupon = null;
            if (! empty($data['coupon_code'])) {
                $coupon = Coupon::query()->lockForUpdate()->where('code', $data['coupon_code'])->first();
                if (! $coupon || ! $coupon->isValidNow()) {
                    throw ValidationException::withMessages(['coupon_code' => 'Mã giảm giá không hợp lệ hoặc đã hết hạn']);
                }

                $calcBase = max(0, $subtotal - $flashSaleDiscount);

                if ($calcBase < (float) $coupon->min_order_amount) {
                    throw ValidationException::withMessages(['coupon_code' => 'Giá trị đơn hàng chưa đạt tối thiểu để áp dụng mã này']);
                }

                $usageCount = CouponUsage::query()->where('coupon_id', $coupon->id)->count();
                if ($coupon->max_uses !== null && $usageCount >= $coupon->max_uses) {
                    throw ValidationException::withMessages(['coupon_code' => 'Mã giảm giá đã hết lượt sử dụng']);
                }

                $userUsageCount = $user ? CouponUsage::query()
                    ->where('coupon_id', $coupon->id)
                    ->where('user_id', $user->id)
                    ->count() : 0;
                if ($coupon->max_uses_per_user !== null && $userUsageCount >= $coupon->max_uses_per_user) {
                    throw ValidationException::withMessages(['coupon_code' => 'Bạn đã sử dụng mã giảm giá này trước đó']);
                }

                $couponDiscount = 0;
                if ($coupon->coupon_type === 'percentage') {
                    $couponDiscount = $calcBase * ((float) $coupon->value / 100);
                } else {
                    $couponDiscount = (float) $coupon->value;
                }
                $discount += min($couponDiscount, $calcBase);
            }

            // 4. Shipping Fee
            $shippingFee = 0;
            $shippingMethodId = null;
            $shippingZoneId = null;
            if (! empty($data['shipping_method_id'])) {
                $shippingMethodId = (int) $data['shipping_method_id'];
                $shippingMethod = ShippingMethod::query()->find($shippingMethodId);
                if (! $shippingMethod || ! $shippingMethod->is_active) {
                    throw ValidationException::withMessages(['shipping_method_id' => 'Phương thức vận chuyển không hợp lệ']);
                }
                $shippingFee = (float) $shippingMethod->base_fee;
            }
            if (! empty($data['shipping_zone_id'])) {
                $shippingZoneId = (int) $data['shipping_zone_id'];
                $zone = ShippingZone::query()->find($shippingZoneId);
                if (! $zone || ! $zone->is_active) {
                    throw ValidationException::withMessages(['shipping_zone_id' => 'Khu vực giao hàng không hợp lệ']);
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
                'user_id' => $user?->id,
                'cart_id' => $cart?->id,
                'coupon_id' => $coupon?->id,
                'shipping_method_id' => $shippingMethodId,
                'shipping_zone_id' => $shippingZoneId,
                'status' => $initialStatus,
                'payment_status' => $initialStatus === 'pending_payment' ? 'pending_payment' : 'pending',
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
            if (! in_array($paymentMethod, ['cod', 'vnpay', 'momo'], true)) {
                $paymentMethod = 'cod';
            }

            Payment::query()->create([
                'order_id' => $order->id,
                'method' => $paymentMethod,
                'amount' => $order->total_amount,
                'currency' => $order->currency ?? 'VND',
                'status' => 'pending',
            ]);

            foreach ($processedItems as $it) {
                $product = $it['product'];
                $reservedVariant = $this->reserveVariantStock($product, $it['variant']->id, $it['quantity']);
                $unitPrice = (float) $it['unit_price'];

                OrderItem::query()->create([
                    'order_id' => $order->id,
                    'product_id' => $product->id,
                    'variant_id' => $reservedVariant->id,
                    'product_name_snapshot' => $product->name,
                    'quantity' => $it['quantity'],
                    'unit_price' => $unitPrice,
                    'total_price' => $unitPrice * $it['quantity'],
                ]);
            }

            if ($coupon) {
                CouponUsage::query()->create([
                    'coupon_id' => $coupon->id,
                    'user_id' => $user?->id,
                    'order_id' => $order->id,
                    'discount_amount' => $discount,
                ]);
            }

            if ($cart) {
                CartItem::query()->where('cart_id', $cart->id)->delete();
                $cart->status = 'active';
                $cart->save();
            }

            $order->load(['items.product', 'items.variant', 'payment']);

            if ($paymentMethod === 'cod') {
                $email = $user->email ?? null;
                if ($email) {
                    NotificationFacade::route('mail', $email)->notify(new \App\Notifications\OrderConfirmationNotification($order));
                }
            }

            \App\Jobs\InvalidateAdminDashboardCache::dispatch();

            return $order;
        });
    }

    public function getClientOrders(User $user, int $perPage = 12)
    {
        return Order::query()
            ->where('user_id', $user->id)
            ->where('status', '!=', 'pending_payment') // Exclude orders waiting for payment
            ->orderBy('created_at', 'desc')
            ->with(['items.product', 'payment'])
            ->paginate($perPage);
    }

    public function getClientOrder(Order $order, User $user): Order
    {
        if ($order->user_id !== $user->id) {
            throw new \Exception('Unauthorized', 403);
        }

        $order->load(['items.product', 'payment', 'returnRequest', 'statusHistories', 'statusHistories.changedBy']);

        return $order;
    }

    public function cancelOrder(Order $order, User $user): Order
    {
        if ($order->user_id !== $user->id) {
            throw new \Exception('Unauthorized', 403);
        }

        $cur = strtolower((string) ($order->status ?? ''));
        if (! in_array($cur, ['pending', 'processing'], true)) {
            throw new \Exception('Không thể hủy đơn ở trạng thái này.', 422);
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
            'from_status' => $prevStatus,
            'to_status' => 'cancelled',
            'changed_by_user_id' => $user->id,
            'note' => null,
        ]);

        \App\Jobs\InvalidateAdminDashboardCache::dispatch();

        return $order;
    }

    public function confirmReceived(Order $order, User $user): Order
    {
        if ($order->user_id !== $user->id) {
            throw new \Exception('Unauthorized', 403);
        }

        $cur = strtolower((string) ($order->status ?? ''));
        if ($cur !== 'delivered') {
            throw new \Exception('Chỉ có thể xác nhận khi đơn ở trạng thái đã giao.', 422);
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

        \App\Jobs\InvalidateAdminDashboardCache::dispatch();

        return $order;
    }

    public function confirmPayment(Order $order, User $user): Order
    {
        if ($order->user_id !== $user->id) {
            throw new \Exception('Unauthorized', 403);
        }

        $order->loadMissing(['payment']);
        if (! $order->payment || strtolower((string) $order->payment->method) !== 'cod') {
            throw new \Exception('Chỉ có thể xác nhận thanh toán cho đơn hàng COD.', 422);
        }

        if ($order->payment->status === 'paid') {
            throw new \Exception('Đơn hàng này đã được xác nhận thanh toán.', 422);
        }

        $order->payment->status = 'paid';
        $order->payment->paid_at = now();
        $order->payment->save();

        $order->payment_status = 'paid';
        $order->save();

        \App\Jobs\InvalidateAdminDashboardCache::dispatch();

        return $order;
    }

    public function requestReturn(Order $order, User $user, array $data, array $files): Order
    {
        if ($order->user_id !== $user->id) {
            throw new \Exception('Unauthorized', 403);
        }

        $cur = strtolower((string) ($order->status ?? ''));
        if ($cur !== 'delivered') {
            throw new \Exception('Chỉ có thể yêu cầu hoàn trả khi đơn ở trạng thái đã giao.', 422);
        }

        $order->loadMissing(['returnRequest']);
        if ($order->returnRequest) {
            throw new \Exception('Đơn hàng này đã có yêu cầu hoàn trả.', 422);
        }

        $mediaMeta = [];
        foreach ($files as $f) {
            if (! $f) {
                continue;
            }
            $mime = (string) ($f->getMimeType() ?? '');
            $isVideo = str_starts_with(strtolower($mime), 'video/');
            $type = $isVideo ? 'video' : 'image';
            $path = $f->storePublicly('returns/'.(int) $order->id, ['disk' => 'public']);
            $mediaMeta[] = [
                'type' => $type,
                'url' => '/storage/'.ltrim($path, '/'),
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
                'body' => 'Đơn #'.($order->order_code ?: ('ET-'.$order->id)).' vừa có yêu cầu hoàn trả.',
                'data' => [
                    'order_id' => (int) $order->id,
                    'order_code' => (string) ($order->order_code ?: ('ET-'.$order->id)),
                ],
                'read_at' => null,
            ]);
        }

        $order->load(['returnRequest']);

        return $order;
    }

    public function confirmRefundReceived(Order $order, User $user): Order
    {
        if ($order->user_id !== $user->id) {
            throw new \Exception('Unauthorized', 403);
        }

        $order->loadMissing(['returnRequest']);
        if (! $order->returnRequest) {
            throw new \Exception('Đơn hàng này chưa có yêu cầu hoàn trả.', 422);
        }

        $rrStatus = strtolower((string) ($order->returnRequest->status ?? ''));
        if ($rrStatus !== 'refunded') {
            throw new \Exception('Chỉ có thể xác nhận khi admin đã hoàn tiền.', 422);
        }

        if ($order->returnRequest->customer_confirmed_at) {
            throw new \Exception('Bạn đã xác nhận nhận tiền hoàn trước đó.', 422);
        }

        $order->returnRequest->customer_confirmed_at = now();
        $order->returnRequest->save();

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
                'body' => 'Đơn #'.($order->order_code ?: ('ET-'.$order->id)).' đã được khách xác nhận nhận tiền hoàn.',
                'data' => [
                    'order_id' => (int) $order->id,
                    'order_code' => (string) ($order->order_code ?: ('ET-'.$order->id)),
                ],
                'read_at' => null,
            ]);
        }

        $order->load(['returnRequest']);

        return $order;
    }

    private function findPurchasableVariant(Product $product, ?int $variantId): ProductVariant
    {
        $query = $product->variants()->where('is_active', true);
        if ($variantId) {
            $query->where('id', $variantId);
        } else {
            $query->orderBy('id');
        }

        $variant = $query->first();
        if (! $variant) {
            throw ValidationException::withMessages([
                'items' => "Phiên bản của sản phẩm {$product->name} không hợp lệ.",
            ]);
        }

        return $variant;
    }

    private function reserveVariantStock(Product $product, ?int $variantId, int $qty): ProductVariant
    {
        $variant = $this->findPurchasableVariant($product, $variantId);

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

    private function getAdminSetting(string $key, $default = null)
    {
        $s = AdminSetting::query()->where('key', $key)->first();
        if (! $s instanceof AdminSetting) {
            return $default;
        }

        $type = $s->getAttribute('type');
        $value = $s->getAttribute('value');

        if ($type === 'json' || $type === 'array') {
            return is_array($value) ? $value : (json_decode((string) $value, true) ?: $default);
        }
        if ($type === 'boolean') {
            return filter_var($value, FILTER_VALIDATE_BOOLEAN);
        }
        if ($type === 'integer') {
            return (int) $value;
        }

        return $value ?? $default;
    }

    private function generateOrderCode(): string
    {
        // Retry up to 5 times to guarantee uniqueness under high concurrency.
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $code = 'ET-'.strtoupper(bin2hex(random_bytes(4))).'-'.now()->format('ymd');
            if (! Order::query()->where('order_code', $code)->exists()) {
                return $code;
            }
        }

        // Ultimate fallback: UUID-based code (practically impossible to collide)
        return 'ET-'.strtoupper(substr(str_replace('-', '', (string) \Illuminate\Support\Str::uuid()), 0, 10));
    }
}
