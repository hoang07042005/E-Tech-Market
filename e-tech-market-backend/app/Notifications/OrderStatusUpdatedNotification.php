<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OrderStatusUpdatedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function backoff(): array
    {
        return [10, 30, 60]; // Retry after 10s, 30s, 60s
    }

    public function __construct(
        public Order $order
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable)
    {
        $orderCode = $this->order->order_code ?: ('ET-'.$this->order->id);
        
        $statusText = match ($this->order->status) {
            'delivered' => 'đang được giao đến bạn',
            'completed' => 'đã hoàn thành',
            default => 'đã được cập nhật'
        };

        $subject = 'Cập nhật trạng thái đơn hàng #'.$orderCode.' - E-Tech Market';

        $messageText = 'Đơn hàng #'.$orderCode.' của bạn '.$statusText.".\n";
        
        if ($this->order->status === 'delivered') {
            $messageText .= 'Vui lòng kiểm tra sản phẩm khi nhận hàng.';
        } elseif ($this->order->status === 'completed') {
            $messageText .= 'Cảm ơn bạn đã mua sắm tại E-Tech Market. Đơn hàng của bạn đã được hoàn tất thành công!';
        }

        return new \App\Mail\OrderEmail(
            $this->order,
            'Cập nhật trạng thái đơn hàng',
            $messageText,
            $subject
        );
    }
}
