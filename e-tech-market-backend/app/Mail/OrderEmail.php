<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OrderEmail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Order $order,
        public string $title,
        public string $messageText,
        public string $subjectText
    ) {}

    public function build()
    {
        return $this->subject($this->subjectText)
                    ->view('emails.order');
    }
}
