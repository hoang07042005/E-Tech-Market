<?php

use Illuminate\Support\Facades\Route;

Route::get('/status', function () {
    return response()->json(['version' => 'v2', 'status' => 'ok']);
});
