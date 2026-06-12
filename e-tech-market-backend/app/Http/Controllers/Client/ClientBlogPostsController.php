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
    public function __construct(private \App\Services\BlogPostService $blogPostService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['category_id']);
        $posts = $this->blogPostService->getClientPosts($filters, (int) $request->get('per_page', 9));

        return response()->json($posts);
    }

    public function show(string $slug): JsonResponse
    {
        try {
            $post = $this->blogPostService->getClientPost($slug);
            return response()->json($post);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Not found'], 404);
        }
    }

    public function storeComment(string $slug, Request $request): JsonResponse
    {
        $user = $request->user('sanctum');

        $data = $request->validate([
            'author_name' => [$user ? 'nullable' : 'required', 'string', 'max:120'],
            'author_email' => ['nullable', 'email', 'max:255'],
            'content' => ['required', 'string', 'min:2', 'max:2000'],
        ]);

        try {
            $comment = $this->blogPostService->storeComment($slug, $data, $user);
            return response()->json($comment->load('user:id,name,avatar_url'), 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Post not found'], 404);
        }
    }

    public function categories(): JsonResponse
    {
        $categories = $this->blogPostService->getCategories();
        return response()->json($categories);
    }
}
