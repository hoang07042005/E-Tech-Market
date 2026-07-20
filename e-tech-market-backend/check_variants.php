<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\FlashSaleItem;
use App\Models\FlashSale;

// Check active flash sale items for product/variant 543
$items = FlashSaleItem::where('product_id', 211)
    ->with(['flashSale'])
    ->get();

echo "=== Flash Sale Items for product_id=211 ===\n";
foreach ($items as $item) {
    $fs = $item->flashSale;
    echo 'FSItem ID:' . $item->id
        . ' | variant_id:' . $item->variant_id
        . ' | flash_price:' . $item->flash_sale_price
        . ' | FS status:' . ($fs ? $fs->status : 'N/A')
        . ' | FS start:' . ($fs ? $fs->start_at : 'N/A')
        . ' | FS end:' . ($fs ? $fs->end_at : 'N/A')
        . PHP_EOL;
}

// Check effective price at order creation time
echo "\n=== Simulating effective_price for variant 543 ===\n";
$v = \App\Models\ProductVariant::find(543);
echo 'price: ' . $v->price . PHP_EOL;
echo 'discount_type: ' . $v->discount_type . PHP_EOL;
echo 'discount_value: ' . $v->discount_value . PHP_EOL;
echo 'discount_start_at: ' . $v->discount_start_at . PHP_EOL;
echo 'discount_end_at: ' . $v->discount_end_at . PHP_EOL;
echo 'effective_price NOW: ' . $v->effective_price . PHP_EOL;
echo 'Expected: 36,590,000 | Got 33,990,000 => diff = ' . (36590000 - 33990000) . PHP_EOL;
