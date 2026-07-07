<?php
require '/var/www/vendor/autoload.php';
$app = require '/var/www/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$count = App\Models\Review::count();
echo "Total reviews: $count\n";

$reviews = App\Models\Review::withTrashed()->latest()->take(5)->get(['id','user_id','product_id','status','rating','comment','created_at','deleted_at']);
foreach ($reviews as $r) {
    echo json_encode($r->toArray(), JSON_UNESCAPED_UNICODE) . "\n";
}
