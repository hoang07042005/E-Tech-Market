<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Các tiêu chí đánh giá máy (phân loại theo danh mục: Điện thoại hoặc Laptop)
        Schema::create('trade_in_conditions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('category_id')->nullable(); 
            $table->string('name', 255); 
            $table->text('description')->nullable();
            $table->decimal('deduction_percentage', 5, 2)->default(0); // Để đó làm tham khảo nếu cần, hoặc có thể dùng ở một số logic sau này
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestampsTz();
            
            $table->foreign('category_id')->references('id')->on('categories')->cascadeOnDelete();
        });

        // Yêu cầu thu cũ của khách hàng
        Schema::create('trade_in_requests', function (Blueprint $table) {
            $table->id();
            $table->string('request_code', 50)->unique();
            $table->unsignedBigInteger('user_id')->nullable();
            
            $table->unsignedBigInteger('category_id')->nullable(); 
            $table->text('machine_info')->nullable(); // Khách hàng tự nhập: Tên máy, RAM, bộ nhớ, v.v.
            $table->json('images')->nullable(); // Mảng URL ảnh do khách upload
            
            $table->string('customer_name', 255);
            $table->string('customer_phone', 30);
            $table->string('customer_email', 255)->nullable();
            
            $table->decimal('estimated_price', 12, 2)->nullable(); // Giá dự kiến/báo giá (Admin sẽ nhập)
            $table->decimal('final_price', 12, 2)->nullable(); // Giá thu thực tế (nếu chốt)
            
            $table->string('status', 30)->default('pending'); // pending, quoted, rejected, completed
            $table->text('admin_note')->nullable(); // Lý do từ chối hoặc ghi chú báo giá
            $table->timestampsTz();
            
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('category_id')->references('id')->on('categories')->nullOnDelete();
        });

        // Bảng trung gian lưu lại các tình trạng khách đã chọn
        Schema::create('trade_in_request_conditions', function (Blueprint $table) {
            $table->unsignedBigInteger('trade_in_request_id');
            $table->unsignedBigInteger('trade_in_condition_id');
            
            $table->primary(['trade_in_request_id', 'trade_in_condition_id'], 'trade_in_req_cond_primary');
            $table->foreign('trade_in_request_id')->references('id')->on('trade_in_requests')->cascadeOnDelete();
            $table->foreign('trade_in_condition_id')->references('id')->on('trade_in_conditions')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trade_in_request_conditions');
        Schema::dropIfExists('trade_in_requests');
        Schema::dropIfExists('trade_in_conditions');
    }
};
