<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;

$u = User::where('email', 'tuantran5448@gmail.com')->first();
if (!$u) {
    echo "User not found\n";
    exit;
}

try {
    echo "sanctum: ";
    $u->hasPermissionTo('manage-orders', 'sanctum');
    echo "OK\n";
} catch (\Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}

try {
    echo "api: ";
    $u->hasPermissionTo('manage-orders', 'api');
    echo "OK\n";
} catch (\Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}

try {
    echo "web: ";
    $u->hasPermissionTo('manage-orders', 'web');
    echo "OK\n";
} catch (\Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
