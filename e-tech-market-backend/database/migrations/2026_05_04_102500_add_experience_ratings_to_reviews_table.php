<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            if (! Schema::hasColumn('reviews', 'exp_performance')) {
                $table->unsignedSmallInteger('exp_performance')->nullable()->after('rating');
            }
            if (! Schema::hasColumn('reviews', 'exp_battery')) {
                $table->unsignedSmallInteger('exp_battery')->nullable()->after('exp_performance');
            }
            if (! Schema::hasColumn('reviews', 'exp_camera')) {
                $table->unsignedSmallInteger('exp_camera')->nullable()->after('exp_battery');
            }
        });
    }

    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            if (Schema::hasColumn('reviews', 'exp_camera')) {
                $table->dropColumn('exp_camera');
            }
            if (Schema::hasColumn('reviews', 'exp_battery')) {
                $table->dropColumn('exp_battery');
            }
            if (Schema::hasColumn('reviews', 'exp_performance')) {
                $table->dropColumn('exp_performance');
            }
        });
    }
};
