<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Performance indexes for Product queries
     */
    public function up(): void
    {
        // Index for is_active filter (most common filter in queries)
        Schema::table('products', function (Blueprint $table) {
            $table->index('is_active');
            $table->index(['is_active', 'created_at']);
            $table->index(['is_active', 'is_featured']);
            $table->index(['is_active', 'category_id']);
        });

        // Index for variants table used in price sorting subquery
        Schema::table('product_variants', function (Blueprint $table) {
            $table->index(['product_id', 'is_active', 'price']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['is_active']);
            $table->dropIndex(['is_active', 'created_at']);
            $table->dropIndex(['is_active', 'is_featured']);
            $table->dropIndex(['is_active', 'category_id']);
        });

        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropIndex(['product_id', 'is_active', 'price']);
        });
    }
};