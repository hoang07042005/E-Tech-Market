<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Laptop', 'slug' => 'laptop', 'type' => 'product', 'is_active' => true, 'image' => 'categories/laptop.png'],
            ['name' => 'Điện thoại', 'slug' => 'dien-thoai', 'type' => 'product', 'is_active' => true, 'image' => 'categories/phone.png'],
            ['name' => 'Tablet', 'slug' => 'tablet', 'type' => 'product', 'is_active' => true, 'image' => 'categories/tablet.png'],
            ['name' => 'Tai nghe', 'slug' => 'tai-nghe', 'type' => 'product', 'is_active' => true, 'image' => 'categories/headphone.png'],
            ['name' => 'Đồng hồ thông minh', 'slug' => 'dong-ho-thong-minh', 'type' => 'product', 'is_active' => true, 'image' => 'categories/watch.png'],
            ['name' => 'Phụ kiện', 'slug' => 'phu-kien', 'type' => 'product', 'is_active' => true, 'image' => 'categories/accessory.png'],
            ['name' => 'PC - Máy bàn', 'slug' => 'pc-may-ban', 'type' => 'product', 'is_active' => true, 'image' => 'categories/pc.png'],
            ['name' => 'Màn hình', 'slug' => 'man-hinh', 'type' => 'product', 'is_active' => true, 'image' => 'categories/monitor.png'],
        ];

        foreach ($categories as $category) {
            \App\Models\Category::updateOrCreate(
                ['slug' => $category['slug']],
                $category
            );
        }
    }
}