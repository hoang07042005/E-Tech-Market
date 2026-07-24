<?php

namespace App\Http\Resources\Admin;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Order
 */
class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
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

        [$statusLabel, $statusTone, $statusStep] = $statusMeta((string) $this->status);

        $items = ($this->items ?? collect())->map(static function ($it) {
            return [
                'product_id' => (int) ($it->product_id ?? 0),
                'variant_id' => $it->variant_id ? (int) $it->variant_id : null,
                'name' => (string) ($it->product_name_snapshot ?? '—'),
                'quantity' => (int) ($it->quantity ?? 0),
                'unit_price' => (float) ($it->unit_price ?? 0),
                'total_price' => (float) ($it->total_price ?? 0),
                'variant_color' => $it->variant?->color ? (string) $it->variant->color : null,
                'variant_config' => $it->variant?->configuration ? (string) $it->variant->configuration : null,
                'variant_image_url' => $it->variant?->image_url ? (string) $it->variant->image_url : null,
            ];
        })->values()->all();

        $productIds = collect($items)->pluck('product_id')->filter(static fn ($v) => (int) $v > 0)->unique()->values();
        $productImages = Product::query()
            ->whereIn('id', $productIds)
            ->select(['id', 'main_image_url'])
            ->get()
            ->mapWithKeys(static fn ($p) => [(int) $p->id => ($p->main_image_url ? (string) $p->main_image_url : null)])
            ->all();

        $items = array_map(static function (array $it) use ($productImages) {
            $pid = (int) $it['product_id'];
            $img = !empty($it['variant_image_url']) ? $it['variant_image_url'] : ($pid > 0 && array_key_exists($pid, $productImages) ? $productImages[$pid] : null);

            return [
                ...$it,
                'image_url' => $img,
            ];
        }, $items);

        $customerName = (string) ($this->user?->name ?: $this->shipping_name ?: '—');
        $customerAvatar = $this->user?->avatar_url ? (string) $this->user->avatar_url : null;
        $customerEmail = $this->user?->email ? (string) $this->user->email : null;
        $customerPhone = $this->shipping_phone ? (string) $this->shipping_phone : ($this->user?->phone ? (string) $this->user->phone : null);

        $addressParts = array_values(array_filter([
            $this->shipping_address_line ? (string) $this->shipping_address_line : null,
            $this->shipping_ward ? (string) $this->shipping_ward : null,
            $this->shipping_district ? (string) $this->shipping_district : null,
            $this->shipping_province ? (string) $this->shipping_province : null,
        ], static fn ($v) => $v !== null && trim((string) $v) !== ''));
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
                'changed_at' => $h->created_at ? $h->created_at->format('Y-m-d\TH:i:s') : null,
                'changed_by' => $h->changedBy ? [
                    'id' => (int) $h->changedBy->id,
                    'name' => (string) ($h->changedBy->name ?? '—'),
                    'avatar_url' => $h->changedBy->avatar_url ? (string) $h->changedBy->avatar_url : null,
                ] : null,
            ];
        };

        $history = ($this->statusHistories ?? collect())->map($fmtHistory)->values()->all();

        $returnReq = null;
        if ($this->returnRequest) {
            $returnReq = [
                'id' => (int) $this->returnRequest->id,
                'status' => (string) ($this->returnRequest->status ?? ''),
                'content' => $this->returnRequest->content ? (string) $this->returnRequest->content : null,
                'media' => $this->returnRequest->media ?? null,
                'admin_note' => $this->returnRequest->admin_note ? (string) $this->returnRequest->admin_note : null,
                'refund_proof' => $this->returnRequest->refund_proof ?? null,
                'approved_at' => $this->returnRequest->approved_at ? $this->returnRequest->approved_at->format('Y-m-d\TH:i:s') : null,
                'refunded_at' => $this->returnRequest->refunded_at ? $this->returnRequest->refunded_at->format('Y-m-d\TH:i:s') : null,
                'customer_confirmed_at' => $this->returnRequest->customer_confirmed_at ? $this->returnRequest->customer_confirmed_at->format('Y-m-d\TH:i:s') : null,
                'created_at' => $this->returnRequest->created_at ? $this->returnRequest->created_at->format('Y-m-d\TH:i:s') : null,
                'updated_at' => $this->returnRequest->updated_at ? $this->returnRequest->updated_at->format('Y-m-d\TH:i:s') : null,
            ];
        }

        return [
            'id' => (int) $this->id,
            'order_code' => (string) ($this->order_code ?: ('ET-'.$this->id)),
            'created_at' => $this->created_at ? $this->created_at->toISOString() : null,
            'created_date' => $this->created_at ? $this->created_at->format('d/m/Y') : '',
            'created_time' => $this->created_at ? $this->created_at->format('H:i') : '',
            'status' => (string) ($this->status ?? ''),
            'status_label' => $statusLabel,
            'status_tone' => $statusTone,
            'status_step' => (int) $statusStep,
            'payment_status' => (string) ($this->payment_status ?? ''),
            'payment' => [
                'method' => $paymentLabel($this->payment?->method),
                'raw_method' => $this->payment?->method ? (string) $this->payment->method : null,
                'status' => $this->payment?->status ? (string) $this->payment->status : null,
                'transaction_code' => $this->payment?->transaction_code ? (string) $this->payment->transaction_code : null,
                'paid_at' => $this->payment?->paid_at ? $this->payment->paid_at->toISOString() : null,
            ],
            'customer' => [
                'name' => $customerName,
                'avatar_url' => $customerAvatar,
                'email' => $customerEmail,
                'phone' => $customerPhone,
            ],
            'shipping' => [
                'name' => $this->shipping_name ? (string) $this->shipping_name : null,
                'phone' => $this->shipping_phone ? (string) $this->shipping_phone : null,
                'address' => $address,
            ],
            'amounts' => [
                'subtotal' => (float) ($this->subtotal_amount ?? 0),
                'discount' => (float) ($this->discount_amount ?? 0),
                'points_discount' => (float) ($this->points_discount ?? 0),
                'shipping_fee' => (float) ($this->shipping_fee ?? 0),
                'total' => (float) ($this->total_amount ?? 0),
            ],
            'notes' => $this->notes ? (string) $this->notes : null,
            'delivery_staff_id' => $this->delivery_staff_id ? (int) $this->delivery_staff_id : null,
            'delivery_staff' => $this->whenLoaded('deliveryStaff', function () {
                return [
                    'id' => (int) $this->deliveryStaff->id,
                    'name' => (string) $this->deliveryStaff->name,
                    'phone' => $this->deliveryStaff->phone ? (string) $this->deliveryStaff->phone : null,
                ];
            }),
            'items' => $items,
            'status_history' => $history,
            'return_request' => $returnReq,
        ];
    }
}
