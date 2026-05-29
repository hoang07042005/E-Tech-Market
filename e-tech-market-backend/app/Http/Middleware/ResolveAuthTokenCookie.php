<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ResolveAuthTokenCookie
{
    public function handle(Request $request, Closure $next)
    {
        if (! $request->headers->has('Authorization') && $request->cookie('auth_token')) {
            $request->headers->set('Authorization', 'Bearer '.$request->cookie('auth_token'));
        }

        return $next($request);
    }
}
