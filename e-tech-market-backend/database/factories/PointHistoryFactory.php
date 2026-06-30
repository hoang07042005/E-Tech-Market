<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\PointHistory;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\PointHistory>
 */
class PointHistoryFactory extends Factory
{
    protected $model = PointHistory::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'order_id' => Order::factory(),
            'points_changed' => fake()->numberBetween(-500, 500),
            'action_type' => fake()->randomElement(['earn', 'spend', 'expire', 'adjust']),
            'description' => fake()->sentence(),
        ];
    }

    public function earn(): static
    {
        return $this->state(fn (array $attributes) => [
            'points_changed' => abs(fake()->numberBetween(50, 500)),
            'action_type' => 'earn',
            'description' => 'Points earned from order',
        ]);
    }

    public function spend(): static
    {
        return $this->state(fn (array $attributes) => [
            'points_changed' => -abs(fake()->numberBetween(50, 300)),
            'action_type' => 'spend',
            'description' => 'Points used for discount',
        ]);
    }

    public function expire(): static
    {
        return $this->state(fn (array $attributes) => [
            'points_changed' => -abs(fake()->numberBetween(100, 200)),
            'action_type' => 'expire',
            'description' => 'Points expired',
        ]);
    }

    public function adjust(): static
    {
        return $this->state(fn (array $attributes) => [
            'points_changed' => fake()->numberBetween(-100, 100),
            'action_type' => 'adjust',
            'description' => 'Manual adjustment by admin',
        ]);
    }
}