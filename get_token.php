<?php
require '/var/www/vendor/autoload.php';
$app = require '/var/www/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

// Lấy token của user đầu tiên
$user = App\Models\User::find(11);
$token = $user->createToken('test')->plainTextToken;
echo 'TOKEN: ' . $token . PHP_EOL;
echo 'USER: ' . $user->name . PHP_EOL;
echo 'USER_ID: ' . $user->id . PHP_EOL;
