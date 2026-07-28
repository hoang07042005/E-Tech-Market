<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Log;
use Prometheus\CollectorRegistry;
use Prometheus\Storage\Redis as RedisStorage;
use Prometheus\Storage\InMemory;
use App\Support\Metrics\MetricsCollector;

/**
 * Prometheus Service Provider
 * Registers Prometheus metrics collection
 * 
 * Uses Redis for persistent metrics storage across PHP-FPM requests
 * Redis is configured in Docker and shared by all PHP-FPM workers.
 */
class PrometheusServiceProvider extends ServiceProvider
{
    /**
     * Register the metrics services
     */
    public function register(): void
    {
        // Only register if metrics collection is enabled
        if (!config('metrics.enabled', false)) {
            return;
        }

        // Register Prometheus CollectorRegistry
        $this->app->singleton(CollectorRegistry::class, function ($app) {
            try {
                Log::debug('Initializing Prometheus registry with Redis storage');

                $prefix = config('metrics.redis_prefix', 'prometheus_');

                RedisStorage::setPrefix($prefix);

                $registry = new CollectorRegistry(
                    new RedisStorage([
                        'host' => env('REDIS_HOST', 'redis'),
                        'port' => env('REDIS_PORT', 6379),
                        'password' => env('REDIS_PASSWORD'),
                        'database' => 0,
                        'read_timeout' => '10',
                    ]),
                    true // Register default metrics
                );

                Log::info('Prometheus registry initialized successfully with Redis storage');

                return $registry;
            } catch (\Exception $e) {
                Log::error('Failed to initialize Prometheus registry with Redis', [
                    'error' => $e->getMessage(),
                ]);

                Log::warning('Falling back to InMemory storage for Prometheus metrics');

                return new CollectorRegistry(new InMemory());
            }
        });

        // Register MetricsCollector singleton
        $this->app->singleton(MetricsCollector::class, function ($app) {
            return new MetricsCollector(
                $app->make(CollectorRegistry::class)
            );
        });
    }

    /**
     * Boot the service provider
     */
    public function boot(): void
    {
        // Publish configuration
        $this->publishes([
            __DIR__ . '/../../config/metrics.php' => config_path('metrics.php'),
        ], 'config');

        if (!config('metrics.enabled', false)) {
            return;
        }

        $this->registerDatabaseListener();
        $this->registerCacheListeners();
        $this->registerQueueListeners();
    }

    /**
     * Listen to DB queries and record duration metrics
     */
    private function registerDatabaseListener(): void
    {
        try {
            \Illuminate\Support\Facades\DB::listen(function ($query) {
                try {
                    $collector = app(MetricsCollector::class);
                    // $query->time is in milliseconds, convert to seconds
                    $collector->recordDatabaseQuery($query->sql, $query->time / 1000);
                } catch (\Exception $e) {
                    // Silently ignore to avoid breaking queries
                }
            });
        } catch (\Exception $e) {
            Log::warning('Failed to register DB listener for metrics', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Listen to cache events (hit, miss) and record metrics
     */
    private function registerCacheListeners(): void
    {
        try {
            $events = $this->app['events'];

            $events->listen(\Illuminate\Cache\Events\CacheHit::class, function ($event) {
                try {
                    app(MetricsCollector::class)->recordCacheOperation('get', true);
                } catch (\Exception $e) {}
            });

            $events->listen(\Illuminate\Cache\Events\CacheMissed::class, function ($event) {
                try {
                    app(MetricsCollector::class)->recordCacheOperation('get', false);
                } catch (\Exception $e) {}
            });
        } catch (\Exception $e) {
            Log::warning('Failed to register cache listeners for metrics', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Listen to queue job events and record metrics
     */
    private function registerQueueListeners(): void
    {
        try {
            $events = $this->app['events'];

            $events->listen(\Illuminate\Queue\Events\JobProcessed::class, function ($event) {
                try {
                    $jobName = method_exists($event->job, 'resolveName')
                        ? $event->job->resolveName()
                        : get_class($event->job);
                    // Use a rough duration estimate from job payload if available
                    app(MetricsCollector::class)->recordQueueJob($jobName, 0, 'completed');
                } catch (\Exception $e) {}
            });

            $events->listen(\Illuminate\Queue\Events\JobFailed::class, function ($event) {
                try {
                    $jobName = method_exists($event->job, 'resolveName')
                        ? $event->job->resolveName()
                        : get_class($event->job);
                    app(MetricsCollector::class)->recordQueueJob($jobName, 0, 'failed');
                } catch (\Exception $e) {}
            });
        } catch (\Exception $e) {
            Log::warning('Failed to register queue listeners for metrics', ['error' => $e->getMessage()]);
        }
    }
}
