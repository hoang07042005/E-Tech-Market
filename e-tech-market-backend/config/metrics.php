<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Metrics Collection
    |--------------------------------------------------------------------------
    | Enable or disable Prometheus metrics collection
    */
    'enabled' => env('METRICS_ENABLED', false),

    /*
    |--------------------------------------------------------------------------
    | Prometheus Namespace
    |--------------------------------------------------------------------------
    | Application namespace for all metrics
    */
    'namespace' => env('METRICS_NAMESPACE', 'etech'),

    /*
    |--------------------------------------------------------------------------
    | Redis Prefix
    |--------------------------------------------------------------------------
    | Redis key prefix for storing Prometheus data
    */
    'redis_prefix' => env('METRICS_REDIS_PREFIX', 'prometheus_'),

    /*
    |--------------------------------------------------------------------------
    | Prometheus Credentials
    |--------------------------------------------------------------------------
    | Basic Auth credentials for /metrics/prometheus endpoint
    */
    'prometheus_username' => env('PROMETHEUS_USERNAME', 'prometheus'),
    'prometheus_password' => env('PROMETHEUS_PASSWORD', 'prometheus_secure_password_123'),

    /*
    |--------------------------------------------------------------------------
    | Sentry Configuration
    |--------------------------------------------------------------------------
    | Error tracking and performance monitoring via Sentry
    */
    'sentry' => [
        'enabled' => env('SENTRY_ENABLED', false),
        'dsn' => env('SENTRY_LARAVEL_DSN'),
        'environment' => env('SENTRY_ENVIRONMENT', 'production'),
        'release' => env('SENTRY_RELEASE'),
        
        // Transaction sampling rate (0-1)
        'traces_sample_rate' => (float)env('SENTRY_TRACES_SAMPLE_RATE', 0.1),
        
        // Performance profiling sample rate (0-1)
        'profiles_sample_rate' => (float)env('SENTRY_PROFILES_SAMPLE_RATE', 0.1),
        
        // Capture breadcrumbs
        'breadcrumbs' => [
            'logs' => true,
            'sql_queries' => true,
            'cache' => true,
            'queue' => true,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Metrics to Record
    |--------------------------------------------------------------------------
    | Configure which metrics to collect
    */
    'collect' => [
        'http_requests' => true,
        'database_queries' => true,
        'cache_operations' => true,
        'queue_jobs' => true,
        'authentication' => true,
        'payments' => true,
        'inventory' => true,
        'flash_sales' => true,
    ],

    /*
    |--------------------------------------------------------------------------
    | Slow Query Threshold
    |--------------------------------------------------------------------------
    | Log database queries that exceed this threshold (ms)
    */
    'slow_query_threshold' => env('METRICS_SLOW_QUERY_THRESHOLD', 100),

    /*
    |--------------------------------------------------------------------------
    | Slow Request Threshold
    |--------------------------------------------------------------------------
    | Log HTTP requests that exceed this threshold (seconds)
    */
    'slow_request_threshold' => env('METRICS_SLOW_REQUEST_THRESHOLD', 5),
];
