<?php

namespace App\Exceptions;

use Exception;

class InvalidCouponException extends Exception
{
    protected $message = 'Mã giảm giá không hợp lệ hoặc đã hết hạn.';

    public function __construct(string $message = 'Mã giảm giá không hợp lệ hoặc đã hết hạn.', int $code = 400)
    {
        parent::__construct($message, $code);
    }
}