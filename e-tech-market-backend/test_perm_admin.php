<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
use App\Models\User;
$u = User::where('email', 'admin@etech.com')->first();
try {
    $u->hasRole('admin');
    echo "sanctum role: OK\n";
} catch (\Throwable $e) {
    echo "sanctum role ERROR: " . $e->getMessage() . "\n";
}
