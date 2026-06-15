<?php

namespace App\Exceptions;

use Exception;

class ProductNotFoundException extends Exception
{
    protected $message = 'Product not found';

    public function __construct(string $message = 'Product not found', int $code = 404)
    {
        parent::__construct($message, $code);
    }
}