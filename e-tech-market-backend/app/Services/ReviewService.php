<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

class ReviewService
{
    /**
     * Lấy danh sách đánh giá cho Admin
     */
    public function getAdminReviews(?string $status, int $limit = 20)
    {
        $query = Review::query()->with(['user', 'product']);

        if ($status) {
            $query->where('status', $status);
        }

        return $query->orderBy('updated_at', 'desc')->paginate($limit);
    }

    /**
     * Cập nhật trạng thái đánh giá (Admin)
     */
    public function updateReviewStatus(Review $review, string $status): Review
    {
        $review->update(['status' => $status]);
        return $review;
    }

    /**
     * Xóa đánh giá (Admin)
     */
    public function deleteReview(Review $review): void
    {
        $review->delete();
    }

    /**
     * Lấy danh sách đánh giá cho trang chủ Client (cache)
     */
    public function getClientReviews(int $limit = 10, int $minRating = 5)
    {
        $cacheKey = "reviews_index_{$limit}_{$minRating}";

        return Cache::remember($cacheKey, 300, function () use ($minRating, $limit) {
            return Review::query()
                ->where('status', 'approved')
                ->where('rating', '>=', $minRating)
                ->with(['user:id,name,avatar_url', 'product:id,name,slug,main_image_url'])
                ->latest()
                ->limit($limit)
                ->get();
        });
    }

    /**
     * Tạo hoặc cập nhật đánh giá từ Client
     */
    public function submitReview(User $user, Product $product, array $data): Review
    {
        if (! $product->is_active) {
            throw new \Exception('Product not active', 404);
        }

        if (! empty($data['order_id'])) {
            $hasPurchased = Order::query()
                ->where('id', (int) $data['order_id'])
                ->where('user_id', $user->id)
                ->whereIn('status', ['delivered', 'completed'])
                ->whereHas('items', function ($q) use ($product) {
                    $q->where('product_id', $product->id);
                })
                ->exists();

            if (! $hasPurchased) {
                throw new \Exception('Order is not eligible for this review', 422);
            }
        }

        $reviewData = [
            'rating' => (int) $data['rating'],
            'exp_performance' => isset($data['exp_performance']) ? (int) $data['exp_performance'] : null,
            'exp_battery' => isset($data['exp_battery']) ? (int) $data['exp_battery'] : null,
            'exp_camera' => isset($data['exp_camera']) ? (int) $data['exp_camera'] : null,
            'comment' => $data['comment'] ?? null,
            'order_id' => $data['order_id'] ?? null,
            'status' => 'pending',
        ];

        $review = Review::query()->updateOrCreate(
            ['user_id' => $user->id, 'product_id' => $product->id],
            $reviewData
        );

        if (! empty($data['media']) && is_array($data['media'])) {
            $mediaItems = [];
            foreach ($data['media'] as $file) {
                if (! $file instanceof \Illuminate\Http\UploadedFile) {
                    continue;
                }
                $mime = strtolower($file->getClientMimeType());
                $type = str_starts_with($mime, 'video/') ? 'video' : (str_starts_with($mime, 'image/') ? 'image' : null);
                if (! $type) {
                    continue;
                }
                $folder = $type === 'video' ? 'review-media/videos' : 'review-media/images';
                $path = $file->store($folder, 'public');
                if (! $path) {
                    continue;
                }
                $normalizedPath = str_replace('\\', '/', $path);
                $mediaItems[] = [
                    'type' => $type,
                    'url' => \Illuminate\Support\Facades\Storage::disk('public')->url($normalizedPath),
                    'original_name' => $file->getClientOriginalName(),
                ];
            }
            if (! empty($mediaItems)) {
                $existingMedia = is_array($review->media) ? $review->media : [];
                $review->media = array_values(array_merge($existingMedia, $mediaItems));
                $review->save();
            }
        }

        $review->load(['product']);

        return $review;
    }
}
