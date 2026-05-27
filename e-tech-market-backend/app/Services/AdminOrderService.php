<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderReturnRequest;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\OrderStatusHistory;
use App\Models\Notification;
use App\Support\ProductInventorySync;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class AdminOrderService
{
    public function approveReturnRequest(Order $order, ?string $adminNote, ?int $adminId): Order
    {
        $order->returnRequest->status = 'approved';
        if ($adminNote !== null) {
            $order->returnRequest->admin_note = $adminNote;
        }
        $order->returnRequest->approved_by_user_id = $adminId;
        $order->returnRequest->approved_at = now();
        $order->returnRequest->save();

        Notification::create([
            'user_id' => (int) $order->user_id,
            'type' => 'order_return_approved',
            'title' => 'Yêu cầu hoàn trả đã được phê duyệt',
            'body' => 'Admin đã phê duyệt yêu cầu hoàn trả cho đơn #' . ($order->order_code ?: ('ET-' . $order->id)) . '.',
            'data' => [
                'order_id' => (int) $order->id,
                'order_code' => (string) ($order->order_code ?: ('ET-' . $order->id)),
                'return_request_status' => 'approved',
            ],
            'read_at' => null,
        ]);

        return $order;
    }

    public function rejectReturnRequest(Order $order, string $adminNote, ?int $adminId): Order
    {
        $order->returnRequest->status = 'rejected';
        $order->returnRequest->admin_note = $adminNote;
        $order->returnRequest->approved_by_user_id = $adminId;
        $order->returnRequest->approved_at = now();
        $order->returnRequest->save();

        Notification::create([
            'user_id' => (int) $order->user_id,
            'type' => 'order_return_rejected',
            'title' => 'Yêu cầu hoàn trả bị từ chối',
            'body' => 'Admin đã từ chối yêu cầu hoàn trả cho đơn #' . ($order->order_code ?: ('ET-' . $order->id)) . '.',
            'data' => [
                'order_id' => (int) $order->id,
                'order_code' => (string) ($order->order_code ?: ('ET-' . $order->id)),
                'return_request_status' => 'rejected',
                'admin_note' => $adminNote,
            ],
            'read_at' => null,
        ]);

        return $order;
    }

    public function markReturnRefunded(Order $order, ?string $adminNote, array $files, ?int $adminId): Order
    {
        $proofMeta = [];
        foreach ($files as $f) {
            if (!$f) continue;
            $mime = (string) ($f->getMimeType() ?? '');
            $isVideo = str_starts_with(strtolower($mime), 'video/');
            $type = $isVideo ? 'video' : 'image';
            $path = $f->storePublicly('returns/' . (int) $order->id . '/refund-proof', ['disk' => 'public']);
            $proofMeta[] = [
                'type' => $type,
                'url' => '/storage/' . ltrim($path, '/'),
                'original_name' => (string) ($f->getClientOriginalName() ?? ''),
                'mime' => $mime !== '' ? $mime : null,
                'size' => (int) ($f->getSize() ?? 0),
            ];
        }

        $order->returnRequest->status = 'refunded';
        if ($adminNote !== null) {
            $order->returnRequest->admin_note = $adminNote;
        }
        $order->returnRequest->refund_proof = $proofMeta;
        $order->returnRequest->refunded_at = now();
        $order->returnRequest->save();

        Notification::create([
            'user_id' => (int) $order->user_id,
            'type' => 'order_return_refunded',
            'title' => 'Đơn hàng đã được hoàn tiền',
            'body' => 'Admin đã hoàn tiền cho yêu cầu hoàn trả của đơn #' . ($order->order_code ?: ('ET-' . $order->id)) . '.',
            'data' => [
                'order_id' => (int) $order->id,
                'order_code' => (string) ($order->order_code ?: ('ET-' . $order->id)),
                'return_request_status' => 'refunded',
                'refund_proof' => $proofMeta,
                'admin_note' => $order->returnRequest->admin_note,
            ],
            'read_at' => null,
        ]);

        $prevStatus = strtolower((string) ($order->status ?? ''));
        if ($prevStatus !== 'returned') {
            $order->status = 'returned';
            $order->save();

            $order->loadMissing('items');
            $productIdsToSync = [];
            foreach ($order->items as $item) {
                if ($item->variant_id) {
                    $variant = ProductVariant::find($item->variant_id);
                    if ($variant) {
                        $variant->stock_quantity = (int) ($variant->stock_quantity ?? 0) + (int) $item->quantity;
                        $variant->save();
                        $productIdsToSync[$variant->product_id] = true;
                    }
                }
            }
            foreach (array_keys($productIdsToSync) as $pid) {
                $p = Product::find($pid);
                if ($p) {
                    ProductInventorySync::syncFromVariants($p, 'order_returned');
                }
            }

            OrderStatusHistory::create([
                'order_id' => (int) $order->id,
                'from_status' => $prevStatus !== '' ? $prevStatus : null,
                'to_status' => 'returned',
                'changed_by_user_id' => $adminId,
                'note' => 'Hoàn tiền yêu cầu hoàn trả',
            ]);
        }

        return $order;
    }

    public function updateOrderStatus(Order $order, array $data, ?int $adminId): Order
    {
        $prevStatus = strtolower((string) ($order->status ?? ''));
        $status = isset($data['status']) ? strtolower(trim((string) $data['status'])) : null;
        if ($status !== null && $status !== '') {
            $order->status = $status;
        }

        if (array_key_exists('notes', $data)) {
            $order->notes = $data['notes'] !== null ? (string) $data['notes'] : null;
        }

        $order->save();

        $newStatus = strtolower((string) ($order->status ?? ''));
        if ($newStatus !== '' && $newStatus !== $prevStatus) {
            OrderStatusHistory::create([
                'order_id' => (int) $order->id,
                'from_status' => $prevStatus !== '' ? $prevStatus : null,
                'to_status' => $newStatus,
                'changed_by_user_id' => $adminId,
                'note' => isset($data['status_note']) && $data['status_note'] !== null ? (string) $data['status_note'] : null,
            ]);
        }

        return $order;
    }
}
