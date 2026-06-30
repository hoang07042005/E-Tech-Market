<?php

namespace Database\Seeders;

use App\Models\Coupon;
use App\Models\MembershipRank;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ShippingMethod;
use App\Models\ShippingZone;
use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class TestSeeder extends Seeder
{
    public function run(): void
    {
        // Create roles
        $roles = ['customer', 'admin', 'shop'];
        foreach ($roles as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
        }

        // Create membership ranks
        $ranks = [
            ['rank_name' => 'Bronze', 'min_spend' => 0, 'point_multiplier' => 1.0],
            ['rank_name' => 'Silver', 'min_spend' => 500000, 'point_multiplier' => 1.5],
            ['rank_name' => 'Gold', 'min_spend' => 2000000, 'point_multiplier' => 2.0],
            ['rank_name' => 'Platinum', 'min_spend' => 5000000, 'point_multiplier' => 2.5],
            ['rank_name' => 'Diamond', 'min_spend' => 10000000, 'point_multiplier' => 3.0],
        ];
        foreach ($ranks as $rank) {
            MembershipRank::firstOrCreate(['rank_name' => $rank['rank_name']], $rank);
        }

        // Create test user
        User::firstOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'password' => bcrypt('password123'),
                'phone' => '0123456789',
                'is_active' => true,
            ]
        );

        // Create admin user
        User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin User',
                'password' => bcrypt('admin123'),
                'phone' => '0987654321',
                'is_active' => true,
            ]
        );

        // Create shipping zones
        $zones = [
            ['zone_name' => 'Hồ Chí Minh', 'region' => 'south', 'base_fee' => 25000],
            ['zone_name' => 'Hà Nội', 'region' => 'north', 'base_fee' => 30000],
            ['zone_name' => 'Đà Nẵng', 'region' => 'central', 'base_fee' => 25000],
        ];
        foreach ($zones as $zone) {
            ShippingZone::firstOrCreate(['zone_name' => $zone['zone_name']], $zone);
        }

        // Create shipping methods
        $methods = [
            ['method_name' => 'Giao hàng tiêu standard', 'base_fee' => 25000, 'estimated_days' => '3-5'],
            ['method_name' => 'Giao hàng nhanh', 'base_fee' => 50000, 'estimated_days' => '1-2'],
            ['method_name' => 'Giao hàng hỏa tốc', 'base_fee' => 80000, 'estimated_days' => 'same_day'],
        ];
        foreach ($methods as $method) {
            ShippingMethod::firstOrCreate(['method_name' => $method['method_name']], $method);
        }

        // Create test products
        $products = [
            ['name' => 'Laptop Gaming XYZ', 'sku' => 'LAPTOP-001', 'price' => 15000000],
            ['name' => 'Điện thoại Smartphone Pro', 'sku' => 'PHONE-001', 'price' => 8000000],
            ['name' => 'Tai nghe Bluetooth', 'sku' => 'HEADSET-001', 'price' => 1500000],
            ['name' => 'Bàn phím cơ', 'sku' => 'KEYBOARD-001', 'price' => 2500000],
            ['name' => 'Chuột không dây', 'sku' => 'MOUSE-001', 'price' => 800000],
        ];
        foreach ($products as $product) {
            $prod = Product::firstOrCreate(['sku' => $product['sku']], [
                'name' => $product['name'],
                'sku' => $product['sku'],
                'price' => $product['price'],
                'is_active' => true,
            ]);

            // Create default variant
            ProductVariant::firstOrCreate(
                ['product_id' => $prod->id, 'variant_name' => 'Default'],
                [
                    'product_id' => $prod->id,
                    'variant_name' => 'Default',
                    'sku' => $prod->sku . '-DEFAULT',
                    'price' => $product['price'],
                    'stock_quantity' => 100,
                    'is_active' => true,
                ]
            );
        }

        // Create test coupons
        $coupons = [
            ['code' => 'WELCOME10', 'coupon_type' => 'percentage', 'value' => 10],
            ['code' => 'SAVE50K', 'coupon_type' => 'fixed', 'value' => 50000],
            ['code' => 'VIP20', 'coupon_type' => 'percentage', 'value' => 20],
        ];
        foreach ($coupons as $coupon) {
            Coupon::firstOrCreate(['code' => $coupon['code']], [
                'code' => $coupon['code'],
                'coupon_type' => $coupon['coupon_type'],
                'value' => $coupon['value'],
                'is_active' => true,
                'max_uses' => 100,
            ]);
        }
    }
}