<?php

namespace App\Exceptions;

use Exception;

class InsufficientStockException extends Exception
{
    protected $message = 'Insufficient stock';

    public function __construct(string $message = 'Insufficient stock', int $code = 400)
    {
        parent::__construct($message, $code);
    }
}