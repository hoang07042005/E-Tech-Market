<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\TradeInRequest;

class TradeInStatusNotification extends Notification
{
    use Queueable;

    protected $tradeInRequest;

    public function __construct(TradeInRequest $tradeInRequest)
    {
        $this->tradeInRequest = $tradeInRequest;
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
                    ->subject('Cập nhật trạng thái Yêu cầu Thu cũ đổi mới - ' . $this->tradeInRequest->request_code)
                    ->view('emails.trade_in_status', ['req' => $this->tradeInRequest]);
    }
}
