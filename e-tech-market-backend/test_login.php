<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$request = \Illuminate\Http\Request::create('/api/v1/auth/login', 'POST', ['email' => 'admin@etech.com', 'password' => '12345678']);
$request->headers->set('X-Client-Platform', 'mobile');

$response = app()->handle($request);
echo $response->getContent();
