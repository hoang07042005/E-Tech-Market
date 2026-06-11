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
            ->withCount('usages')
            ->orderBy('created_at', 'desc')
            ->paginate($limit);
    }

    /**
     * Create a coupon.
     */
    public function createCoupon(array $data): Coupon
    {
        return Coupon::create($data);
    }

    /**
     * Update a coupon.
     */
    public function updateCoupon(Coupon $coupon, array $data): Coupon
    {
        $coupon->update($data);
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
        $coupons = Coupon::with(['usages', 'savedByUsers'])
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
            if ($userId && $excludeSaved && $coupon->savedByUsers->where('id', $userId)->isNotEmpty()) {
                return false;
            }
            if ($userId && $coupon->max_uses_per_user) {
                if ($coupon->usages->where('user_id', $userId)->count() >= $coupon->max_uses_per_user) {
                    return false;
                }
            }
            if ($coupon->max_uses && $coupon->usages_count >= $coupon->max_uses) {
                return false;
            }
            return true;
        })->values();
    }

    /**
     * Get saved coupons for a user.
     */
    public function getSavedCoupons($user)
    {
        $now = Carbon::now();
        $coupons = $user->savedCoupons()
            ->with(['usages'])
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
        })->values();
    }

    /**
     * Save a coupon for a user.
     */
    public function saveCouponForUser($user, string $code)
    {
        $coupon = Coupon::where('code', $code)->first();

        if (! $coupon) {
            throw new \Exception('Mã không tồn tại.', 404);
        }
        if (! $coupon->isValidNow()) {
            throw new \Exception('Mã đã hết hạn hoặc chưa được kích hoạt.', 400);
        }
        if ($user->savedCoupons()->where('coupon_id', $coupon->id)->exists()) {
            throw new \Exception('Bạn đã lưu mã này rồi.', 400);
        }

        $user->savedCoupons()->attach($coupon->id);
    }

    /**
     * Apply a coupon and calculate discount.
     */
    public function applyCoupon(string $code, float $orderAmount, ?int $userId): array
    {
        $coupon = Coupon::with(['usages'])
            ->withCount('usages')
            ->where('code', $code)
            ->first();

        if (! $coupon) {
            throw new \Exception('Mã giảm giá không tồn tại.', 404);
        }
        if (! $coupon->isValidNow()) {
            throw new \Exception('Mã giảm giá đã hết hạn hoặc chưa được kích hoạt.', 400);
        }
        if ($coupon->min_order_amount && $orderAmount < $coupon->min_order_amount) {
            throw new \Exception('Đơn hàng tối thiểu để áp dụng mã này là '.number_format((float) $coupon->min_order_amount, 0, ',', '.').'đ', 400);
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
            $discountAmount = ($orderAmount * $coupon->value) / 100;
        } else {
            $discountAmount = $coupon->value;
        }

        if ($discountAmount > $orderAmount) {
            $discountAmount = $orderAmount;
        }

        return [
            'coupon' => $coupon,
            'discount_amount' => $discountAmount,
        ];
    }
}
