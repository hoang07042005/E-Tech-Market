<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Create roles
        $roles = ['admin', 'shop', 'customer', 'delivery'];
        foreach ($roles as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
        }

        // Admin user
        $admin = \App\Models\User::updateOrCreate(
            ['email' => 'admin@etech.com'],
            [
                'name' => 'Admin',
                'phone' => '0123456789',
                'password' => Hash::make('admin123'),
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );
        $admin->assignRole('admin');

        // Shop user
        $shop = \App\Models\User::updateOrCreate(
            ['email' => 'shop@etech.com'],
            [
                'name' => 'Shop Manager',
                'phone' => '0123456788',
                'password' => Hash::make('shop123'),
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );
        $shop->assignRole('shop');

        // Delivery staff
        $delivery = \App\Models\User::updateOrCreate(
            ['email' => 'delivery@etech.com'],
            [
                'name' => 'Delivery Staff',
                'phone' => '0123456799',
                'password' => Hash::make('delivery123'),
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );
        $delivery->assignRole('delivery');

        $deliveryRole = Role::findByName('delivery');
        $manageOrdersPerm = \Spatie\Permission\Models\Permission::firstOrCreate(['name' => 'manage-orders', 'guard_name' => 'web']);
        $deliveryRole->givePermissionTo($manageOrdersPerm);

        // Test customer with Vietnamese address
        $customer = \App\Models\User::updateOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Nguyễn Văn A',
                'phone' => '0123456787',
                'password' => Hash::make('password123'),
                'is_active' => true,
                'email_verified_at' => now(),
                'current_points' => 500,
                'address_line' => '12 Nguyễn Văn A',
                'province' => 'Hà Nội',
                'district' => 'Cầu Giấy',
                'ward' => 'Dịch Vọng',
            ]
        );

        // Another test user
        $customer2 = \App\Models\User::updateOrCreate(
            ['email' => 'customer@etech.com'],
            [
                'name' => 'Trần Thị B',
                'phone' => '0901000002',
                'password' => Hash::make('password123'),
                'is_active' => true,
                'email_verified_at' => now(),
                'address_line' => '56 Trần Phú',
                'province' => 'Hồ Chí Minh',
                'district' => 'Quận 1',
                'ward' => 'Phường Bến Nghé',
            ]
        );
        $customer->assignRole('customer');
    }
}