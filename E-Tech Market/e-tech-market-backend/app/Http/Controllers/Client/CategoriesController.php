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
        $categories = Category::query()
            ->where('is_active', true)
            ->whereNull('parent_id')
            ->orderBy('sort_order')
            ->with([
                'children' => fn($q) => $q->where('is_active', true)->orderBy('sort_order'),
            ])
            ->get();

        return response()->json($categories);
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

