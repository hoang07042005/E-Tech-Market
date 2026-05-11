<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CouponsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user('sanctum') ? $request->user('sanctum')->id : null;
        $excludeSaved = $request->boolean('exclude_saved');
        $now = \Illuminate\Support\Carbon::now();
        $coupons = Coupon::where('is_active', true)
            ->where(function ($query) use ($now) {
                $query->whereNull('start_at')->orWhere('start_at', '<=', $now);
            })
            ->where(function ($query) use ($now) {
                $query->whereNull('end_at')->orWhere('end_at', '>=', $now);
            })
            ->orderBy('id', 'desc')
            ->get();

        $filtered = $coupons->filter(function($coupon) use ($userId, $excludeSaved) {
            if ($userId && $excludeSaved && $coupon->savedByUsers()->where('user_id', $userId)->exists()) {
                return false;
            }
            if ($userId && $coupon->max_uses_per_user) {
                if ($coupon->usages()->where('user_id', $userId)->count() >= $coupon->max_uses_per_user) {
                    return false;
                }
            }
            if ($coupon->max_uses && $coupon->usages()->count() >= $coupon->max_uses) {
                return false;
            }
            return true;
        })->values();

        return response()->json($filtered);
    }

    public function saved(Request $request): JsonResponse
    {
        $user = $request->user();
        $now = \Illuminate\Support\Carbon::now();
        $coupons = $user->savedCoupons()
            ->where('is_active', true)
            ->where(function ($query) use ($now) {
                $query->whereNull('start_at')->orWhere('start_at', '<=', $now);
            })
            ->where(function ($query) use ($now) {
                $query->whereNull('end_at')->orWhere('end_at', '>=', $now);
            })
            ->orderBy('user_coupons.created_at', 'desc')
            ->get();

        $filtered = $coupons->filter(function($coupon) {
            if ($coupon->max_uses && $coupon->usages()->count() >= $coupon->max_uses) {
                return false;
            }
            return true;
        })->values();

        return response()->json($filtered);
    }

    public function save(Request $request): JsonResponse
    {
        $request->validate(['code' => 'required|string']);
        $user = $request->user();
        $coupon = Coupon::where('code', $request->code)->first();

        if (!$coupon) return response()->json(['message' => 'Mã không tồn tại.'], 404);
        if (!$coupon->isValidNow()) return response()->json(['message' => 'Mã đã hết hạn hoặc chưa được kích hoạt.'], 400);

        if ($user->savedCoupons()->where('coupon_id', $coupon->id)->exists()) {
            return response()->json(['message' => 'Bạn đã lưu mã này rồi.'], 400);
        }

        $user->savedCoupons()->attach($coupon->id);

        return response()->json(['message' => 'Đã lưu mã thành công.']);
    }

    public function apply(Request $request): JsonResponse
    {
        $request->validate([
            'code' => 'required|string',
            'order_amount' => 'required|numeric|min:0',
        ]);

        $code = $request->input('code');
        $orderAmount = $request->input('order_amount');

        $coupon = Coupon::where('code', $code)->first();

        if (!$coupon) {
            return response()->json(['message' => 'Mã giảm giá không tồn tại.'], 404);
        }

        if (!$coupon->isValidNow()) {
            return response()->json(['message' => 'Mã giảm giá đã hết hạn hoặc chưa được kích hoạt.'], 400);
        }

        if ($coupon->min_order_amount && $orderAmount < $coupon->min_order_amount) {
            return response()->json(['message' => "Đơn hàng tối thiểu để áp dụng mã này là " . number_format($coupon->min_order_amount) . "đ"], 400);
        }

        if ($coupon->max_uses && $coupon->usages()->count() >= $coupon->max_uses) {
            return response()->json(['message' => 'Mã giảm giá đã hết lượt sử dụng.'], 400);
        }

        $userId = $request->user('sanctum') ? $request->user('sanctum')->id : null;
        if ($userId && $coupon->max_uses_per_user) {
            $userUses = $coupon->usages()->where('user_id', $userId)->count();
            if ($userUses >= $coupon->max_uses_per_user) {
                return response()->json(['message' => 'Bạn đã hết lượt sử dụng mã này.'], 400);
            }
        }

        // Tính số tiền giảm
        $discountAmount = 0;
        if ($coupon->coupon_type === 'percentage') {
            $discountAmount = ($orderAmount * $coupon->value) / 100;
        } else {
            $discountAmount = $coupon->value;
        }

        // Không cho giảm quá số tiền đơn hàng
        if ($discountAmount > $orderAmount) {
            $discountAmount = $orderAmount;
        }

        return response()->json([
            'coupon' => $coupon,
            'discount_amount' => $discountAmount
        ]);
    }
}
