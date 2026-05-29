<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_return_requests', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('order_id');
            $table->unsignedBigInteger('user_id');
            $table->string('status', 30)->default('pending'); // pending | approved | rejected | refunded
            $table->text('content');
            $table->jsonb('media')->nullable(); // [{type,image|video,url,original_name,mime,size}]
            $table->text('admin_note')->nullable();
            $table->jsonb('refund_proof')->nullable(); // [{type,image|video,url,...}]
            $table->unsignedBigInteger('approved_by_user_id')->nullable();
            $table->timestampTz('approved_at')->nullable();
            $table->timestampTz('refunded_at')->nullable();
            $table->timestampsTz();

            $table->unique('order_id', 'order_return_requests_order_unique');
            $table->index(['status', 'created_at'], 'order_return_requests_status_created_idx');
            $table->index('user_id', 'order_return_requests_user_idx');
            $table->index('approved_by_user_id', 'order_return_requests_approved_by_idx');

            $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('approved_by_user_id')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_return_requests');
    }
};
