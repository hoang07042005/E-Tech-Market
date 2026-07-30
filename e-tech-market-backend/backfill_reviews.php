<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Review;
use App\Models\Order;

$reviews = Review::whereNull('order_id')->get();
$count = 0;
foreach ($reviews as $review) {
    $latestOrder = Order::where('user_id', $review->user_id)
        ->whereIn('status', ['delivered', 'completed'])
        ->whereHas('items', function ($q) use ($review) {
            $q->where('product_id', $product_id = $review->product_id);
        })
        ->latest('id')
        ->first();
        
    if ($latestOrder) {
        $review->order_id = $latestOrder->id;
        $review->save();
        $count++;
    }
}
echo "Updated $count reviews.\n";
