<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contact_messages', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('name', 255);
            $table->string('email', 255);
            $table->string('phone', 50);
            $table->string('subject', 255)->nullable();
            $table->text('message');
            $table->timestampTz('handled_at')->nullable();
            $table->unsignedBigInteger('handled_by_user_id')->nullable();
            $table->timestampsTz();

            $table->index(['created_at'], 'contact_messages_created_idx');
            $table->index(['handled_at'], 'contact_messages_handled_idx');
            $table->index(['handled_by_user_id'], 'contact_messages_handled_by_idx');
            $table->foreign('handled_by_user_id')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contact_messages');
    }
};
