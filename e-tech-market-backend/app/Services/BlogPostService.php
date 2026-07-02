<?php

namespace App\Services;

use App\Models\BlogCategory;
use App\Models\BlogComment;
use App\Models\BlogPost;
use App\Models\User;
use App\Support\HtmlSanitizer;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class BlogPostService
{
    /**
     * Get paginated blog posts for admin.
     */
    public function getAdminPosts(int $perPage = 15)
    {
        return BlogPost::with(['category', 'author'])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    /**
     * Create a new blog post.
     */
    public function createPost(array $data, User $author): BlogPost
    {
        $post = new BlogPost();
        $post->title = $data['title'];
        $post->slug = Str::slug($data['title']).'-'.uniqid();
        $post->blog_category_id = $data['blog_category_id'];
        $post->excerpt = $data['excerpt'] ?? null;
        $post->content = HtmlSanitizer::sanitize($data['content']) ?? '';
        $post->thumbnail_url = $data['thumbnail_url'] ?? null;
        $post->author_id = $author->id;

        $isPublished = isset($data['is_published']) && $data['is_published'];
        if ($isPublished) {
            $post->published_at = now();
        }
        $post->is_published = $isPublished;

        $post->save();

        if ($isPublished) {
            $this->notifySubscribers($post);
        }

        return $post;
    }

    /**
     * Update an existing blog post.
     */
    public function updatePost(BlogPost $post, array $data): BlogPost
    {
        if (isset($data['title'])) {
            $post->title = $data['title'];
            $post->slug = Str::slug($data['title']).'-'.uniqid();
        }

        if (isset($data['blog_category_id'])) {
            $post->blog_category_id = $data['blog_category_id'];
        }

        if (array_key_exists('excerpt', $data)) {
            $post->excerpt = $data['excerpt'];
        }

        if (isset($data['content'])) {
            $post->content = HtmlSanitizer::sanitize($data['content']) ?? '';
        }

        if (array_key_exists('thumbnail_url', $data)) {
            $post->thumbnail_url = $data['thumbnail_url'];
        }

        $wasPublished = $post->is_published;
        if (isset($data['is_published'])) {
            $isPublished = (bool) $data['is_published'];
            if ($isPublished && ! $wasPublished) {
                $post->published_at = now();
            } elseif (! $isPublished) {
                $post->published_at = null;
            }
            $post->is_published = $isPublished;
        }

        $post->save();

        if (isset($data['is_published']) && !empty($isPublished) && ! $wasPublished) {
            $this->notifySubscribers($post);
        }

        return $post;
    }

    /**
     * Delete a blog post.
     */
    public function deletePost(BlogPost $post): void
    {
        $post->delete();
    }

    /**
     * Create a blog category.
     */
    public function createCategory(array $data): BlogCategory
    {
        $data['slug'] = Str::slug($data['name']).'-'.uniqid();
        $data['sort_order'] = $data['sort_order'] ?? 0;

        $category = BlogCategory::create($data);
        Cache::forget('blog_categories_all');
        
        return $category;
    }

    /**
     * Update a blog category.
     */
    public function updateCategory(BlogCategory $category, array $data): BlogCategory
    {
        if (isset($data['name'])) {
            $category->name = $data['name'];
            $category->slug = Str::slug($data['name']).'-'.uniqid();
        }

        if (isset($data['sort_order'])) {
            $category->sort_order = $data['sort_order'];
        }

        $category->save();
        Cache::forget('blog_categories_all');

        return $category;
    }

    /**
     * Delete a blog category.
     */
    public function deleteCategory(BlogCategory $category): void
    {
        $category->delete();
        Cache::forget('blog_categories_all');
    }

    /**
     * Get paginated published blog posts for client.
     */
    public function getClientPosts(array $filters, int $perPage = 9)
    {
        $cacheKey = 'blog_posts_index_'.md5(serialize($filters));

        return Cache::remember($cacheKey, 300, function () use ($filters, $perPage) {
            $query = BlogPost::with(['category', 'author'])
                ->withCount(['comments' => function ($q) {
                    $q->where('status', 'approved');
                }])
                ->where('is_published', true)
                ->whereNotNull('published_at')
                ->where('published_at', '<=', now());

            if (!empty($filters['category_id'])) {
                $query->where('blog_category_id', $filters['category_id']);
            }

            $p = $query->orderBy('published_at', 'desc')
                ->paginate($perPage);

            $p->getCollection()->transform(fn (BlogPost $post) => $this->decoratePost($post));

            return $p;
        });
    }

    /**
     * Get single published blog post by slug for client.
     */
    public function getClientPost(string $slug): BlogPost
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

        return $this->decoratePost($post);
    }

    /**
     * Store comment on a blog post.
     */
    public function storeComment(string $slug, array $data, ?User $user): BlogComment
    {
        $post = BlogPost::query()
            ->where('is_published', true)
            ->where('slug', $slug)
            ->firstOrFail();

        return BlogComment::query()->create([
            'blog_post_id' => $post->id,
            'user_id' => $user?->id,
            'author_name' => $user?->name ?? trim((string) ($data['author_name'] ?? 'Khach')),
            'author_email' => $user?->email ?? ($data['author_email'] ?? null),
            'content' => trim((string) $data['content']),
            'status' => 'approved',
        ]);
    }

    /**
     * Get all blog categories.
     */
    public function getCategories()
    {
        return Cache::remember('blog_categories_all', 300, function () {
            return BlogCategory::orderBy('sort_order', 'asc')->get();
        });
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

    private function notifySubscribers(BlogPost $post): void
    {
        $emails = \App\Models\NewsletterSubscription::query()
            ->whereNull('unsubscribed_at')
            ->pluck('email');

        if ($emails->isEmpty()) {
            return;
        }

        $users = User::query()
            ->whereIn('email', $emails)
            ->where('is_active', true)
            ->get();

        foreach ($users as $user) {
            \App\Models\Notification::create([
                'user_id' => $user->id,
                'type' => 'blog',
                'title' => 'Tin tức công nghệ mới!',
                'body' => 'Bài viết mới "'.$post->title.'" vừa được xuất bản. Xem ngay!',
                'data' => [
                    'post_id' => $post->id,
                    'post_slug' => $post->slug,
                    'action_url' => '/blog/'.$post->slug,
                ],
            ]);
        }
    }
}
