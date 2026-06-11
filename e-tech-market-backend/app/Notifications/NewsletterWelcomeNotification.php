<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewsletterWelcomeNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function backoff(): array
    {
        return [10, 30, 60];
    }

    public function __construct() {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Chào mừng bạn đến với E-Tech Market!')
            ->greeting('Xin chào quý khách!')
            ->line('Cảm ơn bạn đã đăng ký nhận bản tin khuyến mãi từ E-Tech Market.')
            ->line('Chúng tôi sẽ gửi cho bạn những thông tin sản phẩm công nghệ mới nhất và mã giảm giá hấp dẫn nhất.')
            ->action('Ghé thăm Cửa hàng', url('/'))
            ->line('Chúc bạn có những trải nghiệm mua sắm tuyệt vời cùng E-Tech Market!');
    }
}
