<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Log;

class ApiLogging
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $startTime = microtime(true);

        // Log request
        Log::channel('stderr')->info('API Request', [
            'method' => $request->method(),
            'url' => $request->fullUrl(),
            'ip' => $request->ip(),
            'headers' => $this->sanitizeHeaders($request->headers->all()),
            'body' => $this->sanitizeBody($request->all()),
        ]);

        $response = $next($request);

        // Log response
        $duration = round((microtime(true) - $startTime) * 1000, 2);
        $responseData = $response->getContent();

        // Try to parse JSON response
        $responseBody = json_decode($responseData, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $responseBody = $this->truncateData($responseBody);
        } else {
            $responseBody = $responseData;
        }

        Log::channel('stderr')->info('API Response', [
            'method' => $request->method(),
            'url' => $request->fullUrl(),
            'status' => $response->getStatusCode(),
            'duration_ms' => $duration,
            'response' => $responseBody,
        ]);

        return $response;
    }

    /**
     * Sanitize headers to remove sensitive data.
     */
    private function sanitizeHeaders(array $headers): array
    {
        $sensitiveKeys = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
        foreach ($headers as $key => $value) {
            if (in_array(strtolower($key), $sensitiveKeys)) {
                $headers[$key] = ['***REDACTED***'];
            }
        }
        return $headers;
    }

    /**
     * Sanitize body to remove sensitive data.
     */
    private function sanitizeBody(array $body): array
    {
        $sensitiveKeys = ['password', 'token', 'api_key', 'secret', 'credit_card', 'cvv'];
        foreach ($body as $key => $value) {
            if (in_array(strtolower($key), $sensitiveKeys)) {
                $body[$key] = '***REDACTED***';
            }
        }
        return $body;
    }

    /**
     * Truncate long data for readable logs.
     */
    private function truncateData(mixed $data, int $maxLength = 500): mixed
    {
        if (is_array($data)) {
            // Truncate array items
            if (count($data) > 20) {
                return array_slice($data, 0, 20) + ['__truncated__' => count($data) - 20 . ' more items'];
            }
            // Recursively truncate nested arrays
            foreach ($data as $key => $value) {
                if (is_array($value)) {
                    $data[$key] = $this->truncateData($value, $maxLength);
                } elseif (is_string($value) && strlen($value) > $maxLength) {
                    $data[$key] = substr($value, 0, $maxLength) . '...';
                }
            }
        } elseif (is_string($data) && strlen($data) > $maxLength) {
            $data = substr($data, 0, $maxLength) . '...';
        }

        return $data;
    }
}