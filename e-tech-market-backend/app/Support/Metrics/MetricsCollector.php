<?php

namespace App\Support\Metrics;

use Illuminate\Support\Facades\Log;
use Prometheus\CollectorRegistry;
use Prometheus\RenderTextFormat;

/**
 * Metrics Collector for Prometheus
 * Collects and records various application metrics
 */
class MetricsCollector
{
    private CollectorRegistry $registry;
    private string $namespace;

    public function __construct(CollectorRegistry $registry)
    {
        $this->registry = $registry;
        $this->namespace = config('metrics.namespace', 'etech');
    }

    private function shouldCollect(string $metric): bool
    {
        return config("metrics.collect.$metric", true);
    }

    /**
     * Record HTTP request metrics
     */
    public function recordHttpRequest(string $method, string $path, int $status, float $duration): void
    {
        if (!$this->shouldCollect('http_requests')) {
            return;
        }
        try {
            $histogram = $this->registry->getOrRegisterHistogram(
                $this->namespace,
                'http_request_duration_seconds',
                'HTTP request latency in seconds',
                ['method', 'path', 'status'],
                [0.001, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
            );

            // Sanitize path to avoid high cardinality
            $path = $this->sanitizePath($path);

            $histogram->observe($duration, [$method, $path, (string)$status]);
        } catch (\Exception $e) {
            Log::warning('Failed to record HTTP metrics', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Record queue job metrics
     */
    public function recordQueueJob(string $jobName, float $duration, string $status): void
    {
        if (!$this->shouldCollect('queue_jobs')) {
            return;
        }

        try {
            $histogram = $this->registry->getOrRegisterHistogram(
                $this->namespace,
                'queue_job_duration_seconds',
                'Queue job processing time in seconds',
                ['job', 'status'],
                [0.1, 0.5, 1, 5, 10, 30, 60],
            );

            $histogram->observe($duration, [$jobName, $status]);

            // Also record as counter
            $counter = $this->registry->getOrRegisterCounter(
                $this->namespace,
                'queue_jobs_total',
                'Total queue jobs processed',
                ['job', 'status'],
            );

            $counter->inc([$jobName, $status]);
        } catch (\Exception $e) {
            Log::warning('Failed to record queue metrics', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Record database query metrics
     */
    public function recordDatabaseQuery(string $query, float $duration): void
    {
        if (!$this->shouldCollect('database_queries')) {
            return;
        }

        try {
            $histogram = $this->registry->getOrRegisterHistogram(
                $this->namespace,
                'database_query_duration_seconds',
                'Database query latency in seconds',
                ['query_type'],
                [0.001, 0.01, 0.05, 0.1, 0.5, 1, 5],
            );

            $type = strtoupper(explode(' ', trim($query))[0]);
            $histogram->observe($duration, [$type]);
        } catch (\Exception $e) {
            Log::warning('Failed to record database metrics', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Record cache operations
     */
    public function recordCacheOperation(string $operation, bool $hit, float $duration = 0): void
    {
        if (!$this->shouldCollect('cache_operations')) {
            return;
        }

        try {
            $counter = $this->registry->getOrRegisterCounter(
                $this->namespace,
                'cache_operations_total',
                'Total cache operations',
                ['operation', 'result'],
            );

            $result = $hit ? 'hit' : 'miss';
            $counter->inc([$operation, $result]);

            if ($duration > 0) {
                $histogram = $this->registry->getOrRegisterHistogram(
                    $this->namespace,
                    'cache_operation_duration_seconds',
                    'Cache operation duration',
                    ['operation'],
                    [0.0001, 0.001, 0.01, 0.1],
                );

                $histogram->observe($duration, [$operation]);
            }
        } catch (\Exception $e) {
            Log::warning('Failed to record cache metrics', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Record Flash Sale metrics
     */
    public function recordFlashSaleMetric(
        int $itemsSold,
        int $quantityLimit,
        float $revenue,
        int $flashSaleId = 0
    ): void {
        if (!$this->shouldCollect('flash_sales')) {
            return;
        }

        try {
            // Items sold gauge
            $gauge = $this->registry->getOrRegisterGauge(
                $this->namespace,
                'flash_sale_items_sold',
                'Items sold in current flash sale',
                ['flash_sale_id'],
            );
            $gauge->set($itemsSold, [(string)$flashSaleId]);

            // Conversion rate
            $conversionRate = $quantityLimit > 0 ? ($itemsSold / $quantityLimit) * 100 : 0;
            $gauge = $this->registry->getOrRegisterGauge(
                $this->namespace,
                'flash_sale_conversion_rate',
                'Flash sale conversion rate percentage',
                ['flash_sale_id'],
            );
            $gauge->set($conversionRate, [(string)$flashSaleId]);

            // Revenue
            $gauge = $this->registry->getOrRegisterGauge(
                $this->namespace,
                'flash_sale_revenue',
                'Flash sale revenue in VND',
                ['flash_sale_id'],
            );
            $gauge->set($revenue, [(string)$flashSaleId]);
        } catch (\Exception $e) {
            Log::warning('Failed to record flash sale metrics', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Record API error metrics
     */
    public function recordApiError(string $endpoint, string $errorType, int $statusCode): void
    {
        if (!$this->shouldCollect('api_errors')) {
            return;
        }

        try {
            $counter = $this->registry->getOrRegisterCounter(
                $this->namespace,
                'api_errors_total',
                'Total API errors',
                ['endpoint', 'error_type', 'status_code'],
            );

            $endpoint = $this->sanitizePath($endpoint);
            $counter->inc([$endpoint, $errorType, (string)$statusCode]);
        } catch (\Exception $e) {
            Log::warning('Failed to record API error metrics', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Record authentication metrics
     */
    public function recordAuthEvent(string $type, bool $success): void
    {
        if (!$this->shouldCollect('authentication')) {
            return;
        }

        try {
            $counter = $this->registry->getOrRegisterCounter(
                $this->namespace,
                'auth_events_total',
                'Total authentication events',
                ['type', 'result'],
            );

            $result = $success ? 'success' : 'failure';
            $counter->inc([$type, $result]);
        } catch (\Exception $e) {
            Log::warning('Failed to record auth metrics', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Record payment metrics
     */
    public function recordPaymentTransaction(string $gateway, bool $success, float $amount): void
    {
        if (!$this->shouldCollect('payments')) {
            return;
        }

        try {
            $counter = $this->registry->getOrRegisterCounter(
                $this->namespace,
                'payment_transactions_total',
                'Total payment transactions',
                ['gateway', 'result'],
            );

            $result = $success ? 'success' : 'failure';
            $counter->inc([$gateway, $result]);

            // Track revenue by gateway
            $gauge = $this->registry->getOrRegisterGauge(
                $this->namespace,
                'payment_revenue_total',
                'Total payment revenue by gateway',
                ['gateway'],
            );
            $gauge->incBy($amount, [$gateway]);
        } catch (\Exception $e) {
            Log::warning('Failed to record payment metrics', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Record inventory metrics
     */
    public function recordInventoryUpdate(string $productId, int $quantityChange, string $reason): void
    {
        if (!$this->shouldCollect('inventory')) {
            return;
        }

        try {
            $counter = $this->registry->getOrRegisterCounter(
                $this->namespace,
                'inventory_changes_total',
                'Total inventory changes',
                ['product_id', 'reason'],
            );

            $counter->incBy($quantityChange, [$productId, $reason]);
        } catch (\Exception $e) {
            Log::warning('Failed to record inventory metrics', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Get all collected metrics in Prometheus format
     */
    public function getMetrics(): string
    {
        try {
            $renderer = new RenderTextFormat();
            // Collect metrics from the registry using public API
            $metrics = $this->registry->getMetricFamilySamples();
            return $renderer->render($metrics);
        } catch (\Exception $e) {
            Log::error('Failed to render metrics', ['error' => $e->getMessage()]);
            return '';
        }
    }

    /**
     * Sanitize path to avoid high cardinality
     * e.g., /api/users/123/orders/456 → /api/users/{id}/orders/{id}
     */
    private function sanitizePath(string $path): string
    {
        return preg_replace('/\/\d+/', '/{id}', $path) ?? $path;
    }
}
