<?php

namespace Database\Factories;

use App\Models\Cart;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\ShippingMethod;
use App\Models\ShippingZone;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Order>
 */
class OrderFactory extends Factory
{
    protected $model = Order::class;

    public function definition(): array
    {
        return [
            'order_code' => 'ET-' . fake()->unique()->numerify('######'),
            'user_id' => User::factory(),
            'cart_id' => null,
            'coupon_id' => null,
            'shipping_method_id' => null,
            'shipping_zone_id' => null,
            'status' => 'pending',
            'payment_status' => 'pending',
            'currency' => 'VND',
            'subtotal_amount' => fake()->randomNumber(5),
            'discount_amount' => 0,
            'shipping_fee' => 0,
            'total_amount' => fake()->randomNumber(5),
            'points_used' => 0,
            'points_discount' => 0,
            'points_earned' => fake()->numberBetween(0, 500),
            'shipping_name' => fake()->name(),
            'shipping_phone' => fake()->phoneNumber(),
            'shipping_address_line' => fake()->address(),
            'shipping_province' => fake()->state(),
            'shipping_district' => fake()->city(),
            'shipping_ward' => fake()->streetAddress(),
            'notes' => null,
        ];
    }

    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'pending',
            'payment_status' => 'pending',
        ]);
    }

    public function processing(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'processing',
            'payment_status' => 'paid',
        ]);
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'completed',
            'payment_status' => 'paid',
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'cancelled',
            'payment_status' => 'refunded',
        ]);
    }
}