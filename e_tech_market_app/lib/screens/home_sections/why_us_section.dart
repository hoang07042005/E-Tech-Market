import 'package:flutter/material.dart';

class WhyUsSection extends StatelessWidget {
  const WhyUsSection({super.key});

  static const _brandColor = Color(0xFFEF7A45);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 30),
      color: Theme.of(context).colorScheme.surface,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 16,
            mainAxisSpacing: 24,
            childAspectRatio: 1.0,
            children: [
              _WhyUsItem(
                icon: Icons.local_shipping_outlined,
                title: 'Miễn phí vận chuyển',
                description: 'Áp dụng đơn từ 5 triệu đồng',
              ),
              _WhyUsItem(
                icon: Icons.verified_outlined,
                title: 'Bảo hành 24 tháng',
                description: 'Bảo vệ trọn vẹn thiết bị của bạn',
              ),
              _WhyUsItem(
                icon: Icons.support_agent_outlined,
                title: 'Hỗ trợ chuyên gia',
                description: 'Đội ngũ kỹ thuật đồng hành 24/7',
              ),
              _WhyUsItem(
                icon: Icons.credit_card_outlined,
                title: 'Thanh toán an toàn',
                description: 'Giao dịch được mã hóa 100%',
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _WhyUsItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;

  const _WhyUsItem({
    required this.icon,
    required this.title,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            color: Color(0xFFEF7A45).withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Center(
            child: Icon(
              icon,
              color: Color(0xFFEF7A45),
              size: 28,
            ),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          title,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: Theme.of(context).colorScheme.onSurface,
            height: 1.3,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          description,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 12,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
            height: 1.4,
          ),
        ),
      ],
    );
  }
}
