<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Payment>
 */
class PaymentFactory extends Factory
{
    protected $model = Payment::class;

    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'method' => fake()->randomElement(['vnpay', 'momo', 'cod']),
            'amount' => fake()->randomNumber(6),
            'currency' => 'VND',
            'transaction_code' => null,
            'status' => 'pending',
            'paid_at' => null,
        ];
    }

    public function vnpay(): static
    {
        return $this->state(fn (array $attributes) => [
            'method' => 'vnpay',
        ]);
    }

    public function momo(): static
    {
        return $this->state(fn (array $attributes) => [
            'method' => 'momo',
        ]);
    }

    public function cod(): static
    {
        return $this->state(fn (array $attributes) => [
            'method' => 'cod',
        ]);
    }

    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'pending',
            'paid_at' => null,
        ]);
    }

    public function paid(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'paid',
            'paid_at' => now(),
        ]);
    }

    public function failed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'failed',
            'paid_at' => null,
        ]);
    }

    public function refunded(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'refunded',
        ]);
    }
}