<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\Coupon;
use App\Services\GeminiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ChatbotController extends Controller
{
    private GeminiService $gemini;

    private const SYSTEM_PROMPT = <<<'PROMPT'
Bạn là "E-Tech Bot" — chuyên viên tư vấn công nghệ thân thiện và chuyên nghiệp của E-Tech Market, sàn thương mại điện tử chuyên về đồ công nghệ tại Việt Nam.

NHIỆM VỤ:
- Tư vấn sản phẩm công nghệ (laptop, điện thoại, PC, màn hình, phụ kiện...) dựa trên ngân sách và nhu cầu khách hàng
- So sánh cấu hình, thông số kỹ thuật giữa các sản phẩm
- Giải đáp về chính sách bảo hành, đổi trả, vận chuyển của E-Tech Market
- Hỗ trợ tra cứu trạng thái đơn hàng

QUY TẮC:
1. Luôn trả lời bằng tiếng Việt, giọng thân thiện, chuyên nghiệp
2. Khi gợi ý sản phẩm, CHỈ gợi ý từ dữ liệu hệ thống được cung cấp (không bịa sản phẩm)
3. Nếu không có sản phẩm phù hợp trong dữ liệu, thành thật nói "Hiện tại E-Tech Market chưa có sản phẩm phù hợp với yêu cầu này"
4. Từ chối trả lời các chủ đề: chính trị, tôn giáo, nội dung nhạy cảm, không liên quan đến công nghệ/mua sắm
5. Giữ câu trả lời ngắn gọn, dưới 300 từ
6. Khi liệt kê sản phẩm, dùng format: "📱 [Tên SP] - Giá: [xxx]đ" để dễ đọc
7. Luôn kết thúc bằng câu hỏi mở để tiếp tục hỗ trợ

CHÍNH SÁCH E-TECH MARKET:
- Bảo hành chính hãng theo nhà sản xuất (12-24 tháng tùy sản phẩm)
- Đổi trả miễn phí trong 7 ngày nếu lỗi từ nhà sản xuất
- Giao hàng toàn quốc, miễn phí nội thành TP.HCM & Hà Nội cho đơn trên 500.000đ
- Thanh toán: COD, VNPay, MoMo, chuyển khoản ngân hàng
PROMPT;

    public function __construct(GeminiService $gemini)
    {
        $this->gemini = $gemini;
    }

    /**
     * Handle chatbot message from the mobile app.
     */
    public function message(Request $request): JsonResponse
    {
        $request->validate([
            'message' => 'required|string|max:1000',
            'history' => 'sometimes|array|max:20',
            'history.*.role' => 'required_with:history|string|in:user,model',
            'history.*.text' => 'required_with:history|string|max:2000',
            'phone_number' => 'nullable|string|max:20',
            'product_id' => 'nullable|integer|exists:products,id',
        ]);

        $userMessage = trim($request->input('message'));
        $history = $request->input('history', []);
        $user = $request->user();
        $phoneNumber = $request->input('phone_number');
        $productId = $request->input('product_id');

        // Detect intent
        $intent = $this->detectIntent($userMessage);

        $context = '';
        $products = [];
        $order = null;
        $couponCode = null;

        switch ($intent) {
            case 'order_tracking':
                $result = $this->handleOrderTracking($userMessage, $user, $phoneNumber);
                $order = $result['order'];
                $context = $result['context'];
                break;

            case 'stock_check':
            case 'price_query':
            case 'product_consultation':
            case 'product_comparison':
                $result = $this->handleProductQuery($userMessage, $intent);
                $products = $result['products'];
                $context = $result['context'];
                break;

            case 'warranty_policy':
                $context = $this->getWarrantyContext();
                break;

            case 'coupon_discount':
                $activeCoupon = $this->getActiveCoupon();
                if ($activeCoupon) {
                    $context = "Chương trình khuyến mãi hiện tại:\n";
                    $context .= "- Mã giảm giá: {$activeCoupon->code}\n";
                    $context .= "- Mức giảm: " . number_format($activeCoupon->value) . ($activeCoupon->coupon_type === 'percentage' ? '%' : 'đ') . "\n";
                    $context .= "- Đơn tối thiểu: " . number_format($activeCoupon->min_order_amount) . "đ\n";
                    $couponCode = $activeCoupon->code;
                } else {
                    $context = "Thông báo khuyến mãi: Hiện tại E-Tech Market đang không có chương trình giảm giá nào.";
                }
                break;

            case 'flashsale':
                $result = $this->handleFlashsaleQuery();
                $products = $result['products'];
                $context = $result['context'];
                break;

            case 'top_rated':
                $result = $this->handleTopRatedQuery();
                $products = $result['products'];
                $context = $result['context'];
                break;

            case 'discounted_products':
                $result = $this->handleDiscountedQuery();
                $products = $result['products'];
                $context = $result['context'];
                break;

            case 'latest_news':
                $context = $this->handleLatestNewsQuery();
                break;

            default:
                // General greeting or question — no extra context needed
                break;
        }

        // Product enrichment if viewing a product
        if ($productId) {
            $viewingProduct = Product::with(['variants', 'faqs', 'reviews' => function($q) {
                $q->latest()->limit(3);
            }])->find($productId);

            if ($viewingProduct) {
                $context .= "\n\nSẢN PHẨM KHÁCH HÀNG ĐANG XEM TRÊN MÀN HÌNH:\n";
                $context .= "- Tên: {$viewingProduct->name}\n";
                $context .= "- FAQ: " . $viewingProduct->faqs->map(fn($f) => "Q: {$f->question} - A: {$f->answer}")->join("\n  ") . "\n";
                $context .= "- Đánh giá gần đây: " . $viewingProduct->reviews->map(fn($r) => "{$r->rating} sao: {$r->comment}")->join("\n  ") . "\n";
                $context .= "- Tồn kho: " . $viewingProduct->variants->sum('stock_quantity') . "\n";
            }
        }

        // Get AI response
        $reply = $this->gemini->chat($userMessage, self::SYSTEM_PROMPT, $context, $history);

        // After successful consultation, maybe offer a coupon on the FIRST message
        if (empty($history) && in_array($intent, ['product_consultation', 'product_comparison', 'flashsale', 'top_rated', 'discounted_products']) && !empty($products)) {
            $coupon = $this->getActiveCoupon();
            if ($coupon) {
                $couponCode = $coupon->code;
                $reply .= "\n\n🎁 **Ưu đãi dành riêng cho bạn!** Sử dụng mã **{$couponCode}** để được giảm giá khi đặt hàng nhé!";
            }
        }

        // Format products for response
        $productCards = collect($products)->map(function ($p) use ($intent) {
            $card = [
                'id' => $p->id,
                'name' => $p->name,
                'slug' => $p->slug,
                'brand' => $p->brand,
                'main_image_url' => $p->main_image_url,
                'price' => (float) ($p->variants->min(fn($v) => $v->effective_price) ?? 0),
                'original_price' => $p->variants->min('price') !== null ? (float) $p->variants->min('price') : null,
            ];

            // Add rating info for top_rated intent
            if ($intent === 'top_rated') {
                $card['avg_rating'] = $p->reviews_avg_rating !== null ? round((float) $p->reviews_avg_rating, 1) : null;
                $card['reviews_count'] = $p->reviews_count ?? 0;
            }

            return $card;
        })->values()->toArray();

        return response()->json([
            'reply' => $reply,
            'products' => $productCards,
            'order' => $order,
            'coupon_code' => $couponCode,
            'intent' => $intent,
        ]);
    }

    /**
     * Detect the user's intent from the message.
     */
    private function detectIntent(string $message): string
    {
        $prompt = "Classify into: [order_tracking, product_consultation, product_comparison, warranty_policy, coupon_discount, flashsale, top_rated, discounted_products, latest_news, stock_check, price_query, general]. Only return the intent name.";
        $intent = $this->gemini->chat($message, $prompt, '', []);
        $intent = trim(strtolower($intent));
        
        $validIntents = ['order_tracking', 'product_consultation', 'product_comparison', 'warranty_policy', 'coupon_discount', 'flashsale', 'top_rated', 'discounted_products', 'latest_news', 'stock_check', 'price_query', 'general'];
        
        if (in_array($intent, $validIntents)) {
            return $intent;
        }
        
        return 'general';
    }

    /**
     * Handle order tracking intent.
     */
    private function handleOrderTracking(string $message, $user, ?string $phoneNumber = null): array
    {
        // Try to extract order code from message
        $orderCode = null;
        if (preg_match('/(?:ET-?\d+|#?\d{4,})/i', $message, $matches)) {
            $orderCode = strtoupper(str_replace('#', '', $matches[0]));
        }

        $order = null;
        $context = '';

        if ($orderCode) {
            $query = Order::with(['items.product:id,name,slug,main_image_url', 'shippingMethod:id,name'])
                ->where(function ($q) use ($orderCode) {
                    $q->where('order_code', $orderCode)
                      ->orWhere('order_code', 'LIKE', "%{$orderCode}%")
                      ->orWhere('id', is_numeric($orderCode) ? (int)$orderCode : 0);
                });
            
            if ($user) {
                $query->where('user_id', $user->id);
                $order = $query->first();
            } elseif ($phoneNumber) {
                $query->where('shipping_phone', $phoneNumber);
                $order = $query->first();
            }
        }

        if ($order) {
            $statusMap = [
                'pending' => 'Chờ xác nhận',
                'confirmed' => 'Đã xác nhận',
                'processing' => 'Đang xử lý',
                'shipping' => 'Đang giao hàng',
                'delivered' => 'Đã giao hàng',
                'completed' => 'Hoàn thành',
                'cancelled' => 'Đã hủy',
            ];

            $paymentStatusMap = [
                'pending' => 'Chưa thanh toán',
                'paid' => 'Đã thanh toán',
                'refunded' => 'Đã hoàn tiền',
            ];

            $context = "Thông tin đơn hàng:\n";
            $context .= "- Mã đơn: {$order->order_code}\n";
            $context .= "- Trạng thái: " . ($statusMap[$order->status] ?? $order->status) . "\n";
            $context .= "- Thanh toán: " . ($paymentStatusMap[$order->payment_status] ?? $order->payment_status) . "\n";
            $context .= "- Tổng tiền: " . number_format($order->total_amount) . "đ\n";
            $context .= "- Phương thức giao: " . ($order->shippingMethod->name ?? 'N/A') . "\n";
            $context .= "- Ngày đặt: {$order->created_at->format('d/m/Y H:i')}\n";

            $items = $order->items->map(fn($item) => "  + " . ($item->product->name ?? 'Sản phẩm') . " x{$item->quantity}")->join("\n");
            $context .= "- Sản phẩm:\n{$items}\n";

            // Format order for response
            $order = [
                'id' => $order->id,
                'order_code' => $order->order_code,
                'status' => $order->status,
                'status_text' => $statusMap[$order->status] ?? $order->status,
                'payment_status' => $order->payment_status,
                'payment_status_text' => $paymentStatusMap[$order->payment_status] ?? $order->payment_status,
                'total_amount' => (float) $order->total_amount,
                'created_at' => $order->created_at->toISOString(),
                'items_count' => $order->items->count(),
            ];
        } else {
            $context = "Không tìm thấy đơn hàng với thông tin khách cung cấp. ";
            if (!$user) {
                $context .= "Khách hàng chưa đăng nhập.";
            } elseif ($orderCode) {
                $context .= "Mã đơn '{$orderCode}' không tồn tại trong hệ thống cho tài khoản này.";
            } else {
                $context .= "Khách không cung cấp mã đơn hàng cụ thể.";
            }
        }

        return ['order' => $order, 'context' => $context];
    }

    /**
     * Handle product search based on message criteria.
     */
    private function handleProductQuery(string $message, string $intent): array
    {
        $message = mb_strtolower($message);

        // Extract price range
        $minPrice = null;
        $maxPrice = null;

        if (preg_match('/(?:tầm|khoảng|dưới|under)[^\d]*(\d+)[^\d]*(?:triệu|tr|m)/i', $message, $matches)) {
            $maxPrice = (float)$matches[1] * 1000000 * 1.1; // Allow 10% above
            $minPrice = $maxPrice / 1.1 * 0.7; // Allow 30% below
        }

        if (preg_match('/(\d+)[^\d]*(?:đến|-)[^\d]*(\d+)[^\d]*(?:triệu|tr|m)/i', $message, $matches)) {
            $minPrice = (float)$matches[1] * 1000000;
            $maxPrice = (float)$matches[2] * 1000000;
        }

        // Build product query
        $query = Product::with(['variants:id,product_id,variant_name,price,discount_type,discount_value,discount_start_at,discount_end_at,stock_quantity', 'specs', 'category:id,name'])
            ->where('is_active', true);

        // Category detection
        $categoryMap = [
            'laptop' => [3],
            'điện thoại' => [2], 'phone' => [2], 'iphone' => [2], 'samsung' => [2],
            'pc' => [51], 'máy tính bàn' => [51], 'desktop' => [51],
            'màn hình' => [53], 'monitor' => [53],
            'máy in' => [52], 'printer' => [52],
        ];

        $detectedCategories = [];
        foreach ($categoryMap as $keyword => $catIds) {
            if (str_contains($message, $keyword)) {
                $detectedCategories = array_merge($detectedCategories, $catIds);
            }
        }

        if (!empty($detectedCategories)) {
            $query->whereIn('category_id', array_unique($detectedCategories));
        }

        // Dynamic Brand Detection from DB
        $brands = \Illuminate\Support\Facades\Cache::remember('all_product_brands', 3600, function () {
            return Product::whereNotNull('brand')
                ->where('brand', '!=', '')
                ->distinct()
                ->pluck('brand')
                ->map(fn($b) => mb_strtolower($b))
                ->toArray();
        });

        $matchedBrands = [];
        foreach ($brands as $brand) {
            if (str_contains($message, $brand)) {
                $matchedBrands[] = $brand;
            }
        }

        if (!empty($matchedBrands)) {
            // Apply brand filter if any brands matched
            $query->where(function($q) use ($matchedBrands) {
                foreach ($matchedBrands as $mb) {
                    $q->orWhere('brand', 'ILIKE', "%{$mb}%");
                }
            });
        } else {
            // If no brand matched (e.g. "macbook" or "rog"), try to match keywords against product names
            $stopWords = ['gợi ý', 'tư vấn', 'cho tôi', 'tầm giá', 'khoảng', 'dưới', 'triệu', 'mua', 'tìm', 'giúp', 'có', 'nào', 'không', 'giá', 'tr', 'm', 'đến', 'mình', 'bạn', 'xem', 'thử', 'nhé', 'với', 'cho', 'một', 'cái', 'chiếc', 'điện thoại', 'laptop', 'máy tính', 'pc', 'chụp ảnh', 'pin trâu', 'đẹp', 'sản phẩm', 'hàng', 'đồ'];
            $cleanMessage = str_replace($stopWords, ' ', $message);
            preg_match_all('/[a-z0-9]{3,}/u', $cleanMessage, $matches);
            $keywords = $matches[0] ?? [];

            if (!empty($keywords)) {
                $searchPhrase = implode(' ', $keywords);
                $query->whereRaw("to_tsvector('simple', name) @@ plainto_tsquery('simple', ?)", [$searchPhrase]);
            }
        }

        // Check if query is too generic (no category, no brand, no price, no valid keywords)
        $isGeneric = empty($detectedCategories) && empty($matchedBrands) && !$minPrice && !$maxPrice && empty($keywords);

        // Price filter via variants
        if ($minPrice || $maxPrice) {
            $query->whereHas('variants', function ($q) use ($minPrice, $maxPrice) {
                if ($minPrice) $q->where('price', '>=', $minPrice);
                if ($maxPrice) $q->where('price', '<=', $maxPrice);
            });
        }

        if ($isGeneric) {
            $context = "LƯU Ý DÀNH CHO BOT: Khách hàng yêu cầu tư vấn nhưng chưa nói rõ muốn tìm sản phẩm nào (điện thoại, laptop, chuột...), thương hiệu gì, hay ngân sách bao nhiêu.\n";
            $context .= "=> Hãy đặt câu hỏi thân thiện để hỏi thêm nhu cầu của khách hàng (ví dụ: 'Bạn đang tìm kiếm dòng sản phẩm nào?', 'Ngân sách của bạn khoảng bao nhiêu?'). Tuyệt đối KHÔNG gợi ý sản phẩm ngẫu nhiên trong lúc này.";
            return ['products' => [], 'context' => $context];
        }

        // Get products
        $products = $query->orderByDesc('is_featured')
            ->limit(5)
            ->get();

        // Build context for AI
        if ($intent === 'product_comparison') {
            $context = "Yêu cầu so sánh các sản phẩm sau từ kho E-Tech Market:\n\n";
        } else {
            $context = "Danh sách sản phẩm phù hợp từ kho E-Tech Market:\n\n";
        }

        if ($products->isEmpty()) {
            $context .= "Không tìm thấy sản phẩm nào phù hợp với tiêu chí tìm kiếm. Hãy báo cho khách biết.\n";
        } else {
            foreach ($products as $i => $product) {
                $price = $product->variants->min(fn($v) => $v->effective_price);
                $comparePrice = $product->variants->min('price');
                $specs = $product->specs->pluck('spec_value', 'spec_key')->toArray();

                $context .= ($i + 1) . ". {$product->name}\n";
                $context .= "   - Thương hiệu: {$product->brand}\n";
                $context .= "   - Danh mục: " . ($product->category->name ?? 'N/A') . "\n";
                $context .= "   - Giá: " . number_format($price) . "đ";
                if ($comparePrice && $comparePrice > $price) {
                    $context .= " (Giá gốc: " . number_format($comparePrice) . "đ)";
                }
                $context .= "\n";

                // Add key specs
                if (!empty($specs)) {
                    $context .= "   - Thông số: ";
                    $specParts = [];
                    foreach (array_slice($specs, 0, 6) as $key => $value) {
                        $specParts[] = "{$key}: {$value}";
                    }
                    $context .= implode(', ', $specParts) . "\n";
                }

                // Variants info
                $variantsInfo = [];
                foreach ($product->variants->take(3) as $v) {
                    $vInfo = $v->variant_name;
                    if (in_array($intent, ['stock_check', 'price_query'])) {
                         $vInfo .= " (Giá: " . number_format($v->effective_price) . "đ, Tồn kho: " . $v->stock_quantity . ")";
                    }
                    $variantsInfo[] = $vInfo;
                }
                if (!empty($variantsInfo)) {
                    $context .= "   - Phiên bản: " . implode(' | ', $variantsInfo) . "\n";
                }

                $context .= "\n";
            }
        }

        return ['products' => $products->all(), 'context' => $context];
    }

    /**
     * Get warranty/policy context.
     */
    private function getWarrantyContext(): string
    {
        return <<<'CTX'
Chính sách E-Tech Market:
1. BẢO HÀNH:
   - Bảo hành chính hãng theo nhà sản xuất (12-24 tháng tùy sản phẩm)
   - Bảo hành 1 đổi 1 trong 30 ngày đầu nếu lỗi từ nhà sản xuất
   - Hỗ trợ gửi bảo hành miễn phí qua hệ thống vận chuyển

2. ĐỔI TRẢ:
   - Đổi trả miễn phí trong 7 ngày nếu sản phẩm lỗi từ nhà sản xuất
   - Sản phẩm phải còn nguyên tem, hộp, phụ kiện đi kèm
   - Không áp dụng cho sản phẩm đã qua sử dụng hoặc hư hỏng do người dùng

3. VẬN CHUYỂN:
   - Giao hàng toàn quốc
   - Miễn phí giao hàng nội thành TP.HCM & Hà Nội cho đơn trên 500.000đ
   - Thời gian giao hàng: 1-2 ngày (nội thành), 3-5 ngày (tỉnh)

4. THANH TOÁN:
   - COD (thanh toán khi nhận hàng)
   - VNPay QR
   - Ví MoMo
   - Chuyển khoản ngân hàng
CTX;
    }

    /**
     * Get an active coupon to offer customers.
     */
    private function getActiveCoupon(): ?Coupon
    {
        return Coupon::where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('start_at')->orWhere('start_at', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('end_at')->orWhere('end_at', '>=', now());
            })
            ->orderByDesc('value')
            ->first();
    }

    /**
     * Handle flashsale query.
     */
    private function handleFlashsaleQuery(): array
    {
        $activeFlashSale = \App\Models\FlashSale::where('status', 'active')
            ->where('start_at', '<=', now())
            ->where('end_at', '>=', now())
            ->first();

        if (!$activeFlashSale) {
            $context = "Chương trình Flash Sale đang diễn ra:\nHiện tại không có chương trình Flash Sale nào đang diễn ra.\n";
            return ['products' => [], 'context' => $context];
        }

        $totalItems = $activeFlashSale->items()->count();
        
        $flashSaleItems = $activeFlashSale->items()
            ->with(['product.variants', 'product.category'])
            ->limit(5)
            ->get();

        $products = $flashSaleItems
            ->map(fn($item) => $item->product)
            ->filter()
            ->values();

        $context = "Chương trình Flash Sale đang diễn ra:\n";
        $context .= "- Tên chương trình: {$activeFlashSale->name}\n";
        $context .= "- Kết thúc vào lúc: " . $activeFlashSale->end_at->format('d/m/Y H:i:s') . "\n";
        $context .= "- Tổng số sản phẩm tham gia: {$totalItems} sản phẩm\n\n";
        $context .= "Một số sản phẩm nổi bật trong chương trình:\n";

        if ($products->isEmpty()) {
            $context .= "Chưa có sản phẩm nào được thêm vào.\n";
        } else {
            foreach ($products as $p) {
                $context .= "- {$p->name} (Giá sốc)\n";
            }
        }

        return ['products' => $products->all(), 'context' => $context];
    }

    /**
     * Handle top rated products.
     */
    private function handleTopRatedQuery(): array
    {
        $products = Product::with(['variants:id,product_id,variant_name,price,discount_type,discount_value,discount_start_at,discount_end_at', 'category:id,name'])
            ->where('is_active', true)
            ->whereHas('reviews')
            ->withAvg('reviews', 'rating')
            ->withCount('reviews')
            ->orderByRaw('reviews_avg_rating DESC NULLS LAST')
            ->limit(5)
            ->get();

        $context = "Sản phẩm được đánh giá cao nhất:\n";
        if ($products->isEmpty()) {
            $context .= "Không tìm thấy sản phẩm nổi bật.\n";
        } else {
            foreach ($products as $p) {
                $rating = number_format($p->reviews_avg_rating ?? 5, 1);
                $context .= "- {$p->name} (Đánh giá: {$rating} sao)\n";
            }
        }

        return ['products' => $products->all(), 'context' => $context];
    }

    /**
     * Handle discounted products.
     */
    private function handleDiscountedQuery(): array
    {
        $products = Product::with(['variants:id,product_id,variant_name,price,discount_type,discount_value,discount_start_at,discount_end_at', 'category:id,name'])
            ->where('is_active', true)
            ->whereHas('variants', function($q) {
                $q->whereNotNull('discount_type')
                  ->where('discount_value', '>', 0)
                  ->where(function($subQ) {
                      $subQ->whereNull('discount_start_at')->orWhere('discount_start_at', '<=', now());
                  })
                  ->where(function($subQ) {
                      $subQ->whereNull('discount_end_at')->orWhere('discount_end_at', '>=', now());
                  });
            })
            ->limit(5)
            ->get();

        $context = "Các sản phẩm đang được giảm giá:\n";
        if ($products->isEmpty()) {
            $context .= "Hiện tại không có sản phẩm nào đang giảm giá.\n";
        } else {
            foreach ($products as $p) {
                $context .= "- {$p->name}\n";
            }
        }

        return ['products' => $products->all(), 'context' => $context];
    }

    /**
     * Handle latest news query.
     */
    private function handleLatestNewsQuery(): string
    {
        $news = \App\Models\BlogPost::where('is_published', true)
            ->orderByDesc('published_at')
            ->limit(3)
            ->get();

        $context = "Tin tức công nghệ mới nhất:\n";
        if ($news->isEmpty()) {
            $context .= "Chưa có bài viết mới nào.\n";
        } else {
            foreach ($news as $post) {
                $context .= "- Tiêu đề: {$post->title}\n";
                $context .= "  Tóm tắt: {$post->excerpt}\n\n";
            }
        }

        return $context;
    }
}
