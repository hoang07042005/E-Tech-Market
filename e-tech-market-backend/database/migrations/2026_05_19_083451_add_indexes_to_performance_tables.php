<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // orders table
        try {
            Schema::table('orders', function (Blueprint $table) {
                $table->index('user_id');
            });
        } catch (\Exception $e) {}

        try {
            Schema::table('orders', function (Blueprint $table) {
                $table->index('status');
            });
        } catch (\Exception $e) {}

        // cart_items table
        try {
            Schema::table('cart_items', function (Blueprint $table) {
                $table->index('cart_id');
            });
        } catch (\Exception $e) {}

        // reviews table
        try {
            Schema::table('reviews', function (Blueprint $table) {
                $table->index('product_id');
            });
        } catch (\Exception $e) {}

        try {
            Schema::table('reviews', function (Blueprint $table) {
                $table->index('status');
            });
        } catch (\Exception $e) {}

        // flash_sale_items table
        try {
            Schema::table('flash_sale_items', function (Blueprint $table) {
                $table->index('product_id');
            });
        } catch (\Exception $e) {}

        // coupons table
        try {
            Schema::table('coupons', function (Blueprint $table) {
                $table->index('code');
            });
        } catch (\Exception $e) {}
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        try {
            Schema::table('orders', function (Blueprint $table) {
                $table->dropIndex(['user_id']);
            });
        } catch (\Exception $e) {}

        try {
            Schema::table('orders', function (Blueprint $table) {
                $table->dropIndex(['status']);
            });
        } catch (\Exception $e) {}

        try {
            Schema::table('cart_items', function (Blueprint $table) {
                $table->dropIndex(['cart_id']);
            });
        } catch (\Exception $e) {}

        try {
            Schema::table('reviews', function (Blueprint $table) {
                $table->dropIndex(['product_id']);
            });
        } catch (\Exception $e) {}

        try {
            Schema::table('reviews', function (Blueprint $table) {
                $table->dropIndex(['status']);
            });
        } catch (\Exception $e) {}

        try {
            Schema::table('flash_sale_items', function (Blueprint $table) {
                $table->dropIndex(['product_id']);
            });
        } catch (\Exception $e) {}

        try {
            Schema::table('coupons', function (Blueprint $table) {
                $table->dropIndex(['code']);
            });
        } catch (\Exception $e) {}
    }
};
