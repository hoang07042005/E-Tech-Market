<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BlogComment;
use App\Models\BlogPost;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductFaq;
use App\Models\ProductNews;
use App\Models\Review;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DeletedDataController extends Controller
{
    // ─────────────────────────────────────────────
    // REVIEWS (soft-deleted)
    // ─────────────────────────────────────────────
    public function indexDeletedReviews(Request $request): JsonResponse
    {
        $perPage = (int) ($request->query('per_page', 20));
        $perPage = max(5, min(100, $perPage));

        $paginator = Review::onlyTrashed()
            ->with('product:id,name,main_image_url', 'user:id,name,avatar_url')
            ->orderBy('deleted_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
                'last_page'    => $paginator->lastPage(),
            ],
        ]);
    }

    public function hardDeleteReviews(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids'   => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'integer', 'distinct'],
        ]);

        $ids = array_map('intval', $data['ids']);

        $existing = Review::onlyTrashed()
            ->whereIn('id', $ids)
            ->pluck('id')
            ->all();

        if (count($existing) === 0) {
            throw ValidationException::withMessages([
                'ids' => ['Không tìm thấy reviews đã xóa để xóa hẳn.'],
            ]);
        }

        $deletedCount = 0;

        DB::transaction(function () use ($existing, &$deletedCount) {
            $deletedCount = Review::onlyTrashed()
                ->whereIn('id', $existing)
                ->forceDelete();
        });

        return response()->json([
            'message' => 'Hard delete completed.',
            'counts'  => ['reviews' => $deletedCount],
        ]);
    }

    // ─────────────────────────────────────────────
    // USERS (soft-deleted)
    // ─────────────────────────────────────────────
    public function indexDeletedUsers(Request $request): JsonResponse
    {
        $perPage = (int) ($request->query('per_page', 20));
        $perPage = max(5, min(100, $perPage));

        $paginator = User::onlyTrashed()
            ->orderBy('deleted_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
                'last_page'    => $paginator->lastPage(),
            ],
        ]);
    }

    public function hardDeleteUsers(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids'   => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'integer', 'distinct'],
        ]);

        $ids = array_map('intval', $data['ids']);

        $existing = User::onlyTrashed()
            ->whereIn('id', $ids)
            ->pluck('id')
            ->all();

        if (count($existing) === 0) {
            throw ValidationException::withMessages([
                'ids' => ['Không tìm thấy người dùng đã xóa để xóa hẳn.'],
            ]);
        }

        $deletedCount = 0;

        DB::transaction(function () use ($existing, &$deletedCount) {
            $deletedCount = User::onlyTrashed()
                ->whereIn('id', $existing)
                ->forceDelete();
        });

        return response()->json([
            'message' => 'Hard delete completed.',
            'counts'  => ['users' => $deletedCount],
        ]);
    }

    // ─────────────────────────────────────────────
    // CATEGORIES (soft-deleted)
    // ─────────────────────────────────────────────
    public function indexDeletedCategories(Request $request): JsonResponse
    {
        $perPage = (int) ($request->query('per_page', 20));
        $perPage = max(5, min(100, $perPage));

        $paginator = Category::onlyTrashed()
            ->orderBy('deleted_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
                'last_page'    => $paginator->lastPage(),
            ],
        ]);
    }

    public function hardDeleteCategories(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids'   => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'integer', 'distinct'],
        ]);

        $ids = array_map('intval', $data['ids']);

        $existing = Category::onlyTrashed()
            ->whereIn('id', $ids)
            ->pluck('id')
            ->all();

        if (count($existing) === 0) {
            throw ValidationException::withMessages([
                'ids' => ['Không tìm thấy categories đã xóa để xóa hẳn.'],
            ]);
        }

        $deletedCount = 0;

        DB::transaction(function () use ($existing, &$deletedCount) {
            $deletedCount = Category::onlyTrashed()
                ->whereIn('id', $existing)
                ->forceDelete();
        });

        return response()->json([
            'message' => 'Hard delete completed.',
            'counts'  => ['categories' => $deletedCount],
        ]);
    }

    // ─────────────────────────────────────────────
    // PRODUCTS (soft-deleted)
    // ─────────────────────────────────────────────

    public function indexDeletedProducts(Request $request): JsonResponse
    {
        $perPage = (int) ($request->query('per_page', 20));
        $perPage = max(5, min(100, $perPage));

        $paginator = Product::onlyTrashed()
            ->with('category:id,name')
            ->orderBy('deleted_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
                'last_page'    => $paginator->lastPage(),
            ],
        ]);
    }

    public function hardDeleteProducts(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids'   => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'integer', 'distinct'],
        ]);

        $ids = array_map('intval', $data['ids']);

        // Only allow trashed products
        $existing = Product::onlyTrashed()
            ->whereIn('id', $ids)
            ->pluck('id')
            ->all();

        if (count($existing) === 0) {
            throw ValidationException::withMessages([
                'ids' => ['Không tìm thấy sản phẩm đã xóa để xóa hẳn.'],
            ]);
        }

        $deletedCount = 0;

        DB::transaction(function () use ($existing, &$deletedCount) {
            // Manually delete child records that may NOT cascade correctly
            // when SoftDeletes is involved (the product row is NOT physically
            // present in some DB queries, so FK cascade won't always trigger).
            DB::table('product_shop_qnas')->whereIn('product_id', $existing)->delete();
            DB::table('product_news')->whereIn('product_id', $existing)->delete();
            DB::table('product_faqs')->whereIn('product_id', $existing)->delete();
            DB::table('product_specs')->whereIn('product_id', $existing)->delete();
            DB::table('product_images')->whereIn('product_id', $existing)->delete();
            DB::table('wishlists')->whereIn('product_id', $existing)->delete();
            DB::table('reviews')->whereIn('product_id', $existing)->delete();
            DB::table('flash_sale_items')->whereIn('product_id', $existing)->delete();

            // Variants (and their children via cascade)
            $variantIds = \App\Models\ProductVariant::withTrashed()
                ->whereIn('product_id', $existing)
                ->pluck('id')
                ->all();

            if (count($variantIds) > 0) {
                DB::table('inventory_transactions')->whereIn('product_variant_id', $variantIds)->delete();
                DB::table('inventory')->whereIn('product_variant_id', $variantIds)->delete();
                DB::table('cart_items')->whereIn('product_variant_id', $variantIds)->delete();
                // order_items: cascade set on DB so forceDelete will cascade;
                // but to be safe, nullify via raw query:
                DB::table('order_items')->whereIn('product_variant_id', $variantIds)->delete();
                DB::table('product_variants')->whereIn('id', $variantIds)->delete();
            }

            // Cart items referencing product directly
            DB::table('cart_items')->whereIn('product_id', $existing)->delete();

            // order_items referencing product directly
            DB::table('order_items')->whereIn('product_id', $existing)->delete();

            // Now forceDelete the products themselves
            $deletedCount = Product::onlyTrashed()
                ->whereIn('id', $existing)
                ->forceDelete();
        });

        return response()->json([
            'message' => 'Hard delete completed.',
            'counts'  => ['products' => $deletedCount],
        ]);
    }

    // ─────────────────────────────────────────────
    // PRODUCT NEWS (soft-deleted)
    // ─────────────────────────────────────────────

    public function indexDeletedProductNews(Request $request): JsonResponse
    {
        $perPage = (int) ($request->query('per_page', 20));
        $perPage = max(5, min(100, $perPage));

        $paginator = ProductNews::onlyTrashed()
            ->with('product:id,name,slug')
            ->orderBy('deleted_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
                'last_page'    => $paginator->lastPage(),
            ],
        ]);
    }

    public function hardDeleteProductNews(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids'   => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'integer', 'distinct'],
        ]);

        $ids = array_map('intval', $data['ids']);

        $existing = ProductNews::onlyTrashed()
            ->whereIn('id', $ids)
            ->pluck('id')
            ->all();

        if (count($existing) === 0) {
            throw ValidationException::withMessages([
                'ids' => ['Không tìm thấy product news đã xóa để xóa hẳn.'],
            ]);
        }

        $deletedCount = 0;

        DB::transaction(function () use ($existing, &$deletedCount) {
            $deletedCount = ProductNews::onlyTrashed()
                ->whereIn('id', $existing)
                ->forceDelete();
        });

        return response()->json([
            'message' => 'Hard delete completed.',
            'counts'  => ['product_news' => $deletedCount],
        ]);
    }

    // ─────────────────────────────────────────────
    // PRODUCT FAQS (soft-deleted)
    // ─────────────────────────────────────────────

    public function indexDeletedProductFaqs(Request $request): JsonResponse
    {
        $perPage = (int) ($request->query('per_page', 20));
        $perPage = max(5, min(100, $perPage));

        $paginator = ProductFaq::onlyTrashed()
            ->with('product:id,name,slug')
            ->orderBy('deleted_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
                'last_page'    => $paginator->lastPage(),
            ],
        ]);
    }

    public function hardDeleteProductFaqs(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids'   => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'integer', 'distinct'],
        ]);

        $ids = array_map('intval', $data['ids']);

        $existing = ProductFaq::onlyTrashed()
            ->whereIn('id', $ids)
            ->pluck('id')
            ->all();

        if (count($existing) === 0) {
            throw ValidationException::withMessages([
                'ids' => ['Không tìm thấy product FAQ đã xóa để xóa hẳn.'],
            ]);
        }

        $deletedCount = 0;

        DB::transaction(function () use ($existing, &$deletedCount) {
            $deletedCount = ProductFaq::onlyTrashed()
                ->whereIn('id', $existing)
                ->forceDelete();
        });

        return response()->json([
            'message' => 'Hard delete completed.',
            'counts'  => ['product_faqs' => $deletedCount],
        ]);
    }
    // ─────────────────────────────────────────────
    // BLOG POSTS (soft-deleted)
    // ─────────────────────────────────────────────

    public function indexDeletedBlogPosts(Request $request): JsonResponse
    {
        $perPage = (int) ($request->query('per_page', 20));
        $perPage = max(5, min(100, $perPage));

        $paginator = BlogPost::onlyTrashed()
            ->with('category:id,name', 'author:id,name')
            ->orderBy('deleted_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
                'last_page'    => $paginator->lastPage(),
            ],
        ]);
    }

    public function hardDeleteBlogPosts(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids'   => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'integer', 'distinct'],
        ]);

        $ids = array_map('intval', $data['ids']);

        $existing = BlogPost::onlyTrashed()
            ->whereIn('id', $ids)
            ->pluck('id')
            ->all();

        if (count($existing) === 0) {
            throw ValidationException::withMessages([
                'ids' => ['Không tìm thấy blog post đã xóa để xóa hẳn.'],
            ]);
        }

        $deletedCount = 0;

        DB::transaction(function () use ($existing, &$deletedCount) {
            // Delete comments belonging to these posts
            DB::table('blog_comments')->whereIn('blog_post_id', $existing)->delete();

            $deletedCount = BlogPost::onlyTrashed()
                ->whereIn('id', $existing)
                ->forceDelete();
        });

        return response()->json([
            'message' => 'Hard delete completed.',
            'counts'  => ['blog_posts' => $deletedCount],
        ]);
    }

    // ─────────────────────────────────────────────
    // BLOG COMMENTS (soft-deleted)
    // ─────────────────────────────────────────────

    public function indexDeletedBlogComments(Request $request): JsonResponse
    {
        $perPage = (int) ($request->query('per_page', 20));
        $perPage = max(5, min(100, $perPage));

        $paginator = BlogComment::onlyTrashed()
            ->with('post:id,title,slug')
            ->orderBy('deleted_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
                'last_page'    => $paginator->lastPage(),
            ],
        ]);
    }

    public function hardDeleteBlogComments(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids'   => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'integer', 'distinct'],
        ]);

        $ids = array_map('intval', $data['ids']);

        $existing = BlogComment::onlyTrashed()
            ->whereIn('id', $ids)
            ->pluck('id')
            ->all();

        if (count($existing) === 0) {
            throw ValidationException::withMessages([
                'ids' => ['Không tìm thấy blog comment đã xóa để xóa hẳn.'],
            ]);
        }

        $deletedCount = 0;

        DB::transaction(function () use ($existing, &$deletedCount) {
            $deletedCount = BlogComment::onlyTrashed()
                ->whereIn('id', $existing)
                ->forceDelete();
        });

        return response()->json([
            'message' => 'Hard delete completed.',
            'counts'  => ['blog_comments' => $deletedCount],
        ]);
    }


}
