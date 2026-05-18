<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use App\Models\BlogCategory;
use App\Support\HtmlSanitizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminBlogPostsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $posts = BlogPost::with(['category', 'author'])
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return response()->json($posts);
    }

    public function show(BlogPost $blogPost): JsonResponse
    {
        $blogPost->load(['category', 'author']);
        return response()->json($blogPost);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'blog_category_id' => 'nullable|exists:blog_categories,id',
            'excerpt' => 'nullable|string',
            'content' => 'required|string',
            'thumbnail_url' => 'nullable|string',
            'is_published' => 'boolean',
        ]);

        $post = new BlogPost();
        $post->title = $request->title;
        $post->slug = Str::slug($request->title) . '-' . uniqid();
        $post->blog_category_id = $request->blog_category_id;
        $post->excerpt = $request->excerpt;
        $post->content = HtmlSanitizer::sanitize($request->content) ?? '';
        $post->thumbnail_url = $request->thumbnail_url;
        $post->author_id = $request->user()->id;
        
        $isPublished = $request->boolean('is_published');
        if ($isPublished) {
            $post->published_at = now();
        }
        $post->is_published = $isPublished;

        $post->save();

        return response()->json($post, 201);
    }

    public function update(Request $request, BlogPost $blogPost): JsonResponse
    {
        $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'blog_category_id' => 'nullable|exists:blog_categories,id',
            'excerpt' => 'nullable|string',
            'content' => 'sometimes|required|string',
            'thumbnail_url' => 'nullable|string',
            'is_published' => 'boolean',
        ]);

        if ($request->has('title')) {
            $blogPost->title = $request->title;
            $blogPost->slug = Str::slug($request->title) . '-' . uniqid();
        }
        
        if ($request->has('blog_category_id')) {
            $blogPost->blog_category_id = $request->blog_category_id;
        }
        
        if ($request->has('excerpt')) {
            $blogPost->excerpt = $request->excerpt;
        }
        
        if ($request->has('content')) {
            $blogPost->content = HtmlSanitizer::sanitize($request->content) ?? '';
        }
        
        if ($request->has('thumbnail_url')) {
            $blogPost->thumbnail_url = $request->thumbnail_url;
        }
        
        if ($request->has('is_published')) {
            $isPublished = $request->boolean('is_published');
            if ($isPublished && !$blogPost->is_published) {
                $blogPost->published_at = now();
            } elseif (!$isPublished) {
                $blogPost->published_at = null;
            }
            $blogPost->is_published = $isPublished;
        }

        $blogPost->save();

        return response()->json($blogPost);
    }

    public function destroy(BlogPost $blogPost): JsonResponse
    {
        $blogPost->delete();
        return response()->json(['message' => 'Post deleted successfully']);
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'sort_order' => 'integer'
        ]);
        
        $validated['slug'] = Str::slug($validated['name']) . '-' . uniqid();
        $validated['sort_order'] = $validated['sort_order'] ?? 0;
        
        $category = BlogCategory::create($validated);
        
        return response()->json($category, 201);
    }
}
