<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        // Admin role has absolute access
        if ($user->hasRole('admin') || $user->roles()->where('slug', 'admin')->exists()) {
            return $next($request);
        }

        // Dynamic resource to permission mapping
        $path = $request->path();
        $permission = null;

        if (str_contains($path, '/news') || str_contains($path, 'product-news-thumbnail') || str_contains($path, 'blog-thumbnail')) {
            $permission = 'manage-blog';
        } elseif (str_contains($path, 'admin/products') || str_contains($path, 'product-variants') || str_contains($path, 'admin/categories')) {
            // Allow read-only GET requests to products/categories for all administrative/staff members
            try {
                if ($request->isMethod('get') && $user->hasAnyPermission(['manage-products', 'manage-orders', 'manage-coupons', 'manage-blog'])) {
                    return $next($request);
                }
            } catch (\Throwable) {
                // Fail-safe fallback to standard check
            }
            $permission = 'manage-products';
        } elseif (str_contains($path, 'admin/orders')) {
            $permission = 'manage-orders';
        } elseif (str_contains($path, 'admin/coupons')) {
            $permission = 'manage-coupons';
        } elseif (str_contains($path, 'admin/blog-posts') || str_contains($path, 'admin/blog-categories')) {
            $permission = 'manage-blog';
        } elseif (str_contains($path, 'admin/users') || str_contains($path, 'admin/roles')) {
            $permission = 'manage-users';
        } elseif (str_contains($path, 'admin/settings') || str_contains($path, 'admin/shipping')) {
            $permission = 'manage-settings';
        }

        if (!$permission) {
            // General admin dashboard or other assets check
            try {
                if ($user->hasAnyPermission(['manage-products', 'manage-orders', 'manage-coupons', 'manage-blog', 'manage-users', 'manage-settings'])) {
                    return $next($request);
                }
            } catch (\Throwable) {
                // Missing permissions table/record
            }
            return response()->json(['message' => 'Forbidden - Requires Admin privileges'], 403);
        }

        try {
            if (!$user->hasPermissionTo($permission)) {
                return response()->json([
                    'message' => "Bạn không có quyền thực hiện hành động này. Yêu cầu quyền: {$permission}."
                ], 403);
            }
        } catch (\Throwable) {
            return response()->json([
                'message' => "Bạn không có quyền thực hiện hành động này. Yêu cầu quyền: {$permission}."
            ], 403);
        }

        return $next($request);
    }
}
