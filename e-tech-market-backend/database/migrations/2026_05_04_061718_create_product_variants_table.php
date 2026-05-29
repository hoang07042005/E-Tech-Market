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
        if (! Schema::hasTable('product_variants')) {
            Schema::create('product_variants', function (Blueprint $table) {
                $table->id();
                $table->foreignId('product_id')->constrained()->onDelete('cascade');
                $table->string('variant_name'); // e.g. "Space Gray - 16GB/512GB"
                $table->string('color')->nullable(); // e.g. "Space Gray" or "#2e2e2e"
                $table->string('configuration')->nullable(); // e.g. "16GB RAM, 512GB SSD"
                $table->string('sku')->nullable()->unique();
                $table->decimal('price', 15, 2); // Actual price for this variant
                $table->integer('stock_quantity')->default(0);
                $table->string('image_url')->nullable(); // Specific image for this variant
                $table->boolean('is_active')->default(true);
                $table->timestamps();
                $table->softDeletes();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_variants');
    }
};
