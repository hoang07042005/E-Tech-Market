<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ProductVariant>
 */
class ProductVariantFactory extends Factory
{
    protected $model = ProductVariant::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'product_id' => Product::factory(),
            'variant_name' => fake()->word(),
            'color' => fake()->colorName(),
            'configuration' => fake()->word(),
            'sku' => fake()->unique()->sku(),
            'price' => fake()->numberBetween(10000, 5000000),
            'discount_type' => null,
            'discount_value' => 0,
            'discount_start_at' => null,
            'discount_end_at' => null,
            'stock_quantity' => fake()->numberBetween(10, 1000),
            'image_url' => fake()->imageUrl(),
            'is_active' => true,
        ];
    }

    /**
     * State for variant with percentage discount.
     */
    public function withPercentageDiscount($value = 10): static
    {
        return $this->state(fn (array $attributes) => [
            'discount_type' => 'percentage',
            'discount_value' => $value,
            'discount_start_at' => now()->subDay(),
            'discount_end_at' => now()->addDay(),
        ]);
    }

    /**
     * State for variant with fixed discount.
     */
    public function withFixedDiscount($value = 50000): static
    {
        return $this->state(fn (array $attributes) => [
            'discount_type' => 'fixed',
            'discount_value' => $value,
            'discount_start_at' => now()->subDay(),
            'discount_end_at' => now()->addDay(),
        ]);
    }

    /**
     * State for variant with expired discount.
     */
    public function withExpiredDiscount(): static
    {
        return $this->state(fn (array $attributes) => [
            'discount_type' => 'percentage',
            'discount_value' => 10,
            'discount_start_at' => now()->subDays(10),
            'discount_end_at' => now()->subDay(),
        ]);
    }

    /**
     * State for variant with future discount.
     */
    public function withFutureDiscount(): static
    {
        return $this->state(fn (array $attributes) => [
            'discount_type' => 'percentage',
            'discount_value' => 10,
            'discount_start_at' => now()->addDay(),
            'discount_end_at' => now()->addDays(10),
        ]);
    }

    /**
     * State for inactive variant.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
