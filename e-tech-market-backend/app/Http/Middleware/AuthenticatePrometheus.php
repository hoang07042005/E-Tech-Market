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
        $username = (string) config('metrics.prometheus_username', env('PROMETHEUS_USERNAME', 'prometheus'));
        $password = (string) config('metrics.prometheus_password', env('PROMETHEUS_PASSWORD', ''));

        // If password is not configured, deny access by default
        if ($password === '') {
            return response()->json([
                'status' => 'error',
                'message' => 'Prometheus authentication is not properly configured.',
            ], Response::HTTP_FORBIDDEN);
        }

        // Get Authorization header
        $auth = $request->header('Authorization');

        if (!$auth || !str_starts_with($auth, 'Basic ')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Không có quyền truy cập - Yêu cầu xác thực cơ bản.',
            ], Response::HTTP_UNAUTHORIZED, [
                'WWW-Authenticate' => 'Basic realm="Prometheus Metrics"',
            ]);
        }

        // Decode base64 credentials
        [$providedUsername, $providedPassword] = explode(':', base64_decode(substr($auth, 6)), 2) + [null, null];

        // Constant-time string verification to prevent timing attacks
        if (!hash_equals($username, (string) $providedUsername) || !hash_equals($password, (string) $providedPassword)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Thông tin đăng nhập không hợp lệ.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        return $next($request);
    }
}
