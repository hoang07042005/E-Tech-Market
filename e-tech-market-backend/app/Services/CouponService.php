<?php

namespace App\Services;

use App\Models\Coupon;
use Illuminate\Support\Carbon;

class CouponService
{
    /**
     * Get paginated coupons for Admin.
     */
    public function getAdminCoupons(int $limit = 20)
    {
        return Coupon::query()
            ->with(['categories'])
            ->withCount('usages')
            ->orderBy('created_at', 'desc')
            ->paginate($limit);
    }

    /**
     * Create a coupon.
     */
    public function createCoupon(array $data): Coupon
    {
        $coupon = Coupon::create($data);
        if (isset($data['category_ids'])) {
            $coupon->categories()->sync($data['category_ids']);
        }
        return $coupon;
    }

    /**
     * Update a coupon.
     */
    public function updateCoupon(Coupon $coupon, array $data): Coupon
    {
        $coupon->update($data);
        if (array_key_exists('category_ids', $data)) {
            $coupon->categories()->sync($data['category_ids']);
        }
        return $coupon;
    }

    /**
     * Delete a coupon.
     */
    public function deleteCoupon(Coupon $coupon): void
    {
        $coupon->delete();
    }

    /**
     * Get available coupons for a user.
     */
    public function getAvailableCoupons(?int $userId, bool $excludeSaved)
    {
        $now = Carbon::now();
        $coupons = Coupon::with(['usages', 'savedByUsers', 'categories'])
            ->withCount('usages')
            ->where('is_active', true)
            ->where(function ($query) use ($now) {
                $query->whereNull('start_at')->orWhere('start_at', '<=', $now);
            })
            ->where(function ($query) use ($now) {
                $query->whereNull('end_at')->orWhere('end_at', '>=', $now);
            })
            ->orderBy('id', 'desc')
            ->get();

        return $coupons->filter(function ($coupon) use ($userId, $excludeSaved) {
            // Only exclude if per-user usage limit is reached
            if ($userId && $coupon->max_uses_per_user) {
                if ($coupon->usages->where('user_id', $userId)->count() >= $coupon->max_uses_per_user) {
                    return false;
                }
            }
            if ($coupon->max_uses && $coupon->usages_count >= $coupon->max_uses) {
                return false;
            }
            return true;
        })->map(function ($coupon) use ($userId) {
            // Append user_usage_count so frontend can show remaining uses per user
            $coupon->user_usage_count = $userId
                ? $coupon->usages->where('user_id', $userId)->count()
                : 0;
            // Append is_saved so frontend can render correct button state
            $coupon->is_saved = $userId
                ? $coupon->savedByUsers->where('id', $userId)->isNotEmpty()
                : false;
            return $coupon;
        })->values();
    }

    /**
     * Get saved coupons for a user.
     */
    public function getSavedCoupons($user)
    {
        $now = Carbon::now();
        $coupons = $user->savedCoupons()
            ->with(['usages', 'categories'])
            ->withCount('usages')
            ->where('is_active', true)
            ->where(function ($query) use ($now) {
                $query->whereNull('start_at')->orWhere('start_at', '<=', $now);
            })
            ->where(function ($query) use ($now) {
                $query->whereNull('end_at')->orWhere('end_at', '>=', $now);
            })
            ->orderBy('user_coupons.created_at', 'desc')
            ->get();

        return $coupons->filter(function ($coupon) {
            if ($coupon->max_uses && $coupon->usages_count >= $coupon->max_uses) {
                return false;
            }
            return true;
        })->map(function ($coupon) use ($user) {
            $coupon->user_usage_count = $coupon->usages->where('user_id', $user->id)->count();
            return $coupon;
        })->values();
    }

    /**
     * Save a coupon for a user.
     */
    public function saveCouponForUser($user, string $code)
    {
        $coupon = Coupon::where('code', $code)->first();

        if (! $coupon) {
            throw new \Exception('Mã giảm giá không tồn tại.', 404);
        }
        if (!$coupon->is_active) {
            throw new \Exception('Mã giảm giá chưa được kích hoạt hoặc đã bị khóa.', 400);
        }
        $now = now();
        if ($coupon->start_at && $now->lt($coupon->start_at)) {
            throw new \Exception('Mã giảm giá chưa đến thời gian sử dụng.', 400);
        }
        if ($coupon->end_at && $now->gt($coupon->end_at)) {
            throw new \Exception('Mã giảm giá đã hết hạn.', 400);
        }
        if ($user->savedCoupons()->where('coupon_id', $coupon->id)->exists()) {
            throw new \Exception('Bạn đã lưu mã này rồi.', 400);
        }

        $user->savedCoupons()->attach($coupon->id);
    }

    /**
     * Apply a coupon and calculate discount.
     */
    public function applyCoupon(string $code, float $orderAmount, ?int $userId, array $items = []): array
    {
        $coupon = Coupon::with(['usages', 'categories'])
            ->withCount('usages')
            ->where('code', $code)
            ->first();

        if (! $coupon) {
            throw new \Exception('Mã giảm giá không tồn tại.', 404);
        }
        if (!$coupon->is_active) {
            throw new \Exception('Mã giảm giá chưa được kích hoạt hoặc đã bị khóa.', 400);
        }
        $calcBase = $orderAmount;

        if ($coupon->categories->isNotEmpty()) {
            if (empty($items) && $userId) {
                $cart = \App\Models\Cart::where('user_id', $userId)->first();
                if ($cart) {
                    $cartItems = \App\Models\CartItem::where('cart_id', $cart->id)->get();
                    foreach ($cartItems as $it) {
                        $items[] = [
                            'product_id' => $it->product_id,
                            'quantity' => $it->quantity,
                            'unit_price' => $it->unit_price
                        ];
                    }
                }
            }

            if (empty($items)) {
                throw new \Exception('Cần có thông tin sản phẩm để kiểm tra mã giảm giá này.', 400);
            }

            $categoryIds = $coupon->categories->pluck('id')->toArray();
            
            $validSubtotal = 0;
            $productIds = collect($items)->pluck('product_id')->filter()->unique()->toArray();
            $products = \App\Models\Product::whereIn('id', $productIds)->get()->keyBy('id');

            foreach ($items as $it) {
                if (!isset($it['product_id'])) continue;
                $product = $products->get($it['product_id']);
                if ($product && in_array($product->category_id, $categoryIds)) {
                    $qty = (int)($it['quantity'] ?? 1);
                    $price = (float)($it['unit_price'] ?? 0);
                    $validSubtotal += $price * $qty;
                }
            }
            if ($validSubtotal == 0) {
                $categoryNames = $coupon->categories->pluck('name')->implode(', ');
                throw new \Exception('Mã giảm giá này chỉ áp dụng cho sản phẩm thuộc các danh mục: ' . $categoryNames, 400);
            }
            
            $calcBase = $validSubtotal;
        }

        if ($coupon->min_order_amount && $calcBase < $coupon->min_order_amount) {
            throw new \Exception('Giá trị sản phẩm hợp lệ chưa đạt tối thiểu '.number_format((float) $coupon->min_order_amount, 0, ',', '.').'đ', 400);
        }

        $now = now();
        if ($coupon->start_at && $now->lt($coupon->start_at)) {
            throw new \Exception('Mã giảm giá chưa đến thời gian sử dụng.', 400);
        }
        if ($coupon->end_at && $now->gt($coupon->end_at)) {
            throw new \Exception('Mã giảm giá đã hết hạn.', 400);
        }

        if ($coupon->max_uses && $coupon->usages_count >= $coupon->max_uses) {
            throw new \Exception('Mã giảm giá đã hết lượt sử dụng.', 400);
        }

        if ($userId && $coupon->max_uses_per_user) {
            $userUses = $coupon->usages->where('user_id', $userId)->count();
            if ($userUses >= $coupon->max_uses_per_user) {
                throw new \Exception('Bạn đã hết lượt sử dụng mã này.', 400);
            }
        }

        $discountAmount = 0;
        if ($coupon->coupon_type === 'percentage') {
            $discountAmount = ($calcBase * $coupon->value) / 100;
        } else {
            $discountAmount = $coupon->value;
        }

        if ($discountAmount > $calcBase) {
            $discountAmount = $calcBase;
        }

        return [
            'coupon' => $coupon,
            'discount_amount' => $discountAmount,
        ];
    }
}
