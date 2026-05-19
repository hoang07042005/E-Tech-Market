<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('blog_posts', function (Blueprint $table) {
            if (! Schema::hasColumn('blog_posts', 'views')) {
                $table->unsignedBigInteger('views')->default(0)->after('is_published');
            }
            if (! Schema::hasColumn('blog_posts', 'reading_time')) {
                $table->unsignedSmallInteger('reading_time')->default(0)->after('views');
            }
        });

        if (!Schema::hasTable('blog_comments')) {
            Schema::create('blog_comments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('blog_post_id')->constrained('blog_posts')->cascadeOnDelete();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('author_name', 120);
                $table->string('author_email')->nullable();
                $table->text('content');
                $table->string('status', 30)->default('approved');
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (!Schema::hasTable('newsletter_subscriptions')) {
            Schema::create('newsletter_subscriptions', function (Blueprint $table) {
                $table->id();
                $table->string('email')->unique();
                $table->string('source', 80)->nullable();
                $table->timestamp('subscribed_at')->nullable();
                $table->timestamp('unsubscribed_at')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('newsletter_subscriptions');
        Schema::dropIfExists('blog_comments');

        Schema::table('blog_posts', function (Blueprint $table) {
            if (Schema::hasColumn('blog_posts', 'reading_time')) {
                $table->dropColumn('reading_time');
            }
            if (Schema::hasColumn('blog_posts', 'views')) {
                $table->dropColumn('views');
            }
        });
    }
};
