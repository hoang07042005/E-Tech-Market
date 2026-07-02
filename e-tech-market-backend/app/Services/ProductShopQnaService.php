<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\Product;
use App\Models\ProductShopQna;
use App\Models\User;

class ProductShopQnaService
{
    /**
     * Hộp thư admin: các câu hỏi chưa trả lời.
     */
    public function getPendingQnas()
    {
        return ProductShopQna::query()
            ->with(['product:id,name,slug,is_active'])
            ->whereNull('answer')
            ->orderByDesc('created_at')
            ->limit(500)
            ->get();
    }

    public function getAllQnas()
    {
        return ProductShopQna::query()
            ->with(['product:id,name,slug,is_active'])
            ->orderByDesc('created_at')
            ->limit(1000)
            ->get();
    }

    /**
     * Lấy toàn bộ Q&A của một sản phẩm (Admin).
     */
    public function getProductQnasAdmin(Product $product)
    {
        return $product->shopQnas()
            ->orderByRaw('answered_at is null desc')
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * Cập nhật/trả lời Q&A (Admin).
     */
    public function replyQna(Product $product, ProductShopQna $shopQna, array $data): ProductShopQna
    {
        if ((int) $shopQna->product_id !== (int) $product->id) {
            throw new \Exception('Not found', 404);
        }

        if (array_key_exists('answer', $data)) {
            $trimmed = $data['answer'] !== null ? trim($data['answer']) : '';
            $shopQna->answer = $trimmed !== '' ? $trimmed : null;
            $shopQna->answered_at = $shopQna->answer !== null ? now() : null;
        }

        if (isset($data['is_visible'])) {
            $shopQna->is_visible = (bool) $data['is_visible'];
        }

        $shopQna->save();

        return $shopQna->fresh();
    }

    /**
     * Lấy Q&A hiển thị công khai (Client).
     */
    public function getVisibleQnasClient(Product $product)
    {
        if (! $product->is_active) {
            throw new \Exception('Product not active', 404);
        }

        return ProductShopQna::query()
            ->where('product_id', $product->id)
            ->where('is_visible', true)
            ->with(['user:id,name,avatar_url'])
            ->orderByRaw('COALESCE(answered_at, created_at) DESC')
            ->get(['id', 'user_id', 'asker_display_name', 'question', 'answer', 'answered_at', 'created_at']);
    }

    /**
     * Gửi câu hỏi mới (Client).
     */
    public function submitQuestion(Product $product, ?User $user, array $data): ProductShopQna
    {
        if (! $product->is_active) {
            throw new \Exception('Product not active', 404);
        }

        $guestName = isset($data['guest_name']) ? trim($data['guest_name']) : '';
        if ($user === null && $guestName === '') {
            throw new \Exception('Vui lòng nhập tên hiển thị (hoặc đăng nhập).', 422);
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
        $adminUsers = User::query()
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
                'body' => ($displayName ?: 'Khách').' vừa hỏi về '.($product->name ?: 'sản phẩm').'.',
                'data' => [
                    'product_id' => (int) $product->id,
                    'product_slug' => (string) ($product->slug ?? ''),
                    'shop_qna_id' => (int) $row->id,
                ],
                'read_at' => null,
            ]);
        }

        return $row;
    }
}
