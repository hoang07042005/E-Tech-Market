<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $products = [
            ['name' => 'MacBook Pro 14 inch M3', 'slug' => 'macbook-pro-14-m3', 'brand' => 'Apple', 'description' => 'MacBook Pro 14 inch với chip M3, RAM 16GB, SSD 512GB', 'category_id' => 1],
            ['name' => 'iPhone 15 Pro Max', 'slug' => 'iphone-15-pro-max', 'brand' => 'Apple', 'description' => 'iPhone 15 Pro Max 256GB, Titan tự nhiên', 'category_id' => 2],
            ['name' => 'iPad Pro 12.9 inch M2', 'slug' => 'ipad-pro-12-9-m2', 'brand' => 'Apple', 'description' => 'iPad Pro 12.9 inch với chip M2, WiFi 256GB', 'category_id' => 3],
            ['name' => 'AirPods Pro 2', 'slug' => 'airpods-pro-2', 'brand' => 'Apple', 'description' => 'Tai nghe AirPods Pro thế hệ thứ 2', 'category_id' => 4],
            ['name' => 'Apple Watch Series 9', 'slug' => 'apple-watch-series-9', 'brand' => 'Apple', 'description' => 'Apple Watch Series 9 GPS 45mm', 'category_id' => 5],
            ['name' => 'Samsung Galaxy S24 Ultra', 'slug' => 'samsung-galaxy-s24-ultra', 'brand' => 'Samsung', 'description' => 'Samsung Galaxy S24 Ultra 12GB/256GB', 'category_id' => 2],
            ['name' => 'Dell XPS 15', 'slug' => 'dell-xps-15', 'brand' => 'Dell', 'description' => 'Dell XPS 15 Intel Core i7, RAM 16GB, SSD 512GB', 'category_id' => 1],
            ['name' => 'Logitech MX Master 3S', 'slug' => 'logitech-mx-master-3s', 'brand' => 'Logitech', 'description' => 'Chuột không dây Logitech MX Master 3S', 'category_id' => 6],
        ];

        foreach ($products as $productData) {
            $product = \App\Models\Product::updateOrCreate(
                ['slug' => $productData['slug']],
                ['name' => $productData['name'], 'brand' => $productData['brand'], 'description' => $productData['description'], 'category_id' => $productData['category_id'], 'is_active' => true]
            );

            // Add variants for some products
            if ($productData['slug'] === 'macbook-pro-14-m3') {
                \App\Models\ProductVariant::updateOrCreate(
                    ['product_id' => $product->id, 'sku' => 'MBP14-M3-256'],
                    ['product_id' => $product->id, 'variant_name' => 'Space Gray - 256GB', 'color' => 'Space Gray', 'configuration' => '256GB', 'sku' => 'MBP14-M3-256', 'price' => 32990000, 'stock_quantity' => 10, 'is_active' => true]
                );
                \App\Models\ProductVariant::updateOrCreate(
                    ['product_id' => $product->id, 'sku' => 'MBP14-M3-512'],
                    ['product_id' => $product->id, 'variant_name' => 'Space Gray - 512GB', 'color' => 'Space Gray', 'configuration' => '512GB', 'sku' => 'MBP14-M3-512', 'price' => 36990000, 'stock_quantity' => 5, 'is_active' => true]
                );
            } elseif ($productData['slug'] === 'iphone-15-pro-max') {
                \App\Models\ProductVariant::updateOrCreate(
                    ['product_id' => $product->id, 'sku' => 'IP15PM-256-NAT'],
                    ['product_id' => $product->id, 'variant_name' => 'Titan tự nhiên - 256GB', 'color' => 'Titan tự nhiên', 'configuration' => '256GB', 'sku' => 'IP15PM-256-NAT', 'price' => 28990000, 'stock_quantity' => 15, 'is_active' => true]
                );
            } elseif ($productData['slug'] === 'airpods-pro-2') {
                \App\Models\ProductVariant::updateOrCreate(
                    ['product_id' => $product->id, 'sku' => 'APP2-W'],
                    ['product_id' => $product->id, 'variant_name' => 'AirPods Pro 2 - White', 'color' => 'White', 'sku' => 'APP2-W', 'price' => 4990000, 'stock_quantity' => 20, 'is_active' => true]
                );
            }
        }
    }
}