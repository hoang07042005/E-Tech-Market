<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OrderConfirmationNotification extends Notification implements ShouldQueue
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
        $subject = 'Xác nhận đơn hàng #'.$orderCode.' - E-Tech Market';

        $mailable = new \App\Mail\OrderEmail(
            $this->order,
            'Xác nhận đơn hàng',
            'Cảm ơn bạn đã mua sắm tại E-Tech Market. Đơn hàng của bạn đã được xác nhận thanh toán thành công!',
            $subject
        );

        // If notifiable has an email, the framework sets the 'to' address automatically,
        // but we can be explicit if we want: $mailable->to($notifiable->routeNotificationFor('mail'));
        return $mailable;
    }
}
