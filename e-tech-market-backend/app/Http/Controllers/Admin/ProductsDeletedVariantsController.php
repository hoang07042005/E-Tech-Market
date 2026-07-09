<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProductSpec;
use App\Models\ProductShopQna;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProductsDeletedVariantsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) ($request->query('per_page', 20));
        $perPage = max(5, min(100, $perPage));

        $paginator = ProductVariant::onlyTrashed()
            ->withTrashed()
            ->orderBy('deleted_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ]);
    }

    /**
     * Hard delete trashed variants (forceDelete).
     * Also hard deletes ProductSpec + ProductShopQna related by product_id (and variants indirectly).
     */
    public function hardDelete(Request $request): JsonResponse
    {
        $data = $request->validate([
            'variant_ids' => ['required', 'array', 'min:1'],
            'variant_ids.*' => ['required', 'integer', 'distinct'],
        ]);

        $variantIds = array_map('intval', $data['variant_ids']);

        // Ensure requested variants are trashed
        $existingTrashed = ProductVariant::onlyTrashed()
            ->whereIn('id', $variantIds)
            ->pluck('id')
            ->all();

        if (count($existingTrashed) === 0) {
            throw ValidationException::withMessages([
                'variant_ids' => ['Không tìm thấy phiên bản đã xóa để xóa hẳn.'],
            ]);
        }

        DB::transaction(function () use ($existingTrashed, &$counts) {
            $counts = [
                'variants' => 0,
                'specs' => 0,
                'qna' => 0,
            ];

            $productIds = ProductVariant::onlyTrashed()
                ->whereIn('id', $existingTrashed)
                ->pluck('product_id')
                ->unique()
                ->all();

            // Hard delete specs + qna by product_id.
            // (ProductSpec has no SoftDeletes in this codebase, and Qna has no SoftDeletes.)
            $counts['specs'] = ProductSpec::query()
                ->whereIn('product_variant_id', function ($q) use ($existingTrashed) {
                    $q->select('id')
                        ->from('product_variants')
                        ->whereIn('id', $existingTrashed);
                })
                ->delete();

            $counts['qna'] = ProductShopQna::query()
                ->whereIn('product_id', $productIds)
                ->delete();

            $counts['variants'] = ProductVariant::query()
                ->onlyTrashed()
                ->whereIn('id', $existingTrashed)
                ->forceDelete();
        });

        return response()->json([
            'message' => 'Hard delete completed.',
            'counts' => $counts ?? null,
        ]);
    }
}
