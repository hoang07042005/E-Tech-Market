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
    public function index(Request $request): JsonResponse
    {
        $coupons = Coupon::query()
            ->withCount('usages')
            ->orderBy('created_at', 'desc')
            ->paginate((int) $request->input('limit', 20));

        return response()->json(CouponResource::collection($coupons)->resolve());
    }

    public function store(StoreCouponRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $coupon = Coupon::create($validated);

        return response()->json((new CouponResource($coupon))->resolve(), 201);
    }

    public function update(UpdateCouponRequest $request, Coupon $coupon): JsonResponse
    {
        $validated = $request->validated();

        $coupon->update($validated);

        return response()->json((new CouponResource($coupon))->resolve());
    }

    public function destroy(Coupon $coupon): JsonResponse
    {
        $coupon->delete();

        return response()->json(['message' => 'Coupon deleted successfully']);
    }
}
