<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreBlogCategoryRequest;
use App\Http\Requests\Admin\StoreBlogPostRequest;
use App\Http\Requests\Admin\UpdateBlogPostRequest;
use App\Http\Resources\Admin\BlogPostResource;
use App\Models\BlogCategory;
use App\Models\BlogPost;
use App\Support\HtmlSanitizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminBlogPostsController extends Controller
{
    public function __construct(private \App\Services\BlogPostService $blogPostService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $posts = $this->blogPostService->getAdminPosts((int) $request->get('per_page', 15));
        return response()->json($posts);
    }

    public function show(BlogPost $blogPost): JsonResponse
    {
        $blogPost->load(['category', 'author']);

        return response()->json((new BlogPostResource($blogPost))->resolve());
    }

    public function store(StoreBlogPostRequest $request): JsonResponse
    {
        $post = $this->blogPostService->createPost($request->validated(), $request->user());

        return response()->json($post, 201);
    }

    public function update(UpdateBlogPostRequest $request, BlogPost $blogPost): JsonResponse
    {
        $updatedPost = $this->blogPostService->updatePost($blogPost, $request->validated());

        return response()->json((new BlogPostResource($updatedPost))->resolve());
    }

    public function destroy(BlogPost $blogPost): JsonResponse
    {
        $this->blogPostService->deletePost($blogPost);

        return response()->json(['message' => 'Post deleted successfully']);
    }

    public function storeCategory(StoreBlogCategoryRequest $request): JsonResponse
    {
        $category = $this->blogPostService->createCategory($request->validated());

        return response()->json($category->toArray(), 201);
    }

    public function updateCategory(StoreBlogCategoryRequest $request, BlogCategory $category): JsonResponse
    {
        $updatedCategory = $this->blogPostService->updateCategory($category, $request->validated());

        return response()->json($updatedCategory->toArray());
    }

    public function destroyCategory(BlogCategory $category): JsonResponse
    {
        $this->blogPostService->deleteCategory($category);

        return response()->json(['message' => 'Category deleted successfully']);
    }
}
