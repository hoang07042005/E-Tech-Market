<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('flash_sales', function (Blueprint $table) {
            // Thêm cột status mới
            $table->string('status')->default('active')->after('end_at');
        });

        // Chuyển đổi dữ liệu cũ: true -> active, false -> paused
        DB::table('flash_sales')->where('is_active', true)->update(['status' => 'active']);
        DB::table('flash_sales')->where('is_active', false)->update(['status' => 'paused']);

        Schema::table('flash_sales', function (Blueprint $table) {
            // Xóa cột is_active cũ
            $table->dropColumn('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('flash_sales', function (Blueprint $table) {
            $table->boolean('is_active')->default(true)->after('end_at');
        });

        DB::table('flash_sales')->whereIn('status', ['active', 'waiting'])->update(['is_active' => true]);
        DB::table('flash_sales')->whereIn('status', ['paused', 'ended'])->update(['is_active' => false]);

        Schema::table('flash_sales', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};
