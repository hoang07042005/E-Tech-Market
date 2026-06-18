<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ResolveAuthTokenCookie
{
    public function handle(Request $request, Closure $next)
    {
        // Debug: log incoming auth
        $existingAuth = $request->headers->get('Authorization');
        \Illuminate\Support\Facades\Log::debug('[cookie] Incoming Auth: ' . ($existingAuth ? 'present' : 'null'));

        // Check for either auth_token or sanctum_token cookie
        if (!$request->headers->has('Authorization')) {
            $sanctumToken = $request->cookie('sanctum_token');
            $authToken = $request->cookie('auth_token');
            \Illuminate\Support\Facades\Log::debug('[cookie] sanctum_token: ' . ($sanctumToken ? 'present ('.substr($sanctumToken, 0, 20).'...)' : 'null'));
            \Illuminate\Support\Facades\Log::debug('[cookie] auth_token: ' . ($authToken ? 'present ('.substr($authToken, 0, 20).'...)' : 'null'));

            $token = $sanctumToken ?? $authToken;
            if ($token) {
                $request->headers->set('Authorization', 'Bearer ' . $token);
                \Illuminate\Support\Facades\Log::debug('[cookie] Set Authorization from cookie');
            }
        }

        return $next($request);
    }
}
