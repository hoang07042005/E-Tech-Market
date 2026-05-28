<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_specs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->string('spec_group', 100)->nullable();
            $table->string('spec_key', 255);
            $table->text('spec_value');
            $table->string('spec_unit', 50)->nullable();
            $table->integer('sort_order')->default(0);
            $table->unsignedBigInteger('product_variant_id')->nullable();
            $table->timestampTz('created_at')->useCurrent();

            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
            $table->index('product_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_specs');
    }
};
