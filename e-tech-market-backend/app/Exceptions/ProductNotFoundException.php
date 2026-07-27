<?php

namespace App\Exceptions;

use Exception;

class ProductNotFoundException extends Exception
{
    protected $message = 'Không tìm thấy sản phẩm.';

    public function __construct(string $message = 'Không tìm thấy sản phẩm.', int $code = 404)
    {
        parent::__construct($message, $code);
    }
}