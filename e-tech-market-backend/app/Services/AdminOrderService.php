<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Support\ProductInventorySync;
use Illuminate\Support\Carbon;
use Illuminate\Pagination\LengthAwarePaginator;
use App\Models\OrderReturnRequest;
use Illuminate\Support\Facades\Mail;
use App\Mail\DeliveryAssignedEmail;
use App\Models\User;

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
            'body' => 'Admin đã phê duyệt yêu cầu hoàn trả cho đơn #'.($order->order_code ?: ('ET-'.$order->id)).'.',
            'data' => [
                'order_id' => (int) $order->id,
                'order_code' => (string) ($order->order_code ?: ('ET-'.$order->id)),
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
            'body' => 'Admin đã từ chối yêu cầu hoàn trả cho đơn #'.($order->order_code ?: ('ET-'.$order->id)).'.',
            'data' => [
                'order_id' => (int) $order->id,
                'order_code' => (string) ($order->order_code ?: ('ET-'.$order->id)),
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
            if (! $f) {
                continue;
            }
            $mime = (string) ($f->getMimeType() ?? '');
            $isVideo = str_starts_with(strtolower($mime), 'video/');
            $type = $isVideo ? 'video' : 'image';
            $path = $f->storePublicly('returns/'.(int) $order->id.'/refund-proof', ['disk' => 'public']);
            $proofMeta[] = [
                'type' => $type,
                'url' => '/storage/'.ltrim($path, '/'),
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
            'body' => 'Admin đã hoàn tiền cho yêu cầu hoàn trả của đơn #'.($order->order_code ?: ('ET-'.$order->id)).'.',
            'data' => [
                'order_id' => (int) $order->id,
                'order_code' => (string) ($order->order_code ?: ('ET-'.$order->id)),
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
                    $variant = ProductVariant::find((int) $item->variant_id);
                    if ($variant instanceof ProductVariant) {
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

        $oldDeliveryStaffId = $order->delivery_staff_id;

        if (array_key_exists('delivery_staff_id', $data)) {
            $order->delivery_staff_id = $data['delivery_staff_id'] ? (int) $data['delivery_staff_id'] : null;
        }

        $order->save();

        if ($order->delivery_staff_id && $order->delivery_staff_id !== $oldDeliveryStaffId) {
            $staff = User::find($order->delivery_staff_id);
            if ($staff && $staff->email) {
                Mail::to($staff->email)->send(new DeliveryAssignedEmail($order));
            }
        }

        $newStatus = strtolower((string) ($order->status ?? ''));
        if ($newStatus !== '' && $newStatus !== $prevStatus) {
            OrderStatusHistory::create([
                'order_id' => (int) $order->id,
                'from_status' => $prevStatus !== '' ? $prevStatus : null,
                'to_status' => $newStatus,
                'changed_by_user_id' => $adminId,
                'note' => isset($data['status_note']) && $data['status_note'] !== null ? (string) $data['status_note'] : null,
            ]);

            if (in_array($newStatus, ['delivered', 'completed'], true)) {
                $email = $order->user?->email ?? null;
                if ($email) {
                    \Illuminate\Support\Facades\Notification::route('mail', $email)->notify(new \App\Notifications\OrderStatusUpdatedNotification($order));
                }
            }
        }

        return $order;
    }

    public function getAdminOrders(array $filters, int $perPage = 10, int $page = 1, ?User $user = null): array
    {
        app(\App\Services\OrderService::class)->pruneExpiredUnpaidOrders();

        $qCode = trim((string) ($filters['order_code'] ?? ''));
        $qCustomer = trim((string) ($filters['customer'] ?? ''));
        $status = trim((string) ($filters['status'] ?? ''));
        $paymentMethod = trim((string) ($filters['payment_method'] ?? ''));
        $paymentStatus = trim((string) ($filters['payment_status'] ?? ''));
        $dateFrom = trim((string) ($filters['date_from'] ?? ''));
        $dateTo = trim((string) ($filters['date_to'] ?? ''));
        $returnRequests = trim((string) ($filters['return_requests'] ?? ''));

        $query = Order::query()
            ->with(['user:id,name,avatar_url', 'payment:id,order_id,method,status'])
            ->with(['items:id,order_id,product_name_snapshot,quantity'])
            ->with(['returnRequest:id,order_id,status']);

        // Check if user is ONLY a delivery staff (doesn't have admin/order-staff roles)
        $isOnlyDelivery = false;
        if ($user) {
            $roles = $user->roles->pluck('slug')->toArray();
            if (in_array('delivery', $roles) && !in_array('admin', $roles) && !in_array('order-staff', $roles)) {
                $isOnlyDelivery = true;
            }
        }

        if ($isOnlyDelivery) {
            // Delivery staff only sees their assigned orders, and sort by updated_at (most recently updated/assigned first)
            $query->where('delivery_staff_id', $user->id)
                  ->orderByDesc('updated_at');
        } else {
            $query->orderByDesc('created_at');
        }

        if ($qCode !== '') {
            $query->where('order_code', 'ilike', '%'.$qCode.'%');
        }

        if ($qCustomer !== '') {
            $query->where(function ($qq) use ($qCustomer) {
                $qq->where('shipping_name', 'ilike', '%'.$qCustomer.'%')
                    ->orWhereHas('user', function ($u) use ($qCustomer) {
                        $u->where('name', 'ilike', '%'.$qCustomer.'%');
                    });
            });
        }

        if ($status !== '' && $status !== 'all') {
            $query->where('status', '=', $status);
        }

        if ($paymentStatus !== '' && $paymentStatus !== 'all') {
            $query->where('payment_status', '=', $paymentStatus);
        }

        if ($paymentMethod !== '' && $paymentMethod !== 'all') {
            $query->whereHas('payment', function ($p) use ($paymentMethod) {
                $p->where('method', '=', $paymentMethod);
            });
        }

        if ($returnRequests !== '' && $returnRequests !== '0' && $returnRequests !== 'false') {
            if ($returnRequests === '1' || $returnRequests === 'true') {
                $query->whereHas('returnRequest');
            } else {
                $query->whereHas('returnRequest', function ($r) use ($returnRequests) {
                    $r->where('status', '=', $returnRequests);
                });
            }
        }

        $parseDate = static function (string $s): ?Carbon {
            try {
                if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $s)) {
                    return Carbon::parse($s);
                }
                if (preg_match('/^\d{2}\/\d{2}\/\d{4}$/', $s)) {
                    return Carbon::createFromFormat('d/m/Y', $s);
                }
                return null;
            } catch (\Throwable) {
                return null;
            }
        };

        $from = $dateFrom !== '' ? $parseDate($dateFrom) : null;
        $to = $dateTo !== '' ? $parseDate($dateTo) : null;
        if ($from) {
            $query->where('created_at', '>=', $from->startOfDay());
        }
        if ($to) {
            $query->where('created_at', '<=', $to->endOfDay());
        }

        $paginator = $query->paginate($perPage, ['*'], 'page', $page);

        $statsBase = Order::query();
        $stats = [
            'total' => (int) $statsBase->count(),
            'pending' => (int) Order::query()->where('status', 'pending')->count(),
            'processing' => (int) Order::query()->where('status', 'processing')->count(),
            'completed' => (int) Order::query()->where('status', 'completed')->count(),
            'canceled' => (int) Order::query()->whereIn('status', ['cancelled', 'returned'])->count(),
            'return_requests_pending' => (int) OrderReturnRequest::query()->where('status', 'pending')->count(),
        ];

        return [
            'paginator' => $paginator,
            'stats' => $stats,
        ];
    }
}
