<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class LoyaltyController extends Controller
{
    /**
     * Register loyalty member for the authenticated user.
     */
    public function register(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if ($user->is_loyalty_member) {
            return response()->json(['message' => 'Bạn đã đăng ký thẻ hội viên rồi.'], 400);
        }

        $user->is_loyalty_member = true;
        $user->save();

        return response()->json([
            'message' => 'Đăng ký thẻ hội viên thành công',
            'user' => new \App\Http\Resources\UserResource($user),
        ]);
    }

    /**
     * Cancel loyalty member for the authenticated user.
     */
    public function cancel(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$user->is_loyalty_member) {
            return response()->json(['message' => 'Bạn chưa đăng ký thẻ hội viên.'], 400);
        }

        $user->is_loyalty_member = false;
        $user->save();

        return response()->json([
            'message' => 'Hủy thẻ hội viên thành công',
            'user' => new \App\Http\Resources\UserResource($user),
        ]);
    }
}
