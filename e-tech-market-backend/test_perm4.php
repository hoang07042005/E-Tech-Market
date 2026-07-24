<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Auth;

$u = User::where('email', 'tuantran5448@gmail.com')->first();
if (!$u) {
    echo "User not found\n";
    exit;
}

Auth::shouldUse('sanctum');

try {
    $has = $u->hasPermissionTo('manage-orders');
    echo "hasPermissionTo: " . ($has ? "YES" : "NO") . "\n";
} catch (\Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
