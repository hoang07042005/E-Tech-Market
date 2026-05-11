<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductShopQna;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Models\User as UserModel;
use Laravel\Sanctum\PersonalAccessToken;

class ProductShopQnaController extends Controller
{
    /**
     * Khách xem các câu hỏi hiển thị công khai (kể cả đang chờ cửa hàng trả lời).
     */
    public function index(Product $product): JsonResponse
    {
        if (! $product->is_active) {
            return response()->json(['message' => 'Product not active'], 404);
        }

        $rows = ProductShopQna::query()
            ->where('product_id', $product->id)
            ->where('is_visible', true)
            ->with(['user:id,name,avatar_url'])
            ->orderByRaw('COALESCE(answered_at, created_at) DESC')
            ->get(['id', 'user_id', 'asker_display_name', 'question', 'answer', 'answered_at', 'created_at']);

        return response()->json($rows);
    }

    private function optionalUser(Request $request): ?User
    {
        $bearer = $request->bearerToken();
        if (! $bearer) {
            return null;
        }

        $tokenModel = PersonalAccessToken::findToken($bearer);
        if (! $tokenModel || ! ($tokenModel->tokenable instanceof User)) {
            return null;
        }

        return $tokenModel->tokenable;
    }

    public function store(Product $product, Request $request): JsonResponse
    {
        if (! $product->is_active) {
            return response()->json(['message' => 'Product not active'], 404);
        }

        $user = $this->optionalUser($request);

        $rules = [
            'question' => ['required', 'string', 'min:5', 'max:2000'],
            'guest_name' => ['nullable', 'string', 'min:2', 'max:120'],
        ];

        $data = validator($request->all(), $rules)->validate();

        $guestName = isset($data['guest_name']) ? trim($data['guest_name']) : '';
        if ($user === null && $guestName === '') {
            return response()->json([
                'message' => 'Vui lòng nhập tên hiển thị (hoặc đăng nhập).',
            ], 422);
        }

        $displayName = $user
            ? mb_substr(trim($user->name), 0, 120)
            : mb_substr($guestName, 0, 120);

        $row = ProductShopQna::create([
            'product_id' => $product->id,
            'user_id' => $user?->id,
            'asker_display_name' => $displayName ?: 'Khách',
            'question' => trim($data['question']),
            'answer' => null,
            'answered_at' => null,
            'is_visible' => true,
        ]);

        // Notify all admins about new Q&A question
        $adminUsers = UserModel::query()
            ->whereHas('roles', function ($r) {
                $r->where('slug', '=', 'admin');
            })
            ->select(['id'])
            ->get();
        foreach ($adminUsers as $au) {
            Notification::create([
                'user_id' => (int) $au->id,
                'type' => 'shop_qna_new',
                'title' => 'Câu hỏi mới (Hỏi đáp)',
                'body' => ($displayName ?: 'Khách') . ' vừa hỏi về ' . ($product->name ?: 'sản phẩm') . '.',
                'data' => [
                    'product_id' => (int) $product->id,
                    'product_slug' => (string) ($product->slug ?? ''),
                    'shop_qna_id' => (int) $row->id,
                ],
                'read_at' => null,
            ]);
        }

        return response()->json([
            'message' => 'Cảm ơn bạn! Cửa hàng sẽ trả lời sớm nhất có thể.',
            'id' => $row->id,
        ], 201);
    }
}
