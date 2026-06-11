<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCategoryRequest;
use App\Http\Requests\Admin\UpdateCategoryRequest;
use App\Http\Resources\Admin\CategoryResource;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CategoriesController extends Controller
{
    public function __construct(private \App\Services\CategoryService $categoryService)
    {
    }

    public function index(): JsonResponse
    {
        $type = request()->get('type', null);
        $categories = $this->categoryService->getAllCategories($type);

        return response()->json($categories);
    }

    public function store(StoreCategoryRequest $request): JsonResponse
    {
        $category = $this->categoryService->createCategory(
            $request->validated(),
            $request->file('image')
        );

        return response()->json((new CategoryResource($category))->resolve(), 201);
    }

    public function update(UpdateCategoryRequest $request, Category $category): JsonResponse
    {
        $updatedCategory = $this->categoryService->updateCategory(
            $category,
            $request->validated(),
            $request->file('image')
        );

        return response()->json((new CategoryResource($updatedCategory))->resolve());
    }

    public function destroy(Category $category): JsonResponse
    {
        try {
            $this->categoryService->deleteCategory($category);
            return response()->json(['message' => 'Category deleted']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}
