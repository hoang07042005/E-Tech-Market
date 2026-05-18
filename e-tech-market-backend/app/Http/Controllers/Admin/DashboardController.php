<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ProductShopQna;
use App\Models\Review;
use App\Models\User;
use App\Models\OrderReturnRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function stats(Request $request): JsonResponse
    {
        Carbon::setLocale('vi');
        $now = Carbon::now();
        $from30d = $now->copy()->subDays(30);
        $from7d = $now->copy()->subDays(7);
        $toEnd = $now->copy()->endOfDay();

        $range = (string) $request->query('range', 'month'); // 7d | 30d | month
        if (! in_array($range, ['7d', '30d', 'month'], true)) {
            $range = 'month';
        }

        $analyticsStart = match ($range) {
            '7d' => $now->copy()->subDays(6)->startOfDay(),
            '30d' => $now->copy()->subDays(29)->startOfDay(),
            default => $now->copy()->startOfMonth()->startOfDay(),
        };

        $paidOrders30d = Order::query()
            ->where('payment_status', 'paid')
            ->where('created_at', '>=', $from30d)
            ->count();

        $revenue30d = (float) Order::query()
            ->where('payment_status', 'paid')
            ->where('created_at', '>=', $from30d)
            ->sum('total_amount');

        // "Đơn hàng hiện tại": đơn chưa hoàn tất (status != completed/canceled) trong 30 ngày gần đây
        // (Dự án hiện chưa có chuẩn status đầy đủ; fallback an toàn là đếm pending/processing nếu có)
        $currentOrders = Order::query()
            ->whereIn('status', ['pending', 'processing'])
            ->where('created_at', '>=', $from30d)
            ->count();

        $totalProducts = Product::query()->count();

        $newCustomers7d = User::query()
            ->where('created_at', '>=', $from7d)
            ->count();

        $avgOrderValue30d = $paidOrders30d > 0 ? ($revenue30d / $paidOrders30d) : 0.0;

        $lowStockThreshold = 10;
        $lowStockVariants = ProductVariant::query()
            ->where('stock_quantity', '<=', $lowStockThreshold)
            ->count();

        $lowStockProducts = (int) ProductVariant::query()
            ->where('stock_quantity', '<=', $lowStockThreshold)
            ->distinct('product_id')
            ->count('product_id');

        $pendingReviews = (int) Review::query()
            ->where('status', 'pending')
            ->count();

        $pendingSupport = (int) ProductShopQna::query()
            ->whereNull('answer')
            ->count();

        $pendingReturnRequests = (int) OrderReturnRequest::query()
            ->where('status', 'pending')
            ->count();

        $statusLabel = static function (?string $s): array {
            $s = $s ? strtolower($s) : '';
            return match ($s) {
                'completed', 'success', 'delivered' => ['Hoàn tất', 'ok'],
                'canceled', 'cancelled', 'failed' => ['Đã hủy', 'bad'],
                'pending', 'processing', 'confirming', 'shipping' => ['Đang chờ', 'wait'],
                default => [$s ? $s : 'Đang chờ', 'wait'],
            };
        };

        $recentOrders = Order::query()
            ->with(['items:id,order_id,product_name_snapshot,quantity'])
            ->with(['user:id,name,avatar_url'])
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(static function (Order $o) use ($statusLabel) {
                $items = $o->items ?? collect();
                $firstName = (string) ($items->first()->product_name_snapshot ?? '');
                $itemsCount = (int) $items->count();
                $productText = $firstName ?: '—';
                if ($itemsCount > 1) {
                    $productText .= ' +' . ($itemsCount - 1) . ' SP';
                }

                $customerName = (string) ($o->user?->name ?: $o->shipping_name ?: '—');
                $avatarUrl = $o->user?->avatar_url ? (string) $o->user->avatar_url : null;
                [$label, $tone] = $statusLabel((string) $o->status);

                return [
                    'id' => (int) $o->id,
                    'order_code' => (string) ($o->order_code ?: ('ET-' . $o->id)),
                    'customer_name' => $customerName,
                    'customer_avatar_url' => $avatarUrl,
                    'product' => $productText,
                    'total_amount' => (float) ($o->total_amount ?? 0),
                    'created_at' => $o->created_at ? $o->created_at->toISOString() : null,
                    'created_date' => $o->created_at ? $o->created_at->format('d/m/Y') : '',
                    'status' => (string) ($o->status ?? ''),
                    'status_label' => $label,
                    'status_tone' => $tone, // ok | wait | bad
                ];
            })
            ->values()
            ->all();

        // Recent activities (3 rows) — best-effort based on existing data
        $recentActivities = [];
        $latestPaid = Order::query()
            ->where('payment_status', 'paid')
            ->orderByDesc('updated_at')
            ->first();
        if ($latestPaid) {
            $recentActivities[] = [
                'dot' => 'ok',
                'title' => '#' . $latestPaid->order_code,
                'desc' => 'đã thanh toán thành công',
                'time' => Carbon::parse($latestPaid->updated_at)->diffForHumans(),
            ];
        }

        $latestProduct = Product::query()
            ->orderByDesc('updated_at')
            ->first();
        if ($latestProduct) {
            $recentActivities[] = [
                'dot' => 'info',
                'title' => $latestProduct->name,
                'desc' => 'đã được cập nhật',
                'time' => Carbon::parse($latestProduct->updated_at)->diffForHumans(),
            ];
        }

        $latestQna = ProductShopQna::query()
            ->whereNull('answer')
            ->orderByDesc('created_at')
            ->first();
        if ($latestQna) {
            $recentActivities[] = [
                'dot' => 'warn',
                'title' => '#HQA-' . $latestQna->id,
                'desc' => 'có câu hỏi cần phản hồi',
                'time' => Carbon::parse($latestQna->created_at)->diffForHumans(),
            ];
        }

        $recentActivities = array_slice($recentActivities, 0, 3);

        $topRated = DB::table('products')
            ->join('reviews', 'reviews.product_id', '=', 'products.id')
            ->whereNull('products.deleted_at')
            ->whereNull('reviews.deleted_at')
            ->where('reviews.status', '=', 'approved')
            ->groupBy('products.id', 'products.name', 'products.slug', 'products.main_image_url')
            ->select([
                'products.id',
                'products.name',
                'products.slug',
                'products.main_image_url',
                DB::raw('AVG(reviews.rating) as avg_rating'),
                DB::raw('COUNT(reviews.id) as reviews_count'),
            ])
            ->orderByDesc('avg_rating')
            ->orderByDesc('reviews_count')
            ->limit(3)
            ->get()
            ->map(static function ($row) {
                return [
                    'id' => (int) $row->id,
                    'name' => (string) $row->name,
                    'slug' => (string) $row->slug,
                    'main_image_url' => $row->main_image_url ? (string) $row->main_image_url : null,
                    'avg_rating' => round((float) $row->avg_rating, 1),
                    'reviews_count' => (int) $row->reviews_count,
                ];
            })
            ->values()
            ->all();

        // Analytics: revenue by day for selected range
        $revenueByDay = Order::query()
            ->where('payment_status', 'paid')
            ->whereBetween('created_at', [$analyticsStart, $toEnd])
            ->selectRaw('DATE(created_at) as d, SUM(total_amount) as sum')
            ->groupBy('d')
            ->pluck('sum', 'd')
            ->toArray();

        // Build 7 buckets (always) across selected range (no placeholder labels)
        $series = [];
        $start = $analyticsStart->copy()->startOfDay();
        $end = $toEnd->copy()->endOfDay();
        $totalDays = max(0, $start->diffInDays($end));

        $points = [];
        for ($i = 0; $i < 7; $i++) {
            $offset = (int) floor(($totalDays * $i) / 6);
            $points[] = $start->copy()->addDays($offset)->startOfDay();
        }

        // Ensure strictly increasing (can happen early-month totalDays < 6)
        for ($i = 1; $i < 7; $i++) {
            if ($points[$i]->lte($points[$i - 1])) {
                $points[$i] = $points[$i - 1]->copy()->addDay()->startOfDay();
            }
        }
        // Clamp to end
        for ($i = 0; $i < 7; $i++) {
            if ($points[$i]->gt($end)) {
                $points[$i] = $end->copy()->startOfDay();
            }
        }

        for ($i = 0; $i < 7; $i++) {
            $bucketStart = $points[$i]->copy()->startOfDay();
            $bucketEnd = ($i < 6 ? $points[$i + 1]->copy()->subDay()->endOfDay() : $end->copy());
            if ($bucketEnd->lt($bucketStart)) {
                $bucketEnd = $bucketStart->copy()->endOfDay();
            }

            $sum = 0.0;
            $cur = $bucketStart->copy();
            while ($cur->lte($bucketEnd)) {
                $k = $cur->toDateString();
                if (isset($revenueByDay[$k])) {
                    $sum += (float) $revenueByDay[$k];
                }
                $cur->addDay();
            }

            $label = $bucketStart->format('d/m');
            $series[] = [
                'date' => $bucketStart->toDateString(),
                'label' => $label,
                'value' => $sum,
            ];
        }

        // Analytics: top categories by revenue (selected range, paid orders)
        $catRows = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->leftJoin('categories', 'categories.id', '=', 'products.category_id')
            ->whereNull('products.deleted_at')
            ->where('orders.payment_status', '=', 'paid')
            ->where('orders.created_at', '>=', $analyticsStart)
            ->groupBy('categories.name')
            ->select([
                DB::raw("COALESCE(categories.name, 'Khác') as name"),
                DB::raw('SUM(order_items.total_price) as sum'),
            ])
            ->orderByDesc('sum')
            ->limit(6)
            ->get();

        $catTotal = (float) $catRows->sum('sum');
        $topCats = $catRows->map(static function ($r) use ($catTotal) {
            $sum = (float) $r->sum;
            $pct = $catTotal > 0 ? round(($sum / $catTotal) * 100) : 0;
            return ['name' => (string) $r->name, 'pct' => $pct];
        })->values()->all();

        $recentReviews = Review::query()
            ->with(['user:id,name,avatar_url'])
            ->where('status', '=', 'approved')
            ->orderByDesc('created_at')
            ->limit(2)
            ->get()
            ->map(static function (Review $r) {
                $name = (string) ($r->user?->name ?: '—');
                $avatarUrl = $r->user?->avatar_url ? (string) $r->user->avatar_url : null;
                $time = $r->created_at ? $r->created_at->diffForHumans() : '';
                return [
                    'id' => (int) $r->id,
                    'user_name' => $name,
                    'user_avatar_url' => $avatarUrl,
                    'rating' => (int) ($r->rating ?? 0),
                    'comment' => (string) ($r->comment ?? ''),
                    'time' => (string) $time,
                ];
            })
            ->values()
            ->all();

        $vipOf = static function (float $spent): array {
            if ($spent >= 40_000_000) return ['VIP GOLD', 'gold'];
            if ($spent >= 20_000_000) return ['VIP SILVER', 'silver'];
            return ['VIP BRONZE', 'bronze'];
        };

        $topCustomers = DB::table('orders')
            ->join('users', 'users.id', '=', 'orders.user_id')
            ->whereNull('users.deleted_at')
            ->whereNotNull('orders.user_id')
            ->where('orders.payment_status', '=', 'paid')
            ->groupBy('orders.user_id', 'users.name', 'users.avatar_url')
            ->select([
                'orders.user_id as user_id',
                'users.name as name',
                'users.avatar_url as avatar_url',
                DB::raw('SUM(orders.total_amount) as spent'),
                DB::raw('COUNT(orders.id) as orders_count'),
            ])
            ->orderByDesc('spent')
            ->limit(3)
            ->get()
            ->map(static function ($row) use ($vipOf) {
                $spent = (float) $row->spent;
                [$vipLabel, $vipTone] = $vipOf($spent);
                return [
                    'user_id' => (int) $row->user_id,
                    'name' => (string) ($row->name ?? '—'),
                    'avatar_url' => $row->avatar_url ? (string) $row->avatar_url : null,
                    'spent' => $spent,
                    'orders_count' => (int) $row->orders_count,
                    'vip_label' => $vipLabel,
                    'vip_tone' => $vipTone, // gold | silver | bronze
                ];
            })
            ->values()
            ->all();

        return response()->json([
            'range' => [
                'from_30d' => $from30d->toISOString(),
                'from_7d' => $from7d->toISOString(),
            ],
            'kpi' => [
                'revenue_30d' => $revenue30d,
                'current_orders' => $currentOrders,
                'total_products' => $totalProducts,
                'new_customers_7d' => $newCustomers7d,
                'avg_order_value_30d' => $avgOrderValue30d,
                'low_stock_variants' => $lowStockVariants,
                'low_stock_threshold' => $lowStockThreshold,
                'paid_orders_30d' => $paidOrders30d,
            ],
            'quick_tasks' => [
                'pending_reviews' => $pendingReviews,
                'low_stock_products' => $lowStockProducts,
                'pending_support' => $pendingSupport,
                'pending_return_requests' => $pendingReturnRequests,
            ],
            'recent_activities' => $recentActivities,
            'top_rated_products' => $topRated,
            'analytics' => [
                'range' => $range,
                'revenue_7d' => $series,
                'top_categories_30d' => $topCats,
            ],
            'recent_orders' => $recentOrders,
            'recent_reviews' => $recentReviews,
            'top_customers' => $topCustomers,
        ]);
    }
}

