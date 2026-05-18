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
        $tree = \Illuminate\Support\Facades\Cache::remember('categories_tree', 300, function () {
            $all = Category::query()
                ->where('is_active', true)
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
            'children' => fn($q) => $q->where('is_active', true)->orderBy('sort_order'),
            'products' => fn($q) => $q->where('is_active', true)->orderBy('created_at', 'desc'),
        ]);

        if (!$category->is_active) {
            return response()->json(['message' => 'Category not active'], 404);
        }

        return response()->json($category);
    }
}

