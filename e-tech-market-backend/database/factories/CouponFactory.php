<?php

namespace Database\Factories;

use App\Models\Coupon;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Coupon>
 */
class CouponFactory extends Factory
{
    protected $model = Coupon::class;

    public function definition(): array
    {
        return [
            'code' => strtoupper(fake()->unique()->bothify('????##')),
            'coupon_type' => fake()->randomElement(['percentage', 'fixed']),
            'value' => fake()->randomElement([5, 10, 15, 20, 50, 100]),
            'min_order_amount' => 0,
            'start_at' => Carbon::now()->subDay(),
            'end_at' => Carbon::now()->addWeek(),
            'max_uses' => 100,
            'max_uses_per_user' => 1,
            'is_active' => true,
        ];
    }

    public function percentage(): static
    {
        return $this->state(fn (array $attributes) => [
            'coupon_type' => 'percentage',
            'value' => fake()->numberBetween(5, 50),
        ]);
    }

    public function fixed(): static
    {
        return $this->state(fn (array $attributes) => [
            'coupon_type' => 'fixed',
            'value' => fake()->numberBetween(10000, 100000),
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    public function expired(): static
    {
        return $this->state(fn (array $attributes) => [
            'end_at' => Carbon::now()->subDay(),
        ]);
    }

    public function notYetStarted(): static
    {
        return $this->state(fn (array $attributes) => [
            'start_at' => Carbon::now()->addWeek(),
            'end_at' => Carbon::now()->addWeeks(2),
        ]);
    }

    public function unlimited(): static
    {
        return $this->state(fn (array $attributes) => [
            'max_uses' => null,
        ]);
    }
}