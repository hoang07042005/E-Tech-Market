<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Drop the old category_id FK (pointing to categories table) and create video_categories table,
     * then re-add category_id pointing to video_categories.
     */
    public function up(): void
    {
        // 1. Drop old FK and column from videos (was referencing 'categories')
        Schema::table('videos', function (Blueprint $table) {
            $table->dropForeign(['category_id']);
            $table->dropColumn('category_id');
        });

        // 2. Create dedicated video_categories table
        Schema::create('video_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // 3. Add video_category_id column to videos
        Schema::table('videos', function (Blueprint $table) {
            $table->foreignId('video_category_id')
                ->nullable()
                ->after('product_id')
                ->constrained('video_categories')
                ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('videos', function (Blueprint $table) {
            $table->dropForeign(['video_category_id']);
            $table->dropColumn('video_category_id');
        });

        Schema::dropIfExists('video_categories');

        Schema::table('videos', function (Blueprint $table) {
            $table->foreignId('category_id')
                ->nullable()
                ->after('product_id')
                ->constrained()
                ->onDelete('set null');
        });
    }
};
