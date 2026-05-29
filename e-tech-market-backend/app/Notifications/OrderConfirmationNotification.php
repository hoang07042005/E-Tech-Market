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

    public function __construct(
        public Order $order
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $orderCode = $this->order->order_code ?: ('ET-'.$this->order->id);
        $totalAmount = number_format((float) $this->order->total_amount, 0, ',', '.').' VND';

        $mailMessage = (new MailMessage)
            ->subject('Xác nhận đơn hàng #'.$orderCode.' từ E-Tech Market!')
            ->greeting('Xin chào '.($this->order->shipping_name ?: 'quý khách').'!')
            ->line('Cảm ơn bạn đã mua sắm tại E-Tech Market. Đơn hàng của bạn đã được xác nhận thanh toán thành công!')
            ->line('Mã đơn hàng: #'.$orderCode)
            ->line('Tổng giá trị đơn hàng: '.$totalAmount)
            ->line('Địa chỉ giao hàng: '.$this->order->shipping_address_line);

        $this->order->loadMissing('items');
        foreach ($this->order->items as $item) {
            $mailMessage->line('- '.$item->product_name_snapshot.' (x'.$item->quantity.'): '.number_format((float) $item->total_price, 0, ',', '.').' VND');
        }

        $frontendUrl = rtrim((string) config('app.frontend_url'), '/');
        $orderUrl = $frontendUrl.'/profile/orders';

        return $mailMessage
            ->action('Xem chi tiết đơn hàng', $orderUrl)
            ->line('Chúng tôi sẽ xử lý giao hàng sớm nhất cho bạn!')
            ->line('Cảm ơn bạn đã tin tưởng lựa chọn E-Tech Market!');
    }
}
