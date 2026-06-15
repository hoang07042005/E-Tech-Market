<?php

return [
    'api' => [
        'title' => 'E-Tech Market API',
        'version' => '1.0.0',
        'prefix' => 'api/v1',
        'domain' => env('SWAGGER_API_DOMAIN', null),
        'middleware' => ['api', \Illuminate\Routing\Middleware\SubstituteBindings::class],
    ],

    'routes' => [
        'api' => 'docs',
        'middleware' => ['web', 'auth:sanctum'],
    ],

    'viewatham' => [
        'title' => config('app.name', 'E-Tech Market'),
        'favicon' => '/favicon.ico',
        'styles' => ['/css/swagger.css'],
        'logo' => '/logo.png',
    ],

    'annotations' => [
        base_path('app/Http/Controllers'),
    ],

    'yaml' => [
        'enabled' => true,
        'output' => base_path('docs/openapi.yaml'),
        'output_hash' => base_path('docs/openapi.yaml.lock'),
        'save' => true,
        'html' => 'docs.html',
        'json' => 'docs.json',
    ],

    'swagger_versions' => ['v3'],
];