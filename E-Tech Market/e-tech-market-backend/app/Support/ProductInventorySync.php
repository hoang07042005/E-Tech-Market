<?php

namespace App\Support;

use App\Models\Inventory;
use App\Models\InventoryTransaction;
use App\Models\Product;

class ProductInventorySync
{
    public const LOCATION_MAIN = 'main';

    /**
     * Đồng bộ bảng inventory (kho mặc định) với tổng stock_quantity của các variant.
     * Ghi nhật ký vào inventory_transactions khi số lượng thay đổi.
     */
    public static function syncFromVariants(Product $product, string $reason = 'sync_from_variants'): void
    {
        $product->loadMissing('variants');

        $total = (int) $product->variants->sum('stock_quantity');

        /** @var Inventory $inv */
        $inv = Inventory::query()->firstOrNew([
            'product_id' => $product->id,
            'location_code' => self::LOCATION_MAIN,
        ]);

        $before = $inv->exists ? (int) $inv->quantity_on_hand : 0;

        $inv->quantity_on_hand = $total;
        if (!$inv->exists) {
            $inv->reorder_level = 10;
        }
        if ($total > $before) {
            $inv->last_stock_in_at = now();
        }
        $inv->save();

        if ($before !== $total) {
            InventoryTransaction::query()->create([
                'product_id' => $product->id,
                'inventory_id' => $inv->id,
                'location_code' => self::LOCATION_MAIN,
                'quantity_change' => $total - $before,
                'quantity_after' => $total,
                'reason' => $reason,
                'notes' => null,
            ]);
        }
    }
}
