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
    public function index(): JsonResponse
    {
        $type = request()->get('type', null);
        $query = Category::query();
        if ($type) {
            $query->where('type', $type);
        }
        $categories = $query->orderBy('name')->get();

        return response()->json($categories);
    }

    public function store(StoreCategoryRequest $request): JsonResponse
    {
        $data = $request->validated();

        if (empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('categories', 'public');
            $data['image'] = '/storage/'.$path;
        }

        $category = Category::create($data);

        return response()->json((new CategoryResource($category))->resolve(), 201);
    }

    public function update(UpdateCategoryRequest $request, Category $category): JsonResponse
    {
        $data = $request->validated();

        if ($request->hasFile('image')) {
            if ($category->image && str_starts_with($category->image, '/storage/')) {
                Storage::disk('public')->delete(str_replace('/storage/', '', $category->image));
            }
            $path = $request->file('image')->store('categories', 'public');
            $data['image'] = '/storage/'.$path;
        }

        $category->update($data);

        return response()->json((new CategoryResource($category))->resolve());
    }

    public function destroy(Category $category): JsonResponse
    {
        // Prevent deleting if it has children
        if ($category->children()->count() > 0) {
            return response()->json(['message' => 'Cannot delete category with sub-categories'], 422);
        }

        $category->delete();

        return response()->json(['message' => 'Category deleted']);
    }
}
