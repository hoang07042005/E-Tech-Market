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
        Schema::create('membership_ranks', function (Blueprint $table) {
            $table->id();
            $table->string('rank_name', 50);
            $table->decimal('min_spend', 15, 2)->default(0);
            $table->float('point_multiplier')->default(1.0);
            $table->text('benefits')->nullable();
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->integer('current_points')->default(0);
            $table->decimal('total_spent', 15, 2)->default(0.00);
            $table->foreignId('rank_id')->nullable()->constrained('membership_ranks')->nullOnDelete();
        });

        Schema::create('point_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->unsignedBigInteger('order_id')->nullable(); // Optional relation to orders
            $table->integer('points_changed');
            $table->enum('action_type', ['EARN', 'SPEND', 'REFUND', 'EXPIRED', 'BONUS']);
            $table->text('description')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('point_history');
        
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['rank_id']);
            $table->dropColumn(['current_points', 'total_spent', 'rank_id']);
        });

        Schema::dropIfExists('membership_ranks');
    }
};
