<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\OrderStatusHistory>
 */
class OrderStatusHistoryFactory extends Factory
{
    protected $model = OrderStatusHistory::class;

    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'user_id' => User::factory(),
            'from_status' => 'pending',
            'to_status' => 'processing',
            'note' => fake()->sentence(),
        ];
    }

    public function pendingToProcessing(): static
    {
        return $this->state(fn (array $attributes) => [
            'from_status' => 'pending',
            'to_status' => 'processing',
        ]);
    }

    public function processingToShipped(): static
    {
        return $this->state(fn (array $attributes) => [
            'from_status' => 'processing',
            'to_status' => 'shipped',
        ]);
    }

    public function shippedToDelivered(): static
    {
        return $this->state(fn (array $attributes) => [
            'from_status' => 'shipped',
            'to_status' => 'delivered',
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'from_status' => 'pending',
            'to_status' => 'cancelled',
            'note' => 'Order cancelled by customer',
        ]);
    }
}