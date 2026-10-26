<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/

Route::get('/', function () {
    return view('welcome');
});

// Workaround for PHP built-in server (php artisan serve) on Windows
// which fails to serve files from symlinks/junctions.
if (app()->environment('local')) {
    Route::get('/storage/{path}', function ($path) {
        $basePath = realpath(storage_path('app/public'));
        $filePath = realpath(storage_path('app/public/' . $path));
        
        // Prevent directory traversal attacks (e.g. /storage/../../.env)
        if ($filePath === false || !str_starts_with($filePath, $basePath)) {
            abort(403, 'Truy cập bị từ chối.');
        }
        
        if (!file_exists($filePath) || is_dir($filePath)) {
            abort(404);
        }
        
        $mimeType = \Illuminate\Support\Facades\File::mimeType($filePath);
        
        return response()->file($filePath, [
            'Content-Type' => $mimeType,
            'Cache-Control' => 'public, max-age=31536000',
        ]);
    })->where('path', '.*');
}
