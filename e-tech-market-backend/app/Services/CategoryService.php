<?php

namespace App\Services;

use App\Models\Category;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CategoryService
{
    /**
     * Get all categories, optionally filtered by type.
     */
    public function getAllCategories(?string $type = null)
    {
        $query = Category::query();
        if ($type) {
            $query->where('type', $type);
        }
        return $query->orderBy('name')->get();
    }

    /**
     * Create a new category.
     */
    public function createCategory(array $data, $imageFile = null): Category
    {
        if (empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        if ($imageFile) {
            $path = $imageFile->store('categories', 'public');
            $data['image'] = '/storage/' . $path;
        }

        return Category::create($data);
    }

    /**
     * Update an existing category.
     */
    public function updateCategory(Category $category, array $data, $imageFile = null): Category
    {
        if ($imageFile) {
            if ($category->image && str_starts_with($category->image, '/storage/')) {
                Storage::disk('public')->delete(str_replace('/storage/', '', $category->image));
            }
            $path = $imageFile->store('categories', 'public');
            $data['image'] = '/storage/' . $path;
        }

        $category->update($data);
        return $category;
    }

    /**
     * Delete a category.
     * Throws an exception if the category has children.
     */
    public function deleteCategory(Category $category): void
    {
        if ($category->children()->count() > 0) {
            throw new \Exception('Cannot delete category with sub-categories');
        }

        $category->delete();
    }

    /**
     * Get active category tree, optionally filtered by type and cached.
     */
    public function getActiveCategoryTree(string $type = 'product'): array
    {
        $cacheKey = "categories_tree_{$type}";

        return \Illuminate\Support\Facades\Cache::remember($cacheKey, 300, function () use ($type) {
            $all = Category::query()
                ->where('is_active', true)
                ->where('type', $type)
                ->orderBy('sort_order')
                ->get();

            return $this->buildCategoryTree($all);
        });
    }

    private function buildCategoryTree($categories, $parentId = null): array
    {
        $branch = [];

        foreach ($categories as $category) {
            if ($category->parent_id == $parentId) {
                $children = $this->buildCategoryTree($categories, $category->id);
                $category->setRelation('children', collect($children));
                $branch[] = $category;
            }
        }

        return $branch;
    }

    /**
     * Get a single category with its active children and products.
     */
    public function getCategoryWithRelations(Category $category, ?string $type = null): Category
    {
        if ($type !== null && $category->type !== $type) {
            throw new \Exception('Category not found', 404);
        }

        if (! $category->is_active) {
            throw new \Exception('Category not active', 404);
        }

        $category->load([
            'children' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order'),
            'products' => fn ($q) => $q->where('is_active', true)->orderBy('created_at', 'desc'),
        ]);

        return $category;
    }
}
