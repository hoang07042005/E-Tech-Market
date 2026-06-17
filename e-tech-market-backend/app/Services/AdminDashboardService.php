<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderReturnRequest;
use App\Models\Product;
use App\Models\ProductShopQna;
use App\Models\ProductVariant;
use App\Models\Review;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class AdminDashboardService
{
    /**
     * Gather all dashboard statistics.
     */
    public function getStats(string $range, ?string $startDateParam, ?string $endDateParam, string $resolution): array
    {
        Carbon::setLocale('vi');

        if (! in_array($range, ['7d', '30d', 'month', 'custom'], true)) {
            $range = 'month';
        }

        $cacheKey = 'admin_dashboard_stats_'.$range.'_'.$resolution;
        if ($range === 'custom') {
            $cacheKey .= '_'.md5($startDateParam.'_'.$endDateParam);
        }

        return Cache::tags(['admin_dashboard'])->remember($cacheKey, 600, function () use ($range, $startDateParam, $endDateParam, $resolution) {
            $now = Carbon::now();
            $from30d = $now->copy()->subDays(30);
            $from7d = $now->copy()->subDays(7);
            $toEnd = $now->copy()->endOfDay();

            $analyticsStart = $this->resolveAnalyticsStart($range, $startDateParam, $endDateParam, $now, $toEnd);

            $kpi = $this->buildKpi($from30d, $from7d, $now);
            $quickTasks = $this->buildQuickTasks();
            $recentOrders = $this->buildRecentOrders();
            $recentActivities = $this->buildRecentActivities();
            $topRated = $this->buildTopRatedProducts();
            $series = $this->buildAnalyticsSeries($analyticsStart, $toEnd, $resolution);
            $topCats = $this->buildTopCategories($analyticsStart, $toEnd);
            $recentReviews = $this->buildRecentReviews();
            $topCustomers = $this->buildTopCustomers();

            return [
                'range' => [
                    'from_30d' => $from30d->toISOString(),
                    'from_7d' => $from7d->toISOString(),
                ],
                'kpi' => $kpi,
                'quick_tasks' => $quickTasks,
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
            ];
        });
    }

    // ─── Private Helpers ─────────────────────────────────────────────

    private function resolveAnalyticsStart(string $range, ?string $startDateParam, ?string $endDateParam, Carbon $now, Carbon &$toEnd): Carbon
    {
        if ($range === 'custom' && $startDateParam && $endDateParam) {
            try {
                $toEnd = Carbon::parse($endDateParam)->endOfDay();

                return Carbon::parse($startDateParam)->startOfDay();
            } catch (\Exception $e) {
                return $now->copy()->startOfMonth()->startOfDay();
            }
        }

        return match ($range) {
            '7d' => $now->copy()->subDays(6)->startOfDay(),
            '30d' => $now->copy()->subDays(29)->startOfDay(),
            default => $now->copy()->startOfMonth()->startOfDay(),
        };
    }

    private function buildKpi(Carbon $from30d, Carbon $from7d, Carbon $now): array
    {
        $paidOrders30d = Order::query()
            ->where('payment_status', 'paid')
            ->where('created_at', '>=', $from30d)
            ->count();

        $revenue30d = (float) Order::query()
            ->where('payment_status', 'paid')
            ->where('created_at', '>=', $from30d)
            ->sum('total_amount');

        $currentOrders = Order::query()
            ->whereIn('status', ['pending', 'processing'])
            ->where('created_at', '>=', $from30d)
            ->count();

        $ordersToday = Order::query()
            ->whereDate('created_at', $now->toDateString())
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

        return [
            'revenue_30d' => $revenue30d,
            'current_orders' => $currentOrders,
            'total_products' => $totalProducts,
            'new_customers_7d' => $newCustomers7d,
            'avg_order_value_30d' => $avgOrderValue30d,
            'low_stock_variants' => $lowStockVariants,
            'low_stock_threshold' => $lowStockThreshold,
            'paid_orders_30d' => $paidOrders30d,
            'orders_today' => $ordersToday,
        ];
    }

    private function buildQuickTasks(): array
    {
        $lowStockThreshold = 10;
        $lowStockProducts = (int) ProductVariant::query()
            ->where('stock_quantity', '<=', $lowStockThreshold)
            ->distinct('product_id')
            ->count('product_id');

        return [
            'pending_reviews' => (int) Review::query()->where('status', 'pending')->count(),
            'low_stock_products' => $lowStockProducts,
            'pending_support' => (int) ProductShopQna::query()->whereNull('answer')->count(),
            'pending_return_requests' => (int) OrderReturnRequest::query()->where('status', 'pending')->count(),
        ];
    }

    private function buildRecentOrders(): array
    {
        $statusLabel = $this->statusLabelFn();

        return Order::query()
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
                    $productText .= ' +'.($itemsCount - 1).' SP';
                }

                $customerName = (string) ($o->user?->name ?: $o->shipping_name ?: '—');
                $avatarUrl = $o->user?->avatar_url ? (string) $o->user->avatar_url : null;
                [$label, $tone] = $statusLabel((string) $o->status);

                return [
                    'id' => (int) $o->id,
                    'order_code' => (string) ($o->order_code ?: ('ET-'.$o->id)),
                    'customer_name' => $customerName,
                    'customer_avatar_url' => $avatarUrl,
                    'product' => $productText,
                    'total_amount' => (float) ($o->total_amount ?? 0),
                    'created_at' => $o->created_at ? $o->created_at->toISOString() : null,
                    'created_date' => $o->created_at ? $o->created_at->format('d/m/Y') : '',
                    'status' => (string) ($o->status ?? ''),
                    'status_label' => $label,
                    'status_tone' => $tone,
                ];
            })
            ->values()
            ->all();
    }

    private function buildRecentActivities(): array
    {
        $recentActivities = [];

        $latestPaid = Order::query()
            ->where('payment_status', 'paid')
            ->orderByDesc('updated_at')
            ->first();
        if ($latestPaid) {
            $recentActivities[] = [
                'dot' => 'ok',
                'title' => '#'.$latestPaid->order_code,
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
                'title' => '#HQA-'.$latestQna->id,
                'desc' => 'có câu hỏi cần phản hồi',
                'time' => Carbon::parse($latestQna->created_at)->diffForHumans(),
            ];
        }

        return array_slice($recentActivities, 0, 3);
    }

    private function buildTopRatedProducts(): array
    {
        return DB::table('products')
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
    }

    private function buildAnalyticsSeries(Carbon $analyticsStart, Carbon $toEnd, string $resolution): array
    {
        $analyticsByDay = Order::query()
            ->where('payment_status', 'paid')
            ->whereBetween('created_at', [$analyticsStart, $toEnd])
            ->selectRaw('DATE(created_at) as d, SUM(total_amount) as sum, COUNT(id) as cnt')
            ->groupBy('d')
            ->get()
            ->keyBy('d')
            ->toArray();

        $itemsSoldByDay = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.payment_status', '=', 'paid')
            ->whereBetween('orders.created_at', [$analyticsStart, $toEnd])
            ->selectRaw('DATE(orders.created_at) as d, SUM(order_items.quantity) as qty')
            ->groupBy('d')
            ->get()
            ->keyBy('d')
            ->toArray();

        $start = $analyticsStart->copy()->startOfDay();
        $end = $toEnd->copy()->endOfDay();
        $cur = $start->copy();
        $buckets = [];

        while ($cur->lte($end)) {
            $k = $cur->toDateString();

            if ($resolution === 'month') {
                $bucketKey = $cur->format('Y-m');
                $bucketLabel = 'Tháng '.$cur->format('m/Y');
                $bucketDate = $cur->copy()->startOfMonth()->toDateString();
            } elseif ($resolution === 'week') {
                $weekStart = $cur->copy()->startOfWeek();
                $weekEnd = $cur->copy()->endOfWeek();
                $bucketKey = $weekStart->format('Y-m-d');
                $bucketLabel = $weekStart->format('d/m').' - '.$weekEnd->format('d/m');
                $bucketDate = $bucketKey;
            } else {
                $bucketKey = $k;
                $bucketLabel = $cur->format('d/m');
                $bucketDate = $k;
            }

            if (! isset($buckets[$bucketKey])) {
                $buckets[$bucketKey] = [
                    'date' => $bucketDate,
                    'label' => $bucketLabel,
                    'value' => 0.0,
                    'orders' => 0,
                    'items_sold' => 0,
                ];
            }

            if (isset($analyticsByDay[$k])) {
                $dayData = $analyticsByDay[$k];
                $buckets[$bucketKey]['value'] += (float) ($dayData['sum'] ?? 0);
                $buckets[$bucketKey]['orders'] += (int) ($dayData['cnt'] ?? 0);
            }
            if (isset($itemsSoldByDay[$k])) {
                $buckets[$bucketKey]['items_sold'] += (int) ($itemsSoldByDay[$k]->qty ?? 0);
            }

            $cur->addDay();
        }

        return array_values($buckets);
    }

    private function buildTopCategories(Carbon $analyticsStart, Carbon $toEnd): array
    {
        $catRows = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->leftJoin('categories', 'categories.id', '=', 'products.category_id')
            ->whereNull('products.deleted_at')
            ->where('orders.payment_status', '=', 'paid')
            ->whereBetween('orders.created_at', [$analyticsStart, $toEnd])
            ->groupBy('categories.name')
            ->select([
                DB::raw("COALESCE(categories.name, 'Khác') as name"),
                DB::raw('SUM(order_items.total_price) as sum'),
            ])
            ->orderByDesc('sum')
            ->limit(10)
            ->get();

        $catTotal = (float) $catRows->sum('sum');

        return $catRows->map(static function ($r) use ($catTotal) {
            $sum = (float) $r->sum;
            $pct = $catTotal > 0 ? round(($sum / $catTotal) * 100) : 0;

            return ['name' => (string) $r->name, 'pct' => $pct];
        })->values()->all();
    }

    private function buildRecentReviews(): array
    {
        return Review::query()
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
    }

    private function buildTopCustomers(): array
    {
        $vipOf = static function (float $spent): array {
            if ($spent >= 40_000_000) {
                return ['VIP GOLD', 'gold'];
            }
            if ($spent >= 20_000_000) {
                return ['VIP SILVER', 'silver'];
            }

            return ['VIP BRONZE', 'bronze'];
        };

        return DB::table('orders')
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
                    'vip_tone' => $vipTone,
                ];
            })
            ->values()
            ->all();
    }

    private function statusLabelFn(): \Closure
    {
        return static function (?string $s): array {
            $s = $s ? strtolower($s) : '';

            return match ($s) {
                'completed', 'success', 'delivered' => ['Hoàn tất', 'ok'],
                'cancelled', 'failed' => ['Đã hủy', 'bad'],
                'pending', 'processing', 'confirming', 'shipping' => ['Đang chờ', 'wait'],
                default => [$s ? $s : 'Đang chờ', 'wait'],
            };
        };
    }
}
