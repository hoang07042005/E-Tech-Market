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
        Schema::table('wishlists', function (Blueprint $table) {
            $table->unsignedBigInteger('product_id')->nullable()->change();
            
            $table->unsignedBigInteger('blog_post_id')->nullable();
            $table->unsignedBigInteger('video_id')->nullable();
            $table->unsignedBigInteger('product_news_id')->nullable();

            $table->foreign('blog_post_id')->references('id')->on('blog_posts')->cascadeOnDelete();
            $table->foreign('video_id')->references('id')->on('videos')->cascadeOnDelete();
            $table->foreign('product_news_id')->references('id')->on('product_news')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('wishlists', function (Blueprint $table) {
            $table->dropForeign(['blog_post_id']);
            $table->dropForeign(['video_id']);
            $table->dropForeign(['product_news_id']);
            
            $table->dropColumn(['blog_post_id', 'video_id', 'product_news_id']);
            
            // Note: product_id change and unique index recreation might be tricky if there's data,
            // but for down() we can try:
            $table->unsignedBigInteger('product_id')->nullable(false)->change();
            $table->unique(['user_id', 'product_id']);
        });
    }
};
