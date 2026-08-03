<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Category;
use App\Models\TradeInCondition;
use App\Models\TradeInRequest;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class TradeInController extends Controller
{
    public function getCategories()
    {
        $categories = Category::whereIn('slug', ['dien-thoai', 'laptop'])->get();
        return response()->json([
            'status' => 'success',
            'data' => $categories
        ]);
    }

    public function getConditions(Request $request)
    {
        $query = TradeInCondition::where('is_active', true)->orderBy('sort_order');
        if ($request->category_id) {
            $query->where('category_id', $request->category_id);
        }
        return response()->json([
            'status' => 'success',
            'data' => $query->get()
        ]);
    }

    public function submitRequest(Request $request)
    {
        $request->validate([
            'category_id' => 'required|exists:categories,id',
            'machine_info' => 'required|string',
            'customer_name' => 'required|string|max:255',
            'customer_phone' => 'required|string|max:30',
            'customer_email' => 'required|email|max:255',
            'condition_ids' => 'nullable|string', // có thể được gửi dưới dạng chuỗi JSON hoặc array
            'images' => 'required|array|min:1',
            'images.*' => 'image|mimes:jpeg,png,jpg,webp|max:5120'
        ]);

        $imagePaths = [];
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $file) {
                $path = $file->store('trade-in', 'public');
                $imagePaths[] = '/storage/' . $path;
            }
        }

        $tradeInRequest = TradeInRequest::create([
            'request_code' => 'TI' . strtoupper(Str::random(8)),
            'user_id' => auth('sanctum')->check() ? auth('sanctum')->id() : null,
            'category_id' => $request->category_id,
            'machine_info' => $request->machine_info,
            'images' => $imagePaths,
            'customer_name' => $request->customer_name,
            'customer_phone' => $request->customer_phone,
            'customer_email' => $request->customer_email,
            'status' => 'pending'
        ]);

        // Parsing condition_ids from formData
        $conditionIds = [];
        if ($request->condition_ids) {
            $parsed = json_decode($request->condition_ids, true);
            if (is_array($parsed)) {
                $conditionIds = $parsed;
            } else if (is_array($request->condition_ids)) {
                $conditionIds = $request->condition_ids;
            }
            if (!empty($conditionIds)) {
                $tradeInRequest->conditions()->sync($conditionIds);
            }
        }

        // Tạo thông báo cho các Admin
        $admins = User::whereHas('roles', function($q) {
            $q->whereIn('slug', ['admin', 'warehouse-staff']);
        })->get();

        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'type' => 'trade_in_new',
                'title' => 'Yêu cầu thu cũ đổi mới mới',
                'body' => "Khách hàng {$request->customer_name} vừa gửi yêu cầu định giá máy cũ ({$request->machine_info}).",
                'data' => [
                    'request_id' => $tradeInRequest->id,
                    'request_code' => $tradeInRequest->request_code
                ],
            ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Yêu cầu định giá máy cũ đã được gửi. Admin sẽ phản hồi qua email.',
            'data' => $tradeInRequest->load('conditions')
        ]);
    }

    public function history(Request $request)
    {
        $userId = auth('sanctum')->id();
        if (!$userId) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 401);
        }

        $requests = TradeInRequest::with(['category', 'conditions'])
            ->where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $requests
        ]);
    }

    public function acceptQuote($id)
    {
        $userId = auth('sanctum')->id();
        if (!$userId) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 401);
        }

        $tradeIn = TradeInRequest::where('id', $id)->where('user_id', $userId)->first();
        if (!$tradeIn) {
            return response()->json(['status' => 'error', 'message' => 'Không tìm thấy yêu cầu'], 404);
        }

        if ($tradeIn->status !== 'quoted') {
            return response()->json(['status' => 'error', 'message' => 'Trạng thái không hợp lệ'], 400);
        }

        $tradeIn->status = 'approved';
        $tradeIn->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Đã xác nhận mức giá'
        ]);
    }
}
