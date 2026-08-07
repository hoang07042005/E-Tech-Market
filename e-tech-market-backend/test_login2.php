<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$u = \App\Models\User::where('email', 'admin@etech.com')->first();
$u->password = \Illuminate\Support\Facades\Hash::make('12345678');
$u->save();

$request = \Illuminate\Http\Request::create('/api/v1/auth/login', 'POST', ['email' => 'admin@etech.com', 'password' => '12345678']);
$request->headers->set('X-Client-Platform', 'mobile');

$response = app()->handle($request);
echo "Status: " . $response->getStatusCode() . "\n";
echo "Content: " . $response->getContent() . "\n";
