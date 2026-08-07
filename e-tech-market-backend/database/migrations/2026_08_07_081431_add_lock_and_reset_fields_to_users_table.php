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
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_locked')->default(false)->after('google_id');
            $table->string('password')->nullable()->change();
            $table->string('reset_token')->nullable()->after('password');
            $table->timestamp('reset_token_expires_at')->nullable()->after('reset_token');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['is_locked', 'reset_token', 'reset_token_expires_at']);
            $table->string('password')->nullable(false)->change();
        });
    }
};
