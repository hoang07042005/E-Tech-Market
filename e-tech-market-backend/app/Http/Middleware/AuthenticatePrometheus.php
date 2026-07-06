<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

/**
 * Middleware to authenticate Prometheus metrics endpoint
 * Uses static credentials from config
 */
class AuthenticatePrometheus
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function handle(Request $request, Closure $next): SymfonyResponse
    {
        $username = config('metrics.prometheus_username', 'prometheus');
        $password = config('metrics.prometheus_password', env('PROMETHEUS_PASSWORD', 'prometheus_secure_password_123'));

        // Get Authorization header
        $auth = $request->header('Authorization');

        if (!$auth || !str_starts_with($auth, 'Basic ')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized - Basic Authentication required',
            ], Response::HTTP_UNAUTHORIZED, [
                'WWW-Authenticate' => 'Basic realm="Prometheus Metrics"',
            ]);
        }

        // Decode base64 credentials
        [$providedUsername, $providedPassword] = explode(':', base64_decode(substr($auth, 6)), 2) + [null, null];

        // Verify credentials
        if ($providedUsername !== $username || $providedPassword !== $password) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invalid credentials.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        return $next($request);
    }
}
