<?php

namespace App\Exceptions;

use Exception;

class InvalidCouponException extends Exception
{
    protected $message = 'Invalid or expired coupon';

    public function __construct(string $message = 'Invalid or expired coupon', int $code = 400)
    {
        parent::__construct($message, $code);
    }
}