<?php

namespace Tests\Feature;

use App\Models\BlogPost;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BlogEngagementTest extends TestCase
{
    use DatabaseTransactions;

    public function test_blog_post_show_increments_views_and_accepts_comments(): void
    {
        $post = BlogPost::query()->create([
            'title' => 'Test blog post',
            'slug' => 'test-blog-'.Str::random(8),
            'content' => str_repeat('word ', 500),
            'is_published' => true,
            'published_at' => now(),
            'views' => 0,
            'reading_time' => 0,
        ]);

        $this->getJson('/api/blog/posts/'.$post->slug)
            ->assertOk()
            ->assertJsonPath('views', 1)
            ->assertJsonPath('reading_time', 3);

        $this->postJson('/api/blog/posts/'.$post->slug.'/comments', [
            'author_name' => 'Nguyen Van A',
            'author_email' => 'a@example.com',
            'content' => 'Bai viet huu ich.',
        ])->assertCreated()
            ->assertJsonPath('author_name', 'Nguyen Van A');

        $this->assertDatabaseHas('blog_comments', [
            'blog_post_id' => $post->id,
            'author_email' => 'a@example.com',
            'status' => 'approved',
        ]);
    }

    public function test_authenticated_comment_uses_account_identity(): void
    {
        $post = BlogPost::query()->create([
            'title' => 'Authenticated comment post',
            'slug' => 'auth-comment-'.Str::random(8),
            'content' => 'Body',
            'is_published' => true,
            'published_at' => now(),
        ]);
        $user = User::factory()->create([
            'name' => 'Tran Thi B',
            'email' => 'tranb@example.com',
            'is_active' => true,
        ]);

        Sanctum::actingAs($user);

        $this->postJson('/api/blog/posts/'.$post->slug.'/comments', [
            'content' => 'Binh luan tu tai khoan.',
        ])->assertCreated()
            ->assertJsonPath('author_name', 'Tran Thi B')
            ->assertJsonPath('author_email', 'tranb@example.com');
    }
}
