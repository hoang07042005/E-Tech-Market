<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('payment_id')->nullable();
            $table->string('provider', 80)->nullable();
            $table->string('provider_transaction_id', 120)->nullable();
            $table->decimal('amount', 12, 2);
            $table->char('currency', 3)->default('VND');
            $table->string('status', 30)->default('pending');
            $table->jsonb('raw_response')->nullable();
            $table->timestampTz('created_at')->useCurrent();

            $table->foreign('payment_id')->references('id')->on('payments')->nullOnDelete();
            $table->index('payment_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
