<?php

namespace App\Http\Controllers\Admin;

use Illuminate\Routing\Controller as BaseController;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use App\Support\Metrics\MetricsCollector;

/**
 * Metrics Controller - Exposes Prometheus metrics endpoint
 */
class MetricsController extends BaseController
{
    /**
     * Get Prometheus metrics in Prometheus format
     * 
     * @return Response
     */
    public function prometheus(MetricsCollector $collector): Response
    {
        $metrics = $collector->getMetrics();

        return response($metrics, Response::HTTP_OK, [
            'Content-Type' => 'text/plain; version=0.0.4; charset=utf-8',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
    }

    /**
     * Health check endpoint for monitoring
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function health()
    {
        $health = [
            'status' => 'healthy',
            'timestamp' => now()->toIso8601String(),
            'version' => config('app.version', '1.0.0'),
            'environment' => config('app.env'),
            'services' => [
                'database' => $this->checkDatabaseHealth(),
                'redis' => $this->checkRedisHealth(),
                'queue' => $this->checkQueueHealth(),
            ],
        ];

        $statusCode = $this->isHealthy($health) ? 200 : 503;

        return response()->json($health, $statusCode);
    }

    private function checkDatabaseHealth(): array
    {
        try {
            DB::connection()->getPdo();
            return ['status' => 'ok'];
        } catch (\Exception $e) {
            return ['status' => 'error', 'error' => $e->getMessage()];
        }
    }

    private function checkRedisHealth(): array
    {
        try {
            Redis::ping();
            return ['status' => 'ok'];
        } catch (\Exception $e) {
            return ['status' => 'error', 'error' => $e->getMessage()];
        }
    }

    private function checkQueueHealth(): array
    {
        try {
            $queueLength = Redis::llen('queue:default');
            return ['status' => 'ok', 'queue_length' => $queueLength];
        } catch (\Exception $e) {
            return ['status' => 'error', 'error' => $e->getMessage()];
        }
    }

    private function isHealthy(array $health): bool
    {
        foreach ($health['services'] as $service) {
            if ($service['status'] !== 'ok') {
                return false;
            }
        }
        return true;
    }
}
