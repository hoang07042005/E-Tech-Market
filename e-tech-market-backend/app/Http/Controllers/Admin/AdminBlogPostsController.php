<?php

namespace App\Http\Controllers\Admin;

use App\Http\Resources\Admin\BlogPostResource;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use App\Models\BlogCategory;
use App\Support\HtmlSanitizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Requests\Admin\StoreBlogPostRequest;
use App\Http\Requests\Admin\UpdateBlogPostRequest;
use App\Http\Requests\Admin\StoreBlogCategoryRequest;
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
        return response()->json((new BlogPostResource($blogPost))->resolve());
    }

    public function store(StoreBlogPostRequest $request): JsonResponse
    {
        

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

        if ($isPublished) {
            $this->notifySubscribers($post);
        }

        return response()->json($post, 201);
    }

    public function update(UpdateBlogPostRequest $request, BlogPost $blogPost): JsonResponse
    {
        

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
        
        $wasPublished = $blogPost->is_published;
        if ($request->has('is_published')) {
            $isPublished = $request->boolean('is_published');
            if ($isPublished && !$wasPublished) {
                $blogPost->published_at = now();
            } elseif (!$isPublished) {
                $blogPost->published_at = null;
            }
            $blogPost->is_published = $isPublished;
        }

        $blogPost->save();

        if ($request->has('is_published') && $isPublished && !$wasPublished) {
            $this->notifySubscribers($blogPost);
        }

        return response()->json((new BlogPostResource($blogPost))->resolve());
    }

    public function destroy(BlogPost $blogPost): JsonResponse
    {
        $blogPost->delete();
        return response()->json(['message' => 'Post deleted successfully']);
    }

    public function storeCategory(StoreBlogCategoryRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $validated['slug'] = Str::slug($validated['name']) . '-' . uniqid();
        $validated['sort_order'] = $validated['sort_order'] ?? 0;
        
        $category = BlogCategory::create($validated);
        
        return response()->json((new BlogPostResource($category))->resolve(), 201);
    }

    private function notifySubscribers(BlogPost $post): void
    {
        // Lấy toàn bộ danh sách email đã đăng ký nhận tin
        $emails = \App\Models\NewsletterSubscription::query()
            ->whereNull('unsubscribed_at')
            ->pluck('email');

        if ($emails->isEmpty()) {
            return;
        }

        // Tìm các tài khoản người dùng hoạt động tương ứng với các email này
        $users = \App\Models\User::query()
            ->whereIn('email', $emails)
            ->where('is_active', true)
            ->get();

        foreach ($users as $user) {
            \App\Models\Notification::create([
                'user_id' => $user->id,
                'type' => 'blog',
                'title' => 'Tin tức công nghệ mới!',
                'body' => 'Bài viết mới "' . $post->title . '" vừa được xuất bản. Xem ngay!',
                'data' => [
                    'post_id' => $post->id,
                    'post_slug' => $post->slug,
                    'action_url' => '/blog/' . $post->slug,
                ],
            ]);
        }
    }
}
