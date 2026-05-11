<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // PostgreSQL: update CHECK constraint for orders.status
        DB::statement('ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;');
        DB::statement(
            "ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending','paid','processing','shipped','delivered','completed','cancelled','returned'));"
        );
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;');
        DB::statement(
            "ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending','paid','processing','shipped','delivered','cancelled','returned'));"
        );
    }
};

