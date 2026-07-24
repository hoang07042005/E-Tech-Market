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

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "http://localhost:8000/api/v1/admin/orders/delivery-staff");
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer $token", "Accept: application/json"]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$result = curl_exec($ch);
echo "Result: $result\n";
