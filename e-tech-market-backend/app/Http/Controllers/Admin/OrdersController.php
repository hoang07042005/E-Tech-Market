<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderReturnRequest;
use App\Models\OrderStatusHistory;
use App\Models\Notification;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class OrdersController extends Controller
{
    public function approveReturnRequest(Order $order, Request $request): JsonResponse
    {
        $order->loadMissing(['returnRequest']);
        if (!$order->returnRequest) {
            return response()->json(['message' => 'Đơn hàng chưa có yêu cầu hoàn trả.'], 422);
        }

        if ($order->returnRequest->status !== 'pending') {
            return response()->json(['message' => 'Yêu cầu hoàn trả không ở trạng thái chờ duyệt.'], 422);
        }

        $data = $request->validate([
            'admin_note' => ['nullable', 'string', 'max:4000'],
        ]);

        $order->returnRequest->status = 'approved';
        $order->returnRequest->admin_note = array_key_exists('admin_note', $data) ? ($data['admin_note'] !== null ? (string) $data['admin_note'] : null) : $order->returnRequest->admin_note;
        $order->returnRequest->approved_by_user_id = $request->user()?->id;
        $order->returnRequest->approved_at = now();
        $order->returnRequest->save();

        // Notify customer
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

        return $this->show($order);
    }

    public function rejectReturnRequest(Order $order, Request $request): JsonResponse
    {
        $order->loadMissing(['returnRequest']);
        if (!$order->returnRequest) {
            return response()->json(['message' => 'Đơn hàng chưa có yêu cầu hoàn trả.'], 422);
        }

        if ($order->returnRequest->status !== 'pending') {
            return response()->json(['message' => 'Yêu cầu hoàn trả không ở trạng thái chờ duyệt.'], 422);
        }

        $data = $request->validate([
            'admin_note' => ['required', 'string', 'min:2', 'max:4000'],
        ]);

        $order->returnRequest->status = 'rejected';
        $order->returnRequest->admin_note = (string) $data['admin_note'];
        $order->returnRequest->approved_by_user_id = $request->user()?->id;
        $order->returnRequest->approved_at = now();
        $order->returnRequest->save();

        // Notify customer
        Notification::create([
            'user_id' => (int) $order->user_id,
            'type' => 'order_return_rejected',
            'title' => 'Yêu cầu hoàn trả bị từ chối',
            'body' => 'Admin đã từ chối yêu cầu hoàn trả cho đơn #' . ($order->order_code ?: ('ET-' . $order->id)) . '.',
            'data' => [
                'order_id' => (int) $order->id,
                'order_code' => (string) ($order->order_code ?: ('ET-' . $order->id)),
                'return_request_status' => 'rejected',
                'admin_note' => (string) $data['admin_note'],
            ],
            'read_at' => null,
        ]);

        return $this->show($order);
    }

    public function markReturnRefunded(Order $order, Request $request): JsonResponse
    {
        $order->loadMissing(['returnRequest']);
        if (!$order->returnRequest) {
            return response()->json(['message' => 'Đơn hàng chưa có yêu cầu hoàn trả.'], 422);
        }

        if ($order->returnRequest->status !== 'approved') {
            return response()->json(['message' => 'Chỉ có thể hoàn tiền sau khi đã phê duyệt yêu cầu.'], 422);
        }

        $data = $request->validate([
            'admin_note' => ['nullable', 'string', 'max:4000'],
            'refund_proof' => ['nullable', 'array', 'max:8'],
            'refund_proof.*' => ['file', 'max:51200'],
        ]);

        $files = $request->file('refund_proof', []);
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
        if (array_key_exists('admin_note', $data)) {
            $order->returnRequest->admin_note = $data['admin_note'] !== null ? (string) $data['admin_note'] : $order->returnRequest->admin_note;
        }
        $order->returnRequest->refund_proof = $proofMeta;
        $order->returnRequest->refunded_at = now();
        $order->returnRequest->save();

        // Notify customer with proof
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

        // Mark order as returned after refund is processed (business workflow).
        $prevStatus = strtolower((string) ($order->status ?? ''));
        if ($prevStatus !== 'returned') {
            $order->status = 'returned';
            $order->save();

            OrderStatusHistory::create([
                'order_id' => (int) $order->id,
                'from_status' => $prevStatus !== '' ? $prevStatus : null,
                'to_status' => 'returned',
                'changed_by_user_id' => $request->user()?->id,
                'note' => 'Hoàn tiền yêu cầu hoàn trả',
            ]);
        }

        return $this->show($order);
    }
    public function update(Order $order, Request $request): JsonResponse
    {
        $data = $request->validate([
            'status' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string'],
            'status_note' => ['nullable', 'string'],
        ]);

        $prevStatus = strtolower((string) ($order->status ?? ''));
        $status = isset($data['status']) ? strtolower(trim((string) $data['status'])) : null;
        if ($status !== null && $status !== '') {
            // Must match DB CHECK constraint on orders.status (see schema-postgres.sql)
            $allowed = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'returned'];
            if (!in_array($status, $allowed, true)) {
                return response()->json(['message' => 'Status invalid'], 422);
            }

            $statusStep = static function (?string $s): int {
                $s = $s ? strtolower($s) : '';
                return match ($s) {
                    'pending' => 1,
                    'paid' => 3,
                    'processing' => 2,
                    'shipped' => 4,
                    'delivered' => 5,
                    'completed' => 6,
                    'returned' => 7,
                    'cancelled' => 0,
                    default => 1,
                };
            };

            $cur = strtolower((string) ($order->status ?? ''));
            $curStep = $statusStep($cur);
            $nextStep = $statusStep($status);

            // Terminal states cannot be changed
            if (in_array($cur, ['completed', 'cancelled', 'returned'], true) && $status !== $cur) {
                return response()->json(['message' => 'Không thể cập nhật đơn đã kết thúc (hoàn thành/hủy/hoàn trả).'], 422);
            }

            // Disallow going backwards in the normal flow:
            // pending -> processing -> paid -> shipped -> delivered -> completed
            // Cancel/Return are treated separately.
            if (!in_array($status, ['cancelled', 'returned'], true) && $curStep > 0 && $nextStep > 0 && $nextStep < $curStep) {
                return response()->json(['message' => 'Không thể cập nhật trạng thái lùi về trước.'], 422);
            }

            // "Hoàn thành" chỉ khi user xác nhận (delivered -> completed)
            if (in_array($status, ['completed', 'returned', 'cancelled'], true)) {
                return response()->json([
                    'message' => 'Admin không được chuyển trạng thái sang Hoàn thành/Hoàn trả/Hủy. Các trạng thái này chỉ phát sinh từ thao tác của khách hàng hoặc luồng nghiệp vụ riêng.',
                ], 422);
            }
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
                'changed_by_user_id' => $request->user()?->id,
                'note' => isset($data['status_note']) && $data['status_note'] !== null ? (string) $data['status_note'] : null,
            ]);
        }

        return $this->show($order);
    }
    public function show(Order $order): JsonResponse
    {
        $order->load([
            'user:id,name,email,phone,avatar_url',
            'payment:id,order_id,method,status,transaction_code,paid_at',
            'items:id,order_id,product_id,product_name_snapshot,quantity,unit_price,total_price',
            'statusHistories:id,order_id,from_status,to_status,changed_by_user_id,note,created_at',
            'statusHistories.changedBy:id,name,avatar_url',
            'returnRequest:id,order_id,user_id,status,content,media,admin_note,refund_proof,approved_by_user_id,approved_at,refunded_at,customer_confirmed_at,created_at,updated_at',
        ]);

        $statusMeta = static function (?string $s): array {
            $s = $s ? strtolower($s) : '';
            return match ($s) {
                'pending' => ['Chờ xác nhận', 'wait', 1],
                'paid' => ['Đang chuyển bị hàng', 'info', 3],
                'processing' => ['Đã xác nhận', 'info', 2],
                'shipped' => ['Đang giao', 'info', 4],
                'delivered' => ['Đã giao', 'info', 5],
                'completed' => ['Hoàn thành', 'ok', 6],
                'returned' => ['Hoàn trả', 'return', 7],
                'cancelled' => ['Hủy', 'bad', 0],
                default => [$s ?: '—', 'muted', 1],
            };
        };

        $paymentLabel = static function (?string $m): string {
            $m = $m ? strtolower($m) : '';
            return match ($m) {
                'cod' => 'COD',
                'momo' => 'Ví MoMo',
                'vnpay' => 'VNPAY',
                default => $m ?: '—',
            };
        };

        [$statusLabel, $statusTone, $statusStep] = $statusMeta((string) $order->status);

        $items = ($order->items ?? collect())->map(static function ($it) {
            return [
                'product_id' => (int) ($it->product_id ?? 0),
                'name' => (string) ($it->product_name_snapshot ?? '—'),
                'quantity' => (int) ($it->quantity ?? 0),
                'unit_price' => (float) ($it->unit_price ?? 0),
                'total_price' => (float) ($it->total_price ?? 0),
            ];
        })->values()->all();

        $productIds = collect($items)->pluck('product_id')->filter(static fn($v) => (int) $v > 0)->unique()->values();
        $productImages = Product::query()
            ->whereIn('id', $productIds)
            ->select(['id', 'main_image_url'])
            ->get()
            ->mapWithKeys(static fn($p) => [(int) $p->id => ($p->main_image_url ? (string) $p->main_image_url : null)])
            ->all();

        $items = array_map(static function (array $it) use ($productImages) {
            $pid = (int) ($it['product_id'] ?? 0);
            return [
                ...$it,
                'image_url' => $pid > 0 && array_key_exists($pid, $productImages) ? $productImages[$pid] : null,
            ];
        }, $items);

        $customerName = (string) ($order->user?->name ?: $order->shipping_name ?: '—');
        $customerAvatar = $order->user?->avatar_url ? (string) $order->user->avatar_url : null;
        $customerEmail = $order->user?->email ? (string) $order->user->email : null;
        $customerPhone = $order->shipping_phone ? (string) $order->shipping_phone : ($order->user?->phone ? (string) $order->user->phone : null);

        $addressParts = array_values(array_filter([
            $order->shipping_address_line ? (string) $order->shipping_address_line : null,
            $order->shipping_ward ? (string) $order->shipping_ward : null,
            $order->shipping_district ? (string) $order->shipping_district : null,
            $order->shipping_province ? (string) $order->shipping_province : null,
        ], static fn($v) => $v !== null && trim((string) $v) !== ''));
        $address = implode(', ', $addressParts);

        $fmtHistory = static function ($h) use ($statusMeta) {
            [$fromLabel] = $statusMeta($h->from_status ? (string) $h->from_status : null);
            [$toLabel] = $statusMeta($h->to_status ? (string) $h->to_status : null);
            return [
                'id' => (int) $h->id,
                'from_status' => $h->from_status ? (string) $h->from_status : null,
                'to_status' => (string) ($h->to_status ?? ''),
                'from_label' => (string) $fromLabel,
                'to_label' => (string) $toLabel,
                'note' => $h->note ? (string) $h->note : null,
                'changed_at' => $h->created_at ? $h->created_at->toISOString() : null,
                'changed_by' => $h->changedBy ? [
                    'id' => (int) $h->changedBy->id,
                    'name' => (string) ($h->changedBy->name ?? '—'),
                    'avatar_url' => $h->changedBy->avatar_url ? (string) $h->changedBy->avatar_url : null,
                ] : null,
            ];
        };

        $history = ($order->statusHistories ?? collect())->map($fmtHistory)->values()->all();

        $returnReq = null;
        if ($order->returnRequest) {
            $returnReq = [
                'id' => (int) $order->returnRequest->id,
                'status' => (string) ($order->returnRequest->status ?? ''),
                'content' => $order->returnRequest->content ? (string) $order->returnRequest->content : null,
                'media' => $order->returnRequest->media ?? null,
                'admin_note' => $order->returnRequest->admin_note ? (string) $order->returnRequest->admin_note : null,
                'refund_proof' => $order->returnRequest->refund_proof ?? null,
                'approved_at' => $order->returnRequest->approved_at ? $order->returnRequest->approved_at->toISOString() : null,
                'refunded_at' => $order->returnRequest->refunded_at ? $order->returnRequest->refunded_at->toISOString() : null,
                'customer_confirmed_at' => $order->returnRequest->customer_confirmed_at ? $order->returnRequest->customer_confirmed_at->toISOString() : null,
                'created_at' => $order->returnRequest->created_at ? $order->returnRequest->created_at->toISOString() : null,
                'updated_at' => $order->returnRequest->updated_at ? $order->returnRequest->updated_at->toISOString() : null,
            ];
        }

        return response()->json([
            'id' => (int) $order->id,
            'order_code' => (string) ($order->order_code ?: ('ET-' . $order->id)),
            'created_at' => $order->created_at ? $order->created_at->toISOString() : null,
            'created_date' => $order->created_at ? $order->created_at->format('d/m/Y') : '',
            'created_time' => $order->created_at ? $order->created_at->format('H:i') : '',
            'status' => (string) ($order->status ?? ''),
            'status_label' => $statusLabel,
            'status_tone' => $statusTone,
            'status_step' => (int) $statusStep,
            'payment_status' => (string) ($order->payment_status ?? ''),
            'payment' => [
                'method' => $paymentLabel($order->payment?->method),
                'raw_method' => $order->payment?->method ? (string) $order->payment->method : null,
                'status' => $order->payment?->status ? (string) $order->payment->status : null,
                'transaction_code' => $order->payment?->transaction_code ? (string) $order->payment->transaction_code : null,
                'paid_at' => $order->payment?->paid_at ? $order->payment->paid_at->toISOString() : null,
            ],
            'customer' => [
                'name' => $customerName,
                'avatar_url' => $customerAvatar,
                'email' => $customerEmail,
                'phone' => $customerPhone,
            ],
            'shipping' => [
                'name' => $order->shipping_name ? (string) $order->shipping_name : null,
                'phone' => $order->shipping_phone ? (string) $order->shipping_phone : null,
                'address' => $address,
            ],
            'amounts' => [
                'subtotal' => (float) ($order->subtotal_amount ?? 0),
                'discount' => (float) ($order->discount_amount ?? 0),
                'shipping_fee' => (float) ($order->shipping_fee ?? 0),
                'total' => (float) ($order->total_amount ?? 0),
            ],
            'notes' => $order->notes ? (string) $order->notes : null,
            'items' => $items,
            'status_history' => $history,
            'return_request' => $returnReq,
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 10);
        if ($perPage < 5) $perPage = 5;
        if ($perPage > 50) $perPage = 50;

        $page = (int) $request->query('page', 1);
        if ($page < 1) $page = 1;

        $qCode = trim((string) $request->query('order_code', ''));
        $qCustomer = trim((string) $request->query('customer', ''));
        $status = trim((string) $request->query('status', ''));
        $paymentMethod = trim((string) $request->query('payment_method', ''));
        $paymentStatus = trim((string) $request->query('payment_status', ''));
        $dateFrom = trim((string) $request->query('date_from', ''));
        $dateTo = trim((string) $request->query('date_to', ''));
        $returnRequests = trim((string) $request->query('return_requests', '')); // 1 | pending | approved | rejected | refunded

        $query = Order::query()
            ->with(['user:id,name,avatar_url', 'payment:id,order_id,method,status'])
            ->with(['items:id,order_id,product_name_snapshot,quantity'])
            ->with(['returnRequest:id,order_id,status'])
            ->orderByDesc('created_at');

        if ($qCode !== '') {
            $query->where('order_code', 'ilike', '%' . $qCode . '%');
        }

        if ($qCustomer !== '') {
            $query->where(function ($qq) use ($qCustomer) {
                $qq->where('shipping_name', 'ilike', '%' . $qCustomer . '%')
                    ->orWhereHas('user', function ($u) use ($qCustomer) {
                        $u->where('name', 'ilike', '%' . $qCustomer . '%');
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
                // allow yyyy-mm-dd or dd/mm/yyyy
                if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $s)) return Carbon::parse($s);
                if (preg_match('/^\d{2}\/\d{2}\/\d{4}$/', $s)) return Carbon::createFromFormat('d/m/Y', $s);
                return null;
            } catch (\Throwable) {
                return null;
            }
        };

        $from = $dateFrom !== '' ? $parseDate($dateFrom) : null;
        $to = $dateTo !== '' ? $parseDate($dateTo) : null;
        if ($from) $query->where('created_at', '>=', $from->startOfDay());
        if ($to) $query->where('created_at', '<=', $to->endOfDay());

        $paginator = $query->paginate($perPage, ['*'], 'page', $page);

        $statusMeta = static function (?string $s): array {
            $s = $s ? strtolower($s) : '';
            return match ($s) {
                'pending' => ['Chờ xác nhận', 'wait'],
                'processing' => ['Đã xác nhận', 'info'],
                'paid' => ['Đang chuyển bị hàng', 'info'],
                'shipped' => ['Đang giao', 'info'],
                'delivered' => ['Đã giao', 'ok'],
                'completed' => ['Hoàn thành', 'ok'],
                'returned' => ['Hoàn trả', 'return'],
                'cancelled' => ['Hủy', 'bad'],
                default => [$s ?: '—', 'muted'],
            };
        };

        $paymentLabel = static function (?string $m): string {
            $m = $m ? strtolower($m) : '';
            return match ($m) {
                'cod' => 'COD',
                'momo' => 'Ví MoMo',
                'vnpay' => 'VNPAY',
                default => $m ?: '—',
            };
        };

        /** @var \Illuminate\Support\Collection<int, Order> $pageItems */
        $pageItems = collect($paginator->items());

        $data = $pageItems->map(static function (Order $o) use ($statusMeta, $paymentLabel) {
            $items = $o->items ?? collect();
            $firstName = (string) ($items->first()->product_name_snapshot ?? '');
            $itemsCount = (int) $items->count();
            $productText = $firstName ?: '—';
            if ($itemsCount > 1) $productText .= ' +' . ($itemsCount - 1) . ' SP';

            [$statusLabel, $statusTone] = $statusMeta((string) $o->status);
            $customerName = (string) ($o->user?->name ?: $o->shipping_name ?: '—');

            return [
                'id' => (int) $o->id,
                'order_code' => (string) ($o->order_code ?: ('ET-' . $o->id)),
                'customer_name' => $customerName,
                'customer_avatar_url' => $o->user?->avatar_url ? (string) $o->user->avatar_url : null,
                'created_date' => $o->created_at ? $o->created_at->format('d/m/Y') : '',
                'total_amount' => (float) ($o->total_amount ?? 0),
                'payment_method' => $paymentLabel($o->payment?->method),
                'status' => (string) ($o->status ?? ''),
                'status_label' => $statusLabel,
                'status_tone' => $statusTone, // ok | wait | info | bad | muted
                'product' => $productText,
                'return_request' => $o->returnRequest ? [
                    'status' => (string) ($o->returnRequest->status ?? ''),
                ] : null,
            ];
        })->values();

        $statsBase = Order::query();
        $stats = [
            'total' => (int) $statsBase->count(),
            'pending' => (int) Order::query()->where('status', 'pending')->count(),
            'processing' => (int) Order::query()->where('status', 'processing')->count(),
            'completed' => (int) Order::query()->where('status', 'completed')->count(),
            'canceled' => (int) Order::query()->whereIn('status', ['cancelled', 'returned'])->count(),
            'return_requests_pending' => (int) OrderReturnRequest::query()->where('status', 'pending')->count(),
        ];

        return response()->json([
            'data' => $data,
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ],
            'stats' => $stats,
        ]);
    }
}

