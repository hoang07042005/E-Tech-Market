<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('order_return_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('order_return_requests', 'customer_confirmed_at')) {
                $table->timestampTz('customer_confirmed_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('order_return_requests', function (Blueprint $table) {
            if (Schema::hasColumn('order_return_requests', 'customer_confirmed_at')) {
                $table->dropColumn('customer_confirmed_at');
            }
        });
    }
};

