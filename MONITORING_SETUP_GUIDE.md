# APM & Error Tracking: Sentry + Prometheus Setup

## Part 1: Sentry Integration (Error Tracking)

### Step 1: Install Sentry Package

```bash
cd e-tech-market-backend
composer require sentry/sentry-laravel
php artisan vendor:publish --provider="Sentry\Laravel\ServiceProvider"
```

### Step 2: Configure .env

```env
# .env
SENTRY_LARAVEL_DSN=https://YOUR_KEY@YOUR_ID.ingest.sentry.io/YOUR_PROJECT_ID
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=v1.0.0
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% transaction sampling
SENTRY_PROFILES_SAMPLE_RATE=0.1  # 10% profiling
LOG_CHANNEL=stack
```

### Step 3: Create Sentry Configuration

```php
<?php
// config/sentry.php

return [
    'dsn' => env('SENTRY_LARAVEL_DSN'),
    'environment' => env('SENTRY_ENVIRONMENT', 'production'),
    'release' => env('SENTRY_RELEASE'),
    'integrations' => [
        \Sentry\Laravel\Integrations\RequestIntegration::class,
        \Sentry\Laravel\Integrations\QueueIntegration::class,
        \Sentry\Laravel\Integrations\MailIntegration::class,
        \Sentry\Laravel\Integrations\ExceptionIntegration::class,
    ],
    'traces_sample_rate' => (float)env('SENTRY_TRACES_SAMPLE_RATE', 0.1),
    'profiles_sample_rate' => (float)env('SENTRY_PROFILES_SAMPLE_RATE', 0.1),
    'breadcrumbs' => [
        'logs' => true,
        'sql_queries' => true,
        'cache' => true,
        'queue' => true,
    ],
];
```

### Step 4: Create Exception Handler Middleware

```php
<?php
// app/Http/Middleware/CaptureExceptions.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Sentry\Laravel\Integration;

class CaptureExceptions
{
    public function handle(Request $request, Closure $next)
    {
        try {
            // Add user context
            if ($request->user()) {
                Integration::configureScope(function ($scope) use ($request) {
                    $scope->setUser([
                        'id' => $request->user()->id,
                        'email' => $request->user()->email,
                        'username' => $request->user()->name,
                    ]);
                    
                    $scope->setTag('user_id', $request->user()->id);
                });
            }

            // Add request context
            Integration::configureScope(function ($scope) use ($request) {
                $scope->setContext('request', [
                    'method' => $request->method(),
                    'url' => $request->url(),
                    'ip' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                ]);
            });

            return $next($request);
        } catch (\Exception $e) {
            \Sentry\captureException($e);
            throw $e;
        }
    }
}
```

Register in `app/Http/Kernel.php`:

```php
protected $middleware = [
    // ... existing middleware
    \App\Http\Middleware\CaptureExceptions::class,
];
```

### Step 5: Create Job Exception Listener

```php
<?php
// app/Listeners/CaptureJobException.php

namespace App\Listeners;

use Illuminate\Queue\Events\JobExceptionOccurred;
use Sentry\Laravel\Integration;

class CaptureJobException
{
    public function handle(JobExceptionOccurred $event)
    {
        $exception = $event->exception;
        
        Integration::configureScope(function ($scope) use ($event) {
            $scope->setTag('queue_job', class_basename($event->job));
            $scope->setTag('queue_name', $event->job->getQueue());
            $scope->setContext('job', [
                'class' => get_class($event->job),
                'queue' => $event->job->getQueue(),
                'attempts' => $event->job->attempts(),
                'payload' => $event->job->getRawBody(),
            ]);
        });

        \Sentry\captureException($exception);
    }
}
```

Register in `app/Providers/EventServiceProvider.php`:

```php
protected $listen = [
    \Illuminate\Queue\Events\JobExceptionOccurred::class => [
        \App\Listeners\CaptureJobException::class,
    ],
];
```

---

## Part 2: Prometheus Metrics (Performance Monitoring)

### Step 1: Install Prometheus Package

```bash
composer require promphp/prometheus_client_php
```

### Step 2: Create Prometheus Service Provider

```php
<?php
// app/Providers/PrometheusServiceProvider.php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Prometheus\CollectorRegistry;
use Prometheus\Storage\Redis as RedisStorage;

class PrometheusServiceProvider extends ServiceProvider
{
    public function register()
    {
        $this->app->singleton(CollectorRegistry::class, function ($app) {
            $redis = $app['redis']->connection();
            
            return new CollectorRegistry(
                new RedisStorage(['redis' => $redis])
            );
        });
    }
}
```

Add to `config/app.php`:

```php
'providers' => [
    // ... existing providers
    App\Providers\PrometheusServiceProvider::class,
];
```

### Step 3: Create Metrics Helper

```php
<?php
// app/Support/Metrics/MetricsCollector.php

namespace App\Support\Metrics;

use Prometheus\CollectorRegistry;

class MetricsCollector
{
    private $registry;

    public function __construct(CollectorRegistry $registry)
    {
        $this->registry = $registry;
    }

    public function recordHttpRequest(string $method, string $path, int $status, float $duration)
    {
        $histogram = $this->registry->getOrRegisterHistogram(
            'etech',
            'http_request_duration_seconds',
            'HTTP request latency',
            ['method', 'path', 'status'],
            [0.001, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
        );

        $histogram->labels($method, $path, $status)->observe($duration);
    }

    public function recordQueueJob(string $jobName, float $duration, string $status)
    {
        $histogram = $this->registry->getOrRegisterHistogram(
            'etech',
            'queue_job_duration_seconds',
            'Queue job processing time',
            ['job', 'status'],
            [0.1, 0.5, 1, 5, 10, 30, 60],
        );

        $histogram->labels($jobName, $status)->observe($duration);
    }

    public function recordDatabaseQuery(string $query, float $duration)
    {
        $histogram = $this->registry->getOrRegisterHistogram(
            'etech',
            'database_query_duration_seconds',
            'Database query latency',
            ['query_type'],
            [0.001, 0.01, 0.05, 0.1, 0.5, 1],
        );

        $type = strtoupper(explode(' ', trim($query))[0]);
        $histogram->labels($type)->observe($duration);
    }

    public function recordCacheHit(bool $hit)
    {
        $counter = $this->registry->getOrRegisterCounter(
            'etech',
            'cache_hits_total',
            'Cache hits',
            ['status'],
        );

        $counter->labels($hit ? 'hit' : 'miss')->inc();
    }

    public function recordBusinessMetric(string $name, float $value, array $labels = [])
    {
        $gauge = $this->registry->getOrRegisterGauge(
            'etech',
            $name,
            'Custom business metric',
            array_keys($labels),
        );

        $gauge->labels(...array_values($labels))->set($value);
    }

    public function recordFlashSaleMetric(int $itemsSold, int $quantityLimit, float $revenue)
    {
        // Flash sale items sold
        $gauge = $this->registry->getOrRegisterGauge(
            'etech',
            'flash_sale_items_sold',
            'Items sold in flash sale',
        );
        $gauge->set($itemsSold);

        // Flash sale conversion
        $gauge = $this->registry->getOrRegisterGauge(
            'etech',
            'flash_sale_conversion_rate',
            'Flash sale conversion rate',
        );
        $gauge->set(($itemsSold / max($quantityLimit, 1)) * 100);

        // Flash sale revenue
        $gauge = $this->registry->getOrRegisterGauge(
            'etech',
            'flash_sale_revenue',
            'Flash sale revenue',
        );
        $gauge->set($revenue);
    }

    public function getMetrics(): string
    {
        return $this->registry->render();
    }
}
```

### Step 4: Create HTTP Middleware for Metrics

```php
<?php
// app/Http/Middleware/RecordMetrics.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Support\Metrics\MetricsCollector;

class RecordMetrics
{
    public function handle(Request $request, Closure $next)
    {
        $start = microtime(true);
        
        $response = $next($request);
        
        $duration = microtime(true) - $start;
        
        try {
            app(MetricsCollector::class)->recordHttpRequest(
                $request->method(),
                $request->path(),
                $response->getStatusCode(),
                $duration
            );
        } catch (\Exception $e) {
            // Don't let metrics collection break the request
            \Log::warning('Metrics recording failed', ['error' => $e->getMessage()]);
        }
        
        return $response;
    }
}
```

Register in `app/Http/Kernel.php`:

```php
protected $middleware = [
    // ... existing middleware
    \App\Http\Middleware\RecordMetrics::class,
];
```

### Step 5: Create Prometheus Metrics Endpoint

```php
<?php
// app/Http/Controllers/Admin/MetricsController.php

namespace App\Http\Controllers\Admin;

use App\Support\Metrics\MetricsCollector;
use Illuminate\Http\Response;

class MetricsController
{
    public function prometheus(MetricsCollector $collector)
    {
        return response($collector->getMetrics(), Response::HTTP_OK, [
            'Content-Type' => 'text/plain; version=0.0.4; charset=utf-8',
        ]);
    }
}
```

Add to routes:

```php
// routes/api_v1.php
Route::middleware('admin')->group(function () {
    Route::get('/metrics/prometheus', [MetricsController::class, 'prometheus']);
});
```

### Step 6: Create Database Query Listener

```php
<?php
// app/Listeners/RecordDatabaseQuery.php

namespace App\Listeners;

use Illuminate\Database\Events\QueryExecuted;
use App\Support\Metrics\MetricsCollector;

class RecordDatabaseQuery
{
    public function handle(QueryExecuted $event)
    {
        // Only record slow queries in production
        if (config('app.env') === 'production' && $event->time < 100) {
            return;
        }

        app(MetricsCollector::class)->recordDatabaseQuery(
            $event->sql,
            $event->time / 1000
        );
    }
}
```

Register in `app/Providers/EventServiceProvider.php`:

```php
protected $listen = [
    \Illuminate\Database\Events\QueryExecuted::class => [
        \App\Listeners\RecordDatabaseQuery::class,
    ],
];
```

### Step 7: Create Queue Job Listener

```php
<?php
// app/Listeners/RecordQueueJobMetrics.php

namespace App\Listeners;

use Illuminate\Queue\Events\JobProcessed;
use Illuminate\Queue\Events\JobFailed;
use App\Support\Metrics\MetricsCollector;

class RecordQueueJobMetrics
{
    public function processed(JobProcessed $event)
    {
        $startTime = $event->job->startedAt ?? now();
        $duration = now()->diffInSeconds($startTime);

        app(MetricsCollector::class)->recordQueueJob(
            class_basename($event->job),
            $duration,
            'success'
        );
    }

    public function failed(JobFailed $event)
    {
        $startTime = $event->job->startedAt ?? now();
        $duration = now()->diffInSeconds($startTime);

        app(MetricsCollector::class)->recordQueueJob(
            class_basename($event->job),
            $duration,
            'failed'
        );
    }
}
```

---

## Part 3: Docker Prometheus Setup

### Create Prometheus Configuration

```yaml
# docker/prometheus.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "127.0.0.1:9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    networks:
      - etech

  grafana:
    image: grafana/grafana:latest
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_SECURITY_ADMIN_USER=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
    depends_on:
      - prometheus
    networks:
      - etech

volumes:
  prometheus_data:
  grafana_data:

networks:
  etech:
    driver: bridge
```

### Create Prometheus Config

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'laravel'
    metrics_path: '/api/v1/metrics/prometheus'
    static_configs:
      - targets: ['backend:9000']
    basic_auth:
      username: 'prometheus'
      password: '${PROMETHEUS_PASSWORD}'
```

### Start Monitoring Stack

```bash
# Add to docker-compose.yml
docker-compose up -d prometheus grafana

# Access:
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3000 (admin/admin)
```

---

## Part 4: Monitoring Dashboard

### Create Grafana Dashboard JSON

```json
{
  "dashboard": {
    "title": "E-Tech Market API Monitoring",
    "panels": [
      {
        "title": "HTTP Request Latency",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, etech_http_request_duration_seconds_bucket)"
          }
        ]
      },
      {
        "title": "Queue Jobs Processing Time",
        "targets": [
          {
            "expr": "etech_queue_job_duration_seconds{status='success'}"
          }
        ]
      },
      {
        "title": "Failed Jobs Rate",
        "targets": [
          {
            "expr": "rate(etech_queue_job_duration_seconds{status='failed'}[5m])"
          }
        ]
      },
      {
        "title": "Flash Sale Conversion",
        "targets": [
          {
            "expr": "etech_flash_sale_conversion_rate"
          }
        ]
      }
    ]
  }
}
```

---

## Part 5: Alerting Rules

### Create Prometheus Alerts

```yaml
# alerts.yml
groups:
  - name: laravel
    rules:
      - alert: HighErrorRate
        expr: |
          (count(rate(etech_http_request_duration_seconds_bucket{le="+Inf"}[5m])) 
           - on() group_left sum(rate(etech_http_request_duration_seconds_bucket{status=~"5.."}[5m]))) 
          > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"

      - alert: HighQueueLatency
        expr: |
          histogram_quantile(0.95, etech_queue_job_duration_seconds_bucket) > 30
        for: 10m
        annotations:
          summary: "Queue processing latency is high (>30s)"

      - alert: SlowDatabase
        expr: |
          histogram_quantile(0.95, etech_database_query_duration_seconds_bucket) > 1
        for: 5m
        annotations:
          summary: "Database queries are slow (>1s)"

      - alert: FlashSaleTimeout
        expr: |
          etech_flash_sale_conversion_rate < 50
        for: 2m
        annotations:
          summary: "Flash sale conversion rate is low (<50%)"
```

---

## Setup Checklist

- [ ] Install Sentry: `composer require sentry/sentry-laravel`
- [ ] Set `SENTRY_LARAVEL_DSN` in `.env`
- [ ] Create exception handlers
- [ ] Register middleware
- [ ] Test error capture
- [ ] Install Prometheus: `composer require promphp/prometheus_client_php`
- [ ] Create MetricsCollector
- [ ] Create HTTP metrics middleware
- [ ] Setup Prometheus container
- [ ] Setup Grafana dashboards
- [ ] Configure alerting rules
- [ ] Test metrics endpoint

## Testing

### Test Sentry

```php
// artisan tinker
throw new Exception('Test Sentry error');
// Check Sentry dashboard - error should appear
```

### Test Prometheus

```bash
# Access metrics endpoint
curl http://localhost:8000/api/v1/metrics/prometheus

# Should return:
# etech_http_request_duration_seconds_bucket{...} 1
# etech_http_request_duration_seconds_sum{...} 0.123
```

## Performance Impact

- **Sentry**: ~5-10ms per error
- **Prometheus**: ~1-2ms per request
- **Total overhead**: <1% for most applications
