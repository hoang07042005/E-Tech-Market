<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Support\Metrics\MetricsCollector;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware to record HTTP request metrics for Prometheus
 */
class RecordMetrics
{
    public function handle(Request $request, Closure $next): Response
    {
        $start = microtime(true);

        $response = $next($request);

        $duration = microtime(true) - $start;

        try {
            $this->recordMetrics($request, $response, $duration);
        } catch (\Exception $e) {
            // Don't break the request if metrics recording fails
            Log::warning('Metrics recording failed', [
                'error' => $e->getMessage(),
                'path' => $request->path(),
            ]);
        }

        return $response;
    }

    private function recordMetrics(Request $request, Response $response, float $duration): void
    {
        try {
            $enabled = config('metrics.enabled', false);
            Log::debug('RecordMetrics.recordMetrics called', [
                'metrics_enabled' => $enabled,
                'path' => $request->path(),
            ]);
            
            if (!$enabled) {
                Log::debug('Metrics disabled, skipping recording');
                return;
            }
            
            $collector = app(MetricsCollector::class);
            Log::debug('MetricsCollector resolved', ['class' => get_class($collector)]);

            // Record standard HTTP metrics
            $collector->recordHttpRequest(
                $request->method(),
                $request->path(),
                $response->getStatusCode(),
                $duration
            );
            
            Log::debug('HTTP request recorded');

            // Record API errors if applicable
            if ($response->getStatusCode() >= 400) {
                $errorType = $this->getErrorType($response->getStatusCode());
                $collector->recordApiError(
                    $request->path(),
                    $errorType,
                    $response->getStatusCode()
                );
            }
        } catch (\Exception $e) {
            Log::error('Error in recordMetrics', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }

    private function getErrorType(int $statusCode): string
    {
        return match (true) {
            $statusCode >= 500 => 'server_error',
            $statusCode >= 400 => 'client_error',
            $statusCode >= 300 => 'redirect',
            default => 'unknown',
        };
    }
}
