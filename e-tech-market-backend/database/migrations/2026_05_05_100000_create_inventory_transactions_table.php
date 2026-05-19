<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('inventory_transactions')) {
            Schema::create('inventory_transactions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('product_id')->constrained()->onDelete('cascade');
                $table->foreignId('inventory_id')->nullable()->constrained('inventory')->nullOnDelete();
                $table->string('location_code', 255)->default('main');
                $table->integer('quantity_change');
                $table->integer('quantity_after');
                $table->string('reason', 64)->default('sync_from_variants');
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_transactions');
    }
};
