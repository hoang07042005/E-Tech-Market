<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\TradeInCondition;
use App\Models\TradeInRequest;
use App\Notifications\TradeInStatusNotification;
use Illuminate\Support\Facades\Notification;

class TradeInController extends Controller
{
    // --- CONDITIONS ---
    public function getConditions(): JsonResponse
    {
        $conditions = TradeInCondition::with('category')->orderBy('sort_order')->get();
        return response()->json(['status' => 'success', 'data' => $conditions]);
    }

    public function storeCondition(Request $request): JsonResponse
    {
        $data = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'deduction_percentage' => 'nullable|numeric|min:0|max:100',
            'sort_order' => 'integer',
            'is_active' => 'boolean'
        ]);

        $condition = TradeInCondition::create($data);
        return response()->json(['status' => 'success', 'data' => $condition], 201);
    }

    public function updateCondition(Request $request, int|string $id): JsonResponse
    {
        $condition = TradeInCondition::findOrFail($id);
        $data = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'deduction_percentage' => 'nullable|numeric|min:0|max:100',
            'sort_order' => 'integer',
            'is_active' => 'boolean'
        ]);

        $condition->update($data);
        return response()->json(['status' => 'success', 'data' => $condition]);
    }

    public function deleteCondition(int|string $id): JsonResponse
    {
        $condition = TradeInCondition::findOrFail($id);
        $condition->delete();
        return response()->json(['status' => 'success', 'message' => 'Deleted successfully']);
    }

    // --- REQUESTS ---
    public function getRequests(Request $request): JsonResponse
    {
        $query = TradeInRequest::with(['category', 'user', 'conditions']);
        
        if ($request->status) {
            $query->where('status', $request->status);
        }

        $requests = $query->orderBy('id', 'desc')->paginate(15);
        return response()->json(['status' => 'success', 'data' => $requests]);
    }
    
    public function showRequest(int|string $id): JsonResponse
    {
        $req = TradeInRequest::with(['category', 'user', 'conditions'])->findOrFail($id);
        return response()->json(['status' => 'success', 'data' => $req]);
    }

    public function updateRequestStatus(Request $request, int|string $id): JsonResponse
    {
        $req = TradeInRequest::findOrFail($id);
        $data = $request->validate([
            'status' => 'required|in:pending,quoted,approved,rejected,completed',
            'estimated_price' => 'nullable|numeric|min:0',
            'final_price' => 'nullable|numeric|min:0',
            'admin_note' => 'nullable|string'
        ]);

        $req->update($data);

        // Send email to customer if status is rejected or quoted
        if (in_array($data['status'], ['rejected', 'quoted']) && $req->customer_email) {
            Notification::route('mail', $req->customer_email)->notify(new TradeInStatusNotification($req));
        }

        return response()->json(['status' => 'success', 'data' => $req]);
    }
}
