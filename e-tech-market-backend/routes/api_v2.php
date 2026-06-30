<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\V2\WebhookController;

Route::get('/status', function () {
    return response()->json(['version' => 'v2', 'status' => 'ok']);
});

Route::prefix('webhooks')->group(function () {
    Route::get('/vnpay/ipn', [WebhookController::class, 'vnpay']);
    Route::post('/momo/ipn', [WebhookController::class, 'momo']);
});
