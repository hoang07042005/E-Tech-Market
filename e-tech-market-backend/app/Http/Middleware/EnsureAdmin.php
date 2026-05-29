<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdmin
{
    /**
     * Map route name prefixes to the required permission slug.
     * Routes are registered under Route::prefix('admin')->middleware('admin'),
     * so every route name already starts with "admin.".
     */
    private const ROUTE_PERMISSION_MAP = [
        'admin.orders'           => 'manage-orders',
        'admin.products'         => 'manage-products',
        'admin.product-variants' => 'manage-products',
        'admin.categories'       => 'manage-products',
        'admin.video-categories' => 'manage-products',
        'admin.videos'           => 'manage-products',
        'admin.shop-qna'         => 'manage-products',
        'admin.coupons'          => 'manage-coupons',
        'admin.blog-posts'       => 'manage-blog',
        'admin.blog-categories'  => 'manage-blog',
        'admin.news'             => 'manage-blog',
        'admin.uploads'          => 'manage-blog',
        'admin.users'            => 'manage-users',
        'admin.roles'            => 'manage-users',
        'admin.settings'         => 'manage-settings',
        'admin.shipping'         => 'manage-settings',
        'admin.banners'          => 'manage-settings',
        'admin.flash-sales'      => 'manage-products',
        'admin.reviews'          => 'manage-products',
        'admin.contact-messages' => 'manage-settings',
        'admin.dashboard'        => null, // any admin permission
    ];

    /**
     * Permissions that grant read-only GET access to product/category endpoints
     * (e.g. staff who manage orders still need to browse products).
     */
    private const READ_ONLY_CROSS_PERMISSIONS = [
        'manage-products' => ['manage-orders', 'manage-coupons', 'manage-blog'],
    ];

    public function handle(Request $request, Closure $next, ?string $requiredPermission = null): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        // Admin role has absolute access
        if ($user->hasRole('admin') || $user->roles()->where('slug', 'admin')->exists()) {
            return $next($request);
        }

        // If the middleware was invoked with an explicit permission parameter
        // e.g. ->middleware('admin:manage-orders'), use that directly.
        $permission = $requiredPermission;

        // Otherwise resolve permission from route name
        if (!$permission) {
            $permission = $this->resolvePermissionFromRoute($request);
        }

        if (!$permission) {
            // General admin dashboard or other generic admin endpoints
            try {
                if ($user->hasAnyPermission([
                    'manage-products', 'manage-orders', 'manage-coupons',
                    'manage-blog', 'manage-users', 'manage-settings',
                ])) {
                    return $next($request);
                }
            } catch (\Throwable) {
                // Missing permissions table/record
            }
            return response()->json(['message' => 'Forbidden - Requires Admin privileges'], 403);
        }

        // Allow cross-permission read-only GET access
        if ($request->isMethod('get') && isset(self::READ_ONLY_CROSS_PERMISSIONS[$permission])) {
            try {
                if ($user->hasAnyPermission(
                    array_merge([$permission], self::READ_ONLY_CROSS_PERMISSIONS[$permission])
                )) {
                    return $next($request);
                }
            } catch (\Throwable) {
                // fall through to standard check
            }
        }

        try {
            if (!$user->hasPermissionTo($permission)) {
                return response()->json([
                    'message' => "Bạn không có quyền thực hiện hành động này. Yêu cầu quyền: {$permission}.",
                ], 403);
            }
        } catch (\Throwable) {
            return response()->json([
                'message' => "Bạn không có quyền thực hiện hành động này. Yêu cầu quyền: {$permission}.",
            ], 403);
        }

        return $next($request);
    }

    /**
     * Resolve the required permission from the current route name.
     * Falls back to path-based matching only as a last resort.
     */
    private function resolvePermissionFromRoute(Request $request): ?string
    {
        $routeName = $request->route()?->getName();

        if ($routeName) {
            // Match the longest prefix first
            foreach (self::ROUTE_PERMISSION_MAP as $prefix => $perm) {
                if (str_starts_with($routeName, $prefix)) {
                    return $perm;
                }
            }
        }

        return null;
    }
}
