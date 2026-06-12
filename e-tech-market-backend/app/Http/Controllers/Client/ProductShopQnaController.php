<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Product;
use App\Models\ProductShopQna;
use App\Models\User;
use App\Models\User as UserModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class ProductShopQnaController extends Controller
{
    public function __construct(private \App\Services\ProductShopQnaService $qnaService)
    {
    }

    public function index(Product $product): JsonResponse
    {
        try {
            $rows = $this->qnaService->getVisibleQnasClient($product);
            return response()->json($rows);
        } catch (\Exception $e) {
            $code = $e->getCode() ?: 404;
            return response()->json(['message' => $e->getMessage()], $code);
        }
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
        $user = $this->optionalUser($request);

        $rules = [
            'question' => ['required', 'string', 'min:5', 'max:2000'],
            'guest_name' => ['nullable', 'string', 'min:2', 'max:120'],
        ];

        $data = validator($request->all(), $rules)->validate();

        try {
            $row = $this->qnaService->submitQuestion($product, $user, $data);
            return response()->json([
                'message' => 'Cảm ơn bạn! Cửa hàng sẽ trả lời sớm nhất có thể.',
                'id' => $row->id,
            ], 201);
        } catch (\Exception $e) {
            $code = $e->getCode() ?: 422;
            return response()->json(['message' => $e->getMessage()], $code);
        }
    }
}
