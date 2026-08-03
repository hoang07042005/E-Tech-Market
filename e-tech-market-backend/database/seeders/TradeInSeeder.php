<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\TradeInCondition;
use App\Models\Category;

class TradeInSeeder extends Seeder
{
    public function run(): void
    {
        $phoneCat = Category::where('slug', 'dien-thoai')->first();
        $laptopCat = Category::where('slug', 'laptop')->first();
        
        $phoneCatId = $phoneCat ? $phoneCat->id : 1;
        $laptopCatId = $laptopCat ? $laptopCat->id : 2;

        // Conditions for Phones
        $phoneConditions = [
            [
                'category_id' => $phoneCatId,
                'name' => 'Kính xước nhẹ',
                'description' => 'Mặt kính có vết xước lông mèo, không ảnh hưởng hiển thị.',
                'sort_order' => 1
            ],
            [
                'category_id' => $phoneCatId,
                'name' => 'Vỏ cấn móp nhẹ',
                'description' => 'Vỏ ngoài bị trầy xước hoặc cấn móp góc nhẹ.',
                'sort_order' => 2
            ],
            [
                'category_id' => $phoneCatId,
                'name' => 'Màn hình lưu ảnh / Ám ố',
                'description' => 'Màn hình hiển thị không chuẩn màu, bị burn-in nhẹ.',
                'sort_order' => 3
            ],
            [
                'category_id' => $phoneCatId,
                'name' => 'Mất FaceID/Vân tay',
                'description' => 'Chức năng sinh trắc học không hoạt động.',
                'sort_order' => 4
            ],
        ];

        // Conditions for Laptops
        $laptopConditions = [
            [
                'category_id' => $laptopCatId,
                'name' => 'Ngoại hình xước',
                'description' => 'Vỏ trầy xước, bàn phím bóng.',
                'sort_order' => 1
            ],
            [
                'category_id' => $laptopCatId,
                'name' => 'Màn hình điểm chết',
                'description' => 'Màn hình có đốm sáng hoặc điểm chết nhỏ.',
                'sort_order' => 2
            ],
            [
                'category_id' => $laptopCatId,
                'name' => 'Pin chai',
                'description' => 'Pin báo Service hoặc chai > 30%.',
                'sort_order' => 3
            ],
        ];

        $conditions = array_merge($phoneConditions, $laptopConditions);

        foreach ($conditions as $cond) {
            TradeInCondition::updateOrCreate(
                ['name' => $cond['name'], 'category_id' => $cond['category_id']],
                $cond
            );
        }
    }
}
