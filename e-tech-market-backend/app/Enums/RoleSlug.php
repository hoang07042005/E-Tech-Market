<?php

namespace App\Enums;

enum RoleSlug: string
{
    case ADMIN = 'admin';
    case WAREHOUSE_STAFF = 'warehouse-staff';
    case ORDER_STAFF = 'order-staff';
    case EDITOR = 'editor';
    case CUSTOMER = 'customer';
}
