<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\BlogCategory;
use App\Models\BlogComment;
use App\Models\BlogPost;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ClientBlogPostsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $cacheKey = 'blog_posts_index_'.md5(serialize($request->all()));

        $posts = \Illuminate\Support\Facades\Cache::remember($cacheKey, 300, function () use ($request) {
            $query = BlogPost::with(['category', 'author'])
                ->withCount(['comments' => function ($q) {
                    $q->where('status', 'approved');
                }])
                ->where('is_published', true)
                ->whereNotNull('published_at')
                ->where('published_at', '<=', now());

            if ($request->has('category_id')) {
                $query->where('blog_category_id', $request->category_id);
            }

            $p = $query->orderBy('published_at', 'desc')
                ->paginate($request->get('per_page', 9));

            $p->getCollection()->transform(fn (BlogPost $post) => $this->decoratePost($post));

            return $p;
        });

        return response()->json($posts);
    }

    public function show(string $slug): JsonResponse
    {
        $post = BlogPost::with([
            'category',
            'author',
            'comments' => function ($q) {
                $q->with('user:id,name,avatar_url')->where('status', 'approved')->orderByDesc('created_at');
            },
        ])
            ->withCount(['comments' => function ($q) {
                $q->where('status', 'approved');
            }])
            ->where('is_published', true)
            ->where('slug', $slug)
            ->firstOrFail();

        $post->increment('views');
        $post->refresh()->load([
            'category',
            'author',
            'comments' => function ($q) {
                $q->with('user:id,name,avatar_url')->where('status', 'approved')->orderByDesc('created_at');
            },
        ])->loadCount(['comments' => function ($q) {
            $q->where('status', 'approved');
        }]);

        return response()->json($this->decoratePost($post));
    }

    public function storeComment(string $slug, Request $request): JsonResponse
    {
        $user = $request->user('sanctum');

        $post = BlogPost::query()
            ->where('is_published', true)
            ->where('slug', $slug)
            ->firstOrFail();

        $data = $request->validate([
            'author_name' => [$user ? 'nullable' : 'required', 'string', 'max:120'],
            'author_email' => ['nullable', 'email', 'max:255'],
            'content' => ['required', 'string', 'min:2', 'max:2000'],
        ]);

        $comment = BlogComment::query()->create([
            'blog_post_id' => $post->id,
            'user_id' => $user?->id,
            'author_name' => $user?->name ?? trim((string) ($data['author_name'] ?? 'Khach')),
            'author_email' => $user?->email ?? ($data['author_email'] ?? null),
            'content' => trim((string) $data['content']),
            'status' => 'approved',
        ]);

        return response()->json($comment->load('user:id,name,avatar_url'), 201);
    }

    public function categories(): JsonResponse
    {
        $categories = \Illuminate\Support\Facades\Cache::remember('blog_categories_all', 300, function () {
            return BlogCategory::orderBy('sort_order', 'asc')->get();
        });

        return response()->json($categories);
    }

    private function decoratePost(BlogPost $post): BlogPost
    {
        if (! $post->reading_time) {
            $words = str_word_count(strip_tags((string) $post->content));
            $post->reading_time = max(1, (int) ceil($words / 220));
        }

        $post->setAttribute('excerpt', $post->excerpt ?: Str::limit(strip_tags((string) $post->content), 180));

        return $post;
    }
}
