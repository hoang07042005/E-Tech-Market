<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PasswordResetLinkNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly string $token,
        private readonly string $email,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $frontendUrl = rtrim((string) config('app.frontend_url'), '/');
        $resetUrl = $frontendUrl.'/reset-password?token='.urlencode($this->token).'&email='.urlencode($this->email);

        return (new MailMessage)
            ->subject('Đặt lại mật khẩu')
            ->greeting('Xin chào!')
            ->line('Bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu cho tài khoản này.')
            ->line('Nếu bạn đang dùng điện thoại, hãy sao chép mã bên dưới và dán vào ứng dụng:')
            ->line('**Mã xác nhận:** ' . $this->token)
            ->line('---')
            ->line('Hoặc bạn có thể bấm nút bên dưới nếu đang dùng máy tính:')
            ->action('Đặt lại mật khẩu', $resetUrl)
            ->line('Nếu bạn không yêu cầu, bạn có thể bỏ qua email này.');
    }
}
