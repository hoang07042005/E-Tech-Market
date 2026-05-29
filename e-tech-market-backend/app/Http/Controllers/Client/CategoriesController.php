<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoriesController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $type = $request->get('type', 'product');
        $cacheKey = "categories_tree_{$type}";

        $tree = \Illuminate\Support\Facades\Cache::remember($cacheKey, 300, function () use ($type) {
            $all = Category::query()
                ->where('is_active', true)
                ->where('type', $type)
                ->orderBy('sort_order')
                ->get();

            return $this->buildCategoryTree($all);
        });

        return response()->json($tree);
    }

    private function buildCategoryTree($categories, $parentId = null): array
    {
        $branch = [];

        foreach ($categories as $category) {
            if ($category->parent_id == $parentId) {
                $children = $this->buildCategoryTree($categories, $category->id);
                // We manually set the relation 'children' so it appears in the JSON output
                $category->setRelation('children', collect($children));
                $branch[] = $category;
            }
        }

        return $branch;
    }

    public function show(Category $category, Request $request): JsonResponse
    {
        $category->load([
            'children' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order'),
            'products' => fn ($q) => $q->where('is_active', true)->orderBy('created_at', 'desc'),
        ]);

        $type = $request->get('type', null);
        if ($type !== null && $category->type !== $type) {
            return response()->json(['message' => 'Category not found'], 404);
        }

        if (! $category->is_active) {
            return response()->json(['message' => 'Category not active'], 404);
        }

        return response()->json($category);
    }
}
