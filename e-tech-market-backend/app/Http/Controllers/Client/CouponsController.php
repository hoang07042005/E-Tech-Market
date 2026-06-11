<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CouponsController extends Controller
{
    public function __construct(private \App\Services\CouponService $couponService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $userId = $request->user('sanctum') ? $request->user('sanctum')->id : null;
        $excludeSaved = $request->boolean('exclude_saved');
        
        $filtered = $this->couponService->getAvailableCoupons($userId, $excludeSaved);

        return response()->json($filtered);
    }

    public function saved(Request $request): JsonResponse
    {
        $user = $request->user();
        $filtered = $this->couponService->getSavedCoupons($user);

        return response()->json($filtered);
    }

    public function save(Request $request): JsonResponse
    {
        $request->validate(['code' => 'required|string']);
        
        try {
            $this->couponService->saveCouponForUser($request->user(), $request->code);
            return response()->json(['message' => 'Đã lưu mã thành công.']);
        } catch (\Exception $e) {
            $code = $e->getCode() ?: 400;
            return response()->json(['message' => $e->getMessage()], $code);
        }
    }

    public function apply(Request $request): JsonResponse
    {
        $request->validate([
            'code' => 'required|string',
            'order_amount' => 'required|numeric|min:0',
        ]);

        $code = $request->input('code');
        $orderAmount = $request->input('order_amount');
        $userId = $request->user('sanctum') ? $request->user('sanctum')->id : null;

        try {
            $result = $this->couponService->applyCoupon($code, $orderAmount, $userId);
            return response()->json($result);
        } catch (\Exception $e) {
            $code = $e->getCode() ?: 400;
            return response()->json(['message' => $e->getMessage()], $code);
        }
    }
}
