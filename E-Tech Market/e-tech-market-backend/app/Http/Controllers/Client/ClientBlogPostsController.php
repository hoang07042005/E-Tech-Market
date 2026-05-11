<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use App\Models\BlogCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientBlogPostsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = BlogPost::with(['category', 'author'])
            ->where('is_published', true)
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now());

        if ($request->has('category_id')) {
            $query->where('blog_category_id', $request->category_id);
        }

        $posts = $query->orderBy('published_at', 'desc')
            ->paginate($request->get('per_page', 9));

        return response()->json($posts);
    }

    public function show(string $slug): JsonResponse
    {
        $post = BlogPost::with(['category', 'author'])
            ->where('is_published', true)
            ->where('slug', $slug)
            ->firstOrFail();

        return response()->json($post);
    }

    public function categories(): JsonResponse
    {
        $categories = BlogCategory::orderBy('sort_order', 'asc')->get();
        return response()->json($categories);
    }
}
