<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'category_id' => Category::factory(),
            'name' => $this->faker->words(3, true),
            'slug' => $this->faker->slug(),
            'brand' => $this->faker->words(2, true),
            'description' => $this->faker->paragraph(),
            'rich_html' => '<p>'.$this->faker->paragraph().'</p>',
            'main_image_url' => $this->faker->imageUrl(),
            'is_active' => true,
        ];
    }

    /**
     * State for inactive products
     */
    public function inactive(): static
    {
        return $this->state(function (array $attributes) {
            return [
                'is_active' => false,
            ];
        });
    }

    /**
     * State for products in a specific category
     */
    public function inCategory(?Category $category = null): static
    {
        return $this->state(function (array $attributes) use ($category) {
            return [
                'category_id' => $category?->id ?? Category::factory(),
            ];
        });
    }
}
