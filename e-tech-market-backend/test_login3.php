<?php
require 'vendor/autoload.php';

$client = new \GuzzleHttp\Client([
    'base_uri' => 'http://localhost:8000/api/v1/',
    'http_errors' => false,
]);

$response = $client->post('auth/login', [
    'json' => [
        'email' => 'admin@etech.com',
        'password' => '12345678'
    ]
]);

echo "Status: " . $response->getStatusCode() . "\n";
echo "Body: " . $response->getBody() . "\n";
