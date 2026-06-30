<?php

namespace Database\Factories;

use App\Models\MembershipRank;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\MembershipRank>
 */
class MembershipRankFactory extends Factory
{
    protected $model = MembershipRank::class;

    public function definition(): array
    {
        return [
            'rank_name' => fake()->randomElement(['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond']),
            'min_spend' => fake()->randomElement([0, 500000, 2000000, 5000000, 10000000]),
            'point_multiplier' => fake()->randomFloat(1, 1.0, 3.0),
            'benefits' => json_encode([
                'free_shipping' => true,
                'discount' => fake()->numberBetween(5, 15),
                'early_access' => fake()->boolean(),
            ]),
        ];
    }

    public function bronze(): static
    {
        return $this->state(fn (array $attributes) => [
            'rank_name' => 'Bronze',
            'min_spend' => 0,
            'point_multiplier' => 1.0,
        ]);
    }

    public function silver(): static
    {
        return $this->state(fn (array $attributes) => [
            'rank_name' => 'Silver',
            'min_spend' => 500000,
            'point_multiplier' => 1.5,
        ]);
    }

    public function gold(): static
    {
        return $this->state(fn (array $attributes) => [
            'rank_name' => 'Gold',
            'min_spend' => 2000000,
            'point_multiplier' => 2.0,
        ]);
    }

    public function platinum(): static
    {
        return $this->state(fn (array $attributes) => [
            'rank_name' => 'Platinum',
            'min_spend' => 5000000,
            'point_multiplier' => 2.5,
        ]);
    }

    public function diamond(): static
    {
        return $this->state(fn (array $attributes) => [
            'rank_name' => 'Diamond',
            'min_spend' => 10000000,
            'point_multiplier' => 3.0,
        ]);
    }
}