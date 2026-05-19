<?php

namespace App\Enums;

enum OrderStatus: string
{
    case PENDING = 'pending';
    case PROCESSING = 'processing';
    case PAID = 'paid';
    case SHIPPED = 'shipped';
    case DELIVERED = 'delivered';
    case COMPLETED = 'completed';
    case CANCELLED = 'cancelled';
    case RETURNED = 'returned';

    public function label(): string
    {
        return match ($this) {
            self::PENDING => 'Chờ xác nhận',
            self::PROCESSING => 'Đang xử lý',
            self::PAID => 'Đã thanh toán',
            self::SHIPPED => 'Đang giao',
            self::DELIVERED => 'Đã giao',
            self::COMPLETED => 'Hoàn thành',
            self::CANCELLED => 'Đã hủy',
            self::RETURNED => 'Hoàn trả',
        };
    }
}
