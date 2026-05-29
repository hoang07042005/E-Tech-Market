<?php

$allowedOrigins = collect(preg_split('/\s*,\s*/', (string) env('CORS_ALLOWED_ORIGINS', ''), -1, PREG_SPLIT_NO_EMPTY));

$frontendUrl = env('FRONTEND_URL');
if (is_string($frontendUrl)) {
    $frontendUrl = rtrim(trim($frontendUrl), '/');
    if ($frontendUrl !== '') {
        $allowedOrigins->push($frontendUrl);
    }
}

$allowedOrigins = $allowedOrigins
    ->merge([
        // Vite CLI defaults
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        // Common frontend dev ports
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:4200',
        'http://127.0.0.1:4200',
    ])
    ->filter(fn ($origin) => is_string($origin) && $origin !== '')
    ->unique()
    ->values()
    ->all();

/*
| When no explicit origins were configured via env/local defaults, fall back to false
| instead of '*' to prevent wild-card origin attacks.
*/
if ($allowedOrigins === []) {
    $allowedOrigins = ['http://localhost:5173']; // default safe fallback
}

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    /*
    | Use "*" so Laravel's CORS middleware always matches SPA preflight OPTIONS,
    | even when the request path normalization differs slightly per environment.
    */
    'paths' => ['*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => $allowedOrigins,

    'allowed_origins_patterns' => [
        '/^https?:\\/\\/localhost(:[0-9]+)?$/',
        '/^https?:\\/\\/127\\.0\\.0\\.1(:[0-9]+)?$/',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
