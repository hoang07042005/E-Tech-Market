<?php

namespace App\Observers;

use App\Models\Notification;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

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

        // Cache admin user ids to avoid querying roles on every variant save
        $adminIds = Cache::remember('admin_user_ids', 300, function () {
            return User::query()
                ->whereHas('roles', function ($r) {
                    $r->where('slug', '=', 'admin');
                })
                ->pluck('id')
                ->toArray();
        });

        if (empty($adminIds)) {
            return;
        }

        // Bulk insert notifications to reduce DB roundtrips
        $now = now();
        $rows = [];
        foreach ($adminIds as $id) {
            $rows[] = [
                'user_id' => (int) $id,
                'type' => 'low_stock',
                'title' => 'Cảnh báo tồn kho',
                'body' => $pName . ' đang sắp hết hàng (tồn: ' . $newQty . ').',
                'data' => json_encode([
                    'product_id' => (int) ($variant->product_id ?? 0),
                    'product_slug' => (string) ($variant->product?->slug ?? ''),
                    'variant_id' => (int) $variant->id,
                    'sku' => (string) ($variant->sku ?? ''),
                    'stock_quantity' => $newQty,
                    'threshold' => $threshold,
                ]),
                'read_at' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        try {
            Notification::insert($rows);
        } catch (\Throwable $e) {
            // Fallback: if bulk insert fails, try individual creates
            foreach ($adminIds as $id) {
                try {
                    Notification::create([
                        'user_id' => (int) $id,
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
                } catch (\Throwable $ignore) {
                    // ignore individual failures
                }
            }
        }
    }
}

