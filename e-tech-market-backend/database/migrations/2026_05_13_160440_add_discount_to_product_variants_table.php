<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->enum('discount_type', ['percentage', 'fixed'])
                  ->nullable()
                  ->after('old_price')
                  ->comment('Kiểu giảm giá: percentage hoặc fixed');
            $table->decimal('discount_value', 15, 2)
                  ->nullable()
                  ->after('discount_type')
                  ->comment('Giá trị giảm (% hoặc số tiền VND)');
            $table->timestamp('discount_start_at')
                  ->nullable()
                  ->after('discount_value')
                  ->comment('Thời điểm bắt đầu giảm giá');
            $table->timestamp('discount_end_at')
                  ->nullable()
                  ->after('discount_start_at')
                  ->comment('Thời điểm kết thúc giảm giá');
        });
    }

    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropColumn([
                'discount_type',
                'discount_value',
                'discount_start_at',
                'discount_end_at',
            ]);
        });
    }
};
