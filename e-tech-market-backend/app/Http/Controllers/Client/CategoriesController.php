<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoriesController extends Controller
{
    public function __construct(private \App\Services\CategoryService $categoryService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $type = $request->get('type', 'product');
        $orderByReviews = $request->get('order_by_reviews', false);

        // If order_by_reviews is true, get categories ordered by most reviews (for homepage tabs)
        if ($orderByReviews) {
            $limit = $request->get('limit', 5);
            $tree = $this->categoryService->getCategoriesOrderedByReviews($type, (int) $limit);
            return response()->json($tree);
        }

        $tree = $this->categoryService->getActiveCategoryTree($type);

        return response()->json($tree);
    }

    public function show(Category $category, Request $request): JsonResponse
    {
        try {
            $type = $request->get('type', null);
            $category = $this->categoryService->getCategoryWithRelations($category, $type);
            return response()->json($category);
        } catch (\Exception $e) {
            $code = $e->getCode() ?: 404;
            abort($code, $e->getMessage());
        }
    }
}
