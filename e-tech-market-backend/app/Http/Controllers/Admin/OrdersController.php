<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ApproveReturnRequest;
use App\Http\Requests\Admin\MarkReturnRefundedRequest;
use App\Http\Requests\Admin\RejectReturnRequest;
use App\Http\Requests\Admin\UpdateOrderRequest;
use App\Http\Resources\Admin\OrderListResource;
use App\Http\Resources\Admin\OrderResource;
use App\Models\Order;
use App\Models\OrderReturnRequest;
use App\Services\AdminOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class OrdersController extends Controller
{
    protected AdminOrderService $adminOrderService;

    public function __construct(AdminOrderService $adminOrderService)
    {
        $this->adminOrderService = $adminOrderService;
    }

    public function approveReturnRequest(Order $order, ApproveReturnRequest $request): JsonResponse
    {
        $order->loadMissing(['returnRequest']);
        if (! $order->returnRequest) {
            return response()->json(['message' => 'Đơn hàng chưa có yêu cầu hoàn trả.'], 422);
        }

        if ($order->returnRequest->status !== 'pending') {
            return response()->json(['message' => 'Yêu cầu hoàn trả không ở trạng thái chờ duyệt.'], 422);
        }

        $data = $request->validated();

        $adminNote = array_key_exists('admin_note', $data) ? ($data['admin_note'] !== null ? (string) $data['admin_note'] : null) : $order->returnRequest->admin_note;

        $order = $this->adminOrderService->approveReturnRequest($order, $adminNote, $request->user()?->id);

        return $this->show($order);
    }

    public function rejectReturnRequest(Order $order, RejectReturnRequest $request): JsonResponse
    {
        $order->loadMissing(['returnRequest']);
        if (! $order->returnRequest) {
            return response()->json(['message' => 'Đơn hàng chưa có yêu cầu hoàn trả.'], 422);
        }

        if ($order->returnRequest->status !== 'pending') {
            return response()->json(['message' => 'Yêu cầu hoàn trả không ở trạng thái chờ duyệt.'], 422);
        }

        $data = $request->validated();

        $order = $this->adminOrderService->rejectReturnRequest($order, (string) $data['admin_note'], $request->user()?->id);

        return $this->show($order);
    }

    public function markReturnRefunded(Order $order, MarkReturnRefundedRequest $request): JsonResponse
    {
        $order->loadMissing(['returnRequest']);
        if (! $order->returnRequest) {
            return response()->json(['message' => 'Đơn hàng chưa có yêu cầu hoàn trả.'], 422);
        }

        if ($order->returnRequest->status !== 'approved') {
            return response()->json(['message' => 'Chỉ có thể hoàn tiền sau khi đã phê duyệt yêu cầu.'], 422);
        }

        $data = $request->validated();

        $files = $request->file('refund_proof', []);
        $adminNote = array_key_exists('admin_note', $data) ? ($data['admin_note'] !== null ? (string) $data['admin_note'] : null) : $order->returnRequest->admin_note;

        $order = $this->adminOrderService->markReturnRefunded($order, $adminNote, $files, $request->user()?->id);

        return $this->show($order);
    }

    public function update(Order $order, UpdateOrderRequest $request): JsonResponse
    {
        $data = $request->validated();

        $prevStatus = strtolower((string) ($order->status ?? ''));
        $status = isset($data['status']) ? strtolower(trim((string) $data['status'])) : null;
        if ($status !== null && $status !== '') {
            $allowed = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'returned'];
            if (! in_array($status, $allowed, true)) {
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

            if (in_array($cur, ['completed', 'cancelled', 'returned'], true) && $status !== $cur) {
                return response()->json(['message' => 'Không thể cập nhật đơn đã kết thúc (hoàn thành/hủy/hoàn trả).'], 422);
            }

            if (! in_array($status, ['cancelled', 'returned'], true) && $curStep > 0 && $nextStep > 0 && $nextStep < $curStep) {
                return response()->json(['message' => 'Không thể cập nhật trạng thái lùi về trước.'], 422);
            }

            if (in_array($status, ['completed', 'returned', 'cancelled'], true)) {
                return response()->json([
                    'message' => 'Admin không được chuyển trạng thái sang Hoàn thành/Hoàn trả/Hủy. Các trạng thái này chỉ phát sinh từ thao tác của khách hàng hoặc luồng nghiệp vụ riêng.',
                ], 422);
            }
        }

        $order = $this->adminOrderService->updateOrderStatus($order, $data, $request->user()?->id);

        return $this->show($order);
    }

    public function show(Order $order): JsonResponse
    {
        $order->load([
            'user:id,name,email,phone,avatar_url',            
            'payment:id,order_id,method,status,transaction_code,paid_at',
            'items:id,order_id,product_id,product_name_snapshot,quantity,unit_price,total_price',
            'items.product:id,main_image_url',
            'statusHistories:id,order_id,from_status,to_status,changed_by_user_id,note,created_at',
            'statusHistories.changedBy:id,name,avatar_url',
            'returnRequest:id,order_id,user_id,status,content,media,admin_note,refund_proof,approved_by_user_id,approved_at,refunded_at,customer_confirmed_at,created_at,updated_at',
        ]);

        return response()->json((new OrderResource($order))->resolve());
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 10);
        if ($perPage < 5) {
            $perPage = 5;
        }
        if ($perPage > 50) {
            $perPage = 50;
        }

        $page = (int) $request->query('page', 1);
        if ($page < 1) {
            $page = 1;
        }

        $qCode = trim((string) $request->query('order_code', ''));
        $qCustomer = trim((string) $request->query('customer', ''));
        $status = trim((string) $request->query('status', ''));
        $paymentMethod = trim((string) $request->query('payment_method', ''));
        $paymentStatus = trim((string) $request->query('payment_status', ''));
        $dateFrom = trim((string) $request->query('date_from', ''));
        $dateTo = trim((string) $request->query('date_to', ''));
        $returnRequests = trim((string) $request->query('return_requests', ''));

        $query = Order::query()
            ->with(['user:id,name,avatar_url', 'payment:id,order_id,method,status'])
            ->with(['items:id,order_id,product_name_snapshot,quantity'])
            ->with(['returnRequest:id,order_id,status'])
            ->orderByDesc('created_at');

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

        $pageItems = collect($paginator->items());
        $data = OrderListResource::collection($pageItems)->resolve();

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
