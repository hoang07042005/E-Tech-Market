<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class MembershipRanksSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $ranks = [
            [
                'id' => 1,
                'rank_name' => 'Đồng (Bronze)',
                'min_spend' => 0,
                'point_multiplier' => 1.0,
                'benefits' => 'Hưởng các chương trình khuyến mãi cơ bản và các đợt Flash Sale chung toàn sàn.',
            ],
            [
                'id' => 2,
                'rank_name' => 'Bạc (Silver)',
                'min_spend' => 10000000,
                'point_multiplier' => 1.2,
                'benefits' => 'Tặng Voucher trị giá 50.000đ vào tháng sinh nhật khách hàng. Chiết khấu thêm 2% khi mua phụ kiện.',
            ],
            [
                'id' => 3,
                'rank_name' => 'Vàng (Gold)',
                'min_spend' => 30000000,
                'point_multiplier' => 1.5,
                'benefits' => 'Tặng Voucher trị giá 100.000đ vào tháng sinh nhật; Miễn phí dịch vụ bảo dưỡng, vệ sinh laptop/PC định kỳ tại cửa hàng.',
            ],
            [
                'id' => 4,
                'rank_name' => 'Kim Cương (Diamond)',
                'min_spend' => 80000000,
                'point_multiplier' => 2.0,
                'benefits' => 'Ưu tiên xử lý bảo hành; Thời gian đổi trả mở rộng lên 30 ngày; Độc quyền đặt hàng trước các siêu phẩm công nghệ giới hạn (iPhone mới, GPU hiếm).',
            ],
        ];

        foreach ($ranks as $rank) {
            \App\Models\MembershipRank::updateOrCreate(
                ['id' => $rank['id']],
                $rank
            );
        }
    }
}
