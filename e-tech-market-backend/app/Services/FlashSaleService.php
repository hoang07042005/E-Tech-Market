<?php

namespace App\Services;

use App\Models\FlashSale;
use App\Models\FlashSaleItem;
use App\Models\Product;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

class FlashSaleService
{
    /**
     * Tự động tắt các chiến dịch đã hết hạn
     */
    public function endExpiredSales(): void
    {
        FlashSale::where('status', '!=', FlashSale::STATUS_ENDED)
            ->where('end_at', '<', Carbon::now())
            ->update(['status' => FlashSale::STATUS_ENDED]);
    }

    /**
     * Lấy danh sách Flash Sale cho Admin
     */
    public function getAdminSales()
    {
        $this->endExpiredSales();
        return FlashSale::withCount('items')->orderBy('start_at', 'desc')->get();
    }

    /**
     * Tạo mới Flash Sale
     */
    public function createSale(array $data): FlashSale
    {
        Cache::forget('active_flash_sale');
        return FlashSale::create($data);
    }

    /**
     * Lấy thông tin chi tiết một Flash Sale
     */
    public function getSaleWithItems(FlashSale $flashSale): FlashSale
    {
        $flashSale->load('items.product', 'items.variant');
        return $flashSale;
    }

    /**
     * Cập nhật Flash Sale
     */
    public function updateSale(FlashSale $flashSale, array $data): FlashSale
    {
        Cache::forget('active_flash_sale');
        $flashSale->update($data);
        return $flashSale;
    }

    /**
     * Xóa Flash Sale
     */
    public function deleteSale(FlashSale $flashSale): void
    {
        Cache::forget('active_flash_sale');
        $flashSale->delete();
    }

    /**
     * Thêm sản phẩm vào Flash Sale
     */
    public function addItem(FlashSale $flashSale, array $data): FlashSaleItem
    {
        Cache::forget('active_flash_sale');
        return $flashSale->items()->create($data);
    }

    /**
     * Xóa sản phẩm khỏi Flash Sale
     */
    public function removeItem(FlashSale $flashSale, FlashSaleItem $item): void
    {
        if ($item->flash_sale_id !== $flashSale->id) {
            throw new \Exception('Item does not belong to this sale', 403);
        }
        Cache::forget('active_flash_sale');
        $item->delete();
    }

    /**
     * Thêm hàng loạt sản phẩm vào Flash Sale theo phần trăm giảm giá
     */
    public function addBulkItems(FlashSale $flashSale, float $percentage, ?int $qtyLimit): int
    {
        $addedCount = 0;

        Product::chunk(200, function ($products) use ($flashSale, $percentage, $qtyLimit, &$addedCount) {
            $products->load('variants');
            foreach ($products as $product) {
                if ($product->variants->isNotEmpty()) {
                    foreach ($product->variants as $variant) {
                        $discountedPrice = round((float) $variant->price * (1 - $percentage / 100));
                        $flashSale->items()->updateOrCreate(
                            [
                                'product_id' => $product->id,
                                'variant_id' => $variant->id,
                            ],
                            [
                                'flash_sale_price' => $discountedPrice,
                                'quantity_limit' => $qtyLimit,
                            ]
                        );
                        $addedCount++;
                    }
                } else {
                    $basePrice = (float) $product->getAttribute('price');
                    $discountedPrice = round($basePrice * (1 - $percentage / 100));
                    $flashSale->items()->updateOrCreate(
                        [
                            'product_id' => $product->id,
                            'variant_id' => null,
                        ],
                        [
                            'flash_sale_price' => $discountedPrice,
                            'quantity_limit' => $qtyLimit,
                        ]
                    );
                    $addedCount++;
                }
            }
        });

        Cache::forget('active_flash_sale');
        return $addedCount;
    }

    /**
     * Lấy chiến dịch Flash Sale hiện tại hoặc sắp tới cho Client
     * Trả về một flash sale (để tương thích) hoặc mảng flash sales (nếu có nhiều)
     */
    public function getCurrentClientSale(): mixed
    {
        $now = Carbon::now();
        $this->endExpiredSales();

        return Cache::remember('active_flash_sale', 60, function () use ($now) {
            // Lấy TẤT CẢ flash sale đang active (có thể có nhiều chương trình chạy song song)
            $activeSales = FlashSale::where('status', FlashSale::STATUS_ACTIVE)
                ->where('start_at', '<=', $now)
                ->where('end_at', '>=', $now)
                ->with(['items' => function ($query) {
                    $query->with(['product.category', 'variant']);
                }])
                ->get();

            // Lấy các flash sale sắp tới (waiting)
            $upcomingSales = FlashSale::where('status', FlashSale::STATUS_WAITING)
                ->where('start_at', '>', $now)
                ->orderBy('start_at', 'asc')
                ->with(['items' => function ($query) {
                    $query->with(['product.category', 'variant']);
                }])
                ->limit(10)
                ->get();

            $allSales = collect();

            // Thêm tất cả flash sale đang active
            foreach ($activeSales as $sale) {
                $allSales->push($sale);
            }

            // Thêm các flash sale sắp tới
            foreach ($upcomingSales as $sale) {
                $allSales->push($sale);
            }

            // Nếu chỉ có 1 flash sale, trả về object (tương thích ngược)
            if ($allSales->count() === 1) {
                return $allSales->first();
            }

            // Nếu có 2+ flash sales, trả về mảng
            return $allSales->values()->all();
        });
    }
}
