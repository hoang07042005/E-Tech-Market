<?php

namespace App\Observers;

use App\Models\Notification;
use App\Models\ProductVariant;
use App\Models\User;

class ProductVariantObserver
{
    public function saved(ProductVariant $variant): void
    {
        $threshold = 10;
        $newQty = (int) ($variant->stock_quantity ?? 0);
        $oldQty = (int) ($variant->getOriginal('stock_quantity') ?? 0);

        // Notify only when crossing from above threshold -> at/below threshold
        if ($newQty > $threshold) {
            return;
        }
        if ($oldQty <= $threshold && $variant->wasRecentlyCreated === false) {
            return;
        }

        $variant->loadMissing(['product:id,name,slug']);
        $pName = (string) ($variant->product?->name ?? 'Sản phẩm');

        $adminUsers = User::query()
            ->whereHas('roles', function ($r) {
                $r->where('slug', '=', 'admin');
            })
            ->select(['id'])
            ->get();

        foreach ($adminUsers as $au) {
            Notification::create([
                'user_id' => (int) $au->id,
                'type' => 'low_stock',
                'title' => 'Cảnh báo tồn kho',
                'body' => $pName . ' đang sắp hết hàng (tồn: ' . $newQty . ').',
                'data' => [
                    'product_id' => (int) ($variant->product_id ?? 0),
                    'product_slug' => (string) ($variant->product?->slug ?? ''),
                    'variant_id' => (int) $variant->id,
                    'sku' => (string) ($variant->sku ?? ''),
                    'stock_quantity' => $newQty,
                    'threshold' => $threshold,
                ],
                'read_at' => null,
            ]);
        }
    }
}

