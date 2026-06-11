<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCouponRequest;
use App\Http\Requests\Admin\UpdateCouponRequest;
use App\Http\Resources\Admin\CouponResource;
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
        $coupons = $this->couponService->getAdminCoupons((int) $request->input('limit', 20));

        return CouponResource::collection($coupons)->response();
    }

    public function store(StoreCouponRequest $request): JsonResponse
    {
        $coupon = $this->couponService->createCoupon($request->validated());

        return response()->json((new CouponResource($coupon))->resolve(), 201);
    }

    public function update(UpdateCouponRequest $request, Coupon $coupon): JsonResponse
    {
        $updatedCoupon = $this->couponService->updateCoupon($coupon, $request->validated());

        return response()->json((new CouponResource($updatedCoupon))->resolve());
    }

    public function destroy(Coupon $coupon): JsonResponse
    {
        $this->couponService->deleteCoupon($coupon);

        return response()->json(['message' => 'Coupon deleted successfully']);
    }
}
