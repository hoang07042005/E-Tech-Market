<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$request = \Illuminate\Http\Request::create('/api/v1/auth/login', 'POST', [
    'email' => 'tuantran5448@gmail.com',
    'password' => 'Tuan@1234567890'
]);

$controller = app(\App\Http\Controllers\Auth\AuthController::class);
$response = $controller->login($request);
$data = json_decode($response->getContent(), true);

if (!isset($data['token'])) {
    echo "Login failed: " . $response->getContent() . "\n";
    exit;
}

$token = $data['token'];
echo "Token: $token\n";

// Now simulate the API request
$req = \Illuminate\Http\Request::create('/api/v1/admin/orders/delivery-staff', 'GET');
$req->headers->set('Authorization', 'Bearer ' . $token);

// Handle request through Laravel's HTTP kernel to run middleware
$kernel = app(\Illuminate\Contracts\Http\Kernel::class);
$res = $kernel->handle($req);

echo "Status: " . $res->getStatusCode() . "\n";
echo "Response: " . $res->getContent() . "\n";
