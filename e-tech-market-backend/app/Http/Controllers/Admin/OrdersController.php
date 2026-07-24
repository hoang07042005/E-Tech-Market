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

    public function getDeliveryStaffs(): JsonResponse
    {
        $staffs = \App\Models\User::role('delivery')->select('id', 'name', 'phone', 'avatar_url')->get();
        return response()->json(['data' => $staffs]);
    }

    public function approveReturnRequest(Order $order, ApproveReturnRequest $request): JsonResponse
    {
        $order->loadMissing(['returnRequest']);
        if (! $order->returnRequest) {
            abort(422, 'Đơn hàng chưa có yêu cầu hoàn trả.');
        }

        if ($order->returnRequest->status !== 'pending') {
            abort(422, 'Yêu cầu hoàn trả không ở trạng thái chờ duyệt.');
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
            abort(422, 'Đơn hàng chưa có yêu cầu hoàn trả.');
        }

        if ($order->returnRequest->status !== 'pending') {
            abort(422, 'Yêu cầu hoàn trả không ở trạng thái chờ duyệt.');
        }

        $data = $request->validated();

        $order = $this->adminOrderService->rejectReturnRequest($order, (string) $data['admin_note'], $request->user()?->id);

        return $this->show($order);
    }

    public function markReturnRefunded(Order $order, MarkReturnRefundedRequest $request): JsonResponse
    {
        $order->loadMissing(['returnRequest']);
        if (! $order->returnRequest) {
            abort(422, 'Đơn hàng chưa có yêu cầu hoàn trả.');
        }

        if ($order->returnRequest->status !== 'approved') {
            abort(422, 'Chỉ có thể hoàn tiền sau khi đã phê duyệt yêu cầu.');
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
            $user = $request->user();
            $isOnlyDelivery = $user && $user->hasRole('delivery') && !$user->hasRole('admin') && !$user->hasRole('order-staff');
            
            if ($isOnlyDelivery) {
                if (! in_array($status, ['shipped', 'delivered'], true) && $status !== $prevStatus) {
                    abort(403, 'Nhân viên giao hàng chỉ được phép cập nhật trạng thái thành Đang giao (shipped) hoặc Đã giao (delivered).');
                }
            }

            $allowed = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'returned'];
            if (! in_array($status, $allowed, true)) {
                abort(422, 'Status invalid');
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
                abort(422, 'Không thể cập nhật đơn đã kết thúc (hoàn thành/hủy/hoàn trả).');
            }

            if (! in_array($status, ['cancelled', 'returned'], true) && $curStep > 0 && $nextStep > 0 && $nextStep < $curStep) {
                abort(422, 'Không thể cập nhật trạng thái lùi về trước.');
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
            'shippingMethod:id,name',
            'items:id,order_id,product_id,variant_id,product_name_snapshot,quantity,unit_price,total_price',
            'items.product:id,main_image_url',
            'items.variant:id,color,configuration,image_url',
            'statusHistories:id,order_id,from_status,to_status,changed_by_user_id,note,created_at',
            'statusHistories.changedBy:id,name,avatar_url',
            'returnRequest:id,order_id,user_id,status,content,media,admin_note,refund_proof,approved_by_user_id,approved_at,refunded_at,customer_confirmed_at,created_at,updated_at',
            'deliveryStaff:id,name,phone,avatar_url',
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

        $filters = $request->only([
            'order_code', 'customer', 'status', 'payment_method', 
            'payment_status', 'date_from', 'date_to', 'return_requests'
        ]);

        $result = $this->adminOrderService->getAdminOrders($filters, $perPage, $page, $request->user());
        $paginator = $result['paginator'];
        $stats = $result['stats'];

        $pageItems = collect($paginator->items());
        $data = OrderListResource::collection($pageItems)->resolve();

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

    public function destroy(Order $order): JsonResponse
    {
        if (strtolower((string) $order->status) !== 'cancelled') {
            abort(422, 'Chỉ có thể xóa đơn hàng đã hủy.');
        }

        \Illuminate\Support\Facades\DB::transaction(function () use ($order) {
            \App\Models\OrderItem::where('order_id', $order->id)->delete();
            \App\Models\Payment::where('order_id', $order->id)->delete();
            \App\Models\OrderStatusHistory::where('order_id', $order->id)->delete();
            \App\Models\CouponUsage::where('order_id', $order->id)->delete();
            \App\Models\OrderReturnRequest::where('order_id', $order->id)->delete();

            $order->delete();
        });

        \App\Jobs\InvalidateAdminDashboardCache::dispatch();

        return response()->json(['message' => 'Đơn hàng đã được xóa thành công.']);
    }
}
