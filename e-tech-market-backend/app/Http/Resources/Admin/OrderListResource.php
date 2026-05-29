<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderListResource extends JsonResource
{
    public function toArray(Request $request): array
    {
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

        $items = $this->items ?? collect();
        $firstName = (string) ($items->first()->product_name_snapshot ?? '');
        $itemsCount = (int) $items->count();
        $productText = $firstName ?: '—';
        if ($itemsCount > 1) {
            $productText .= ' +'.($itemsCount - 1).' SP';
        }

        [$statusLabel, $statusTone] = $statusMeta((string) $this->status);
        $customerName = (string) ($this->user?->name ?: $this->shipping_name ?: '—');

        return [
            'id' => (int) $this->id,
            'order_code' => (string) ($this->order_code ?: ('ET-'.$this->id)),
            'customer_name' => $customerName,
            'customer_avatar_url' => $this->user?->avatar_url ? (string) $this->user->avatar_url : null,
            'created_date' => $this->created_at ? $this->created_at->format('d/m/Y') : '',
            'total_amount' => (float) ($this->total_amount ?? 0),
            'payment_method' => $paymentLabel($this->payment?->method),
            'status' => (string) ($this->status ?? ''),
            'status_label' => $statusLabel,
            'status_tone' => $statusTone,
            'product' => $productText,
            'return_request' => $this->returnRequest ? [
                'status' => (string) ($this->returnRequest->status ?? ''),
            ] : null,
        ];
    }
}
