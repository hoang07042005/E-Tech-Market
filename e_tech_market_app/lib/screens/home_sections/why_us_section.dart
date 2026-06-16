import 'package:flutter/material.dart';

import '../../utils/translation.dart';

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
          // --- PHẦN TIÊU ĐỀ MỚI ĐƯỢC THÊM VÀO ---
          Text(
            'Tại sao chọn chúng tôi?', 
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: Theme.of(context).colorScheme.onSurface,
              height: 1.2,
            ),
          ),
          const SizedBox(height: 24), // Khoảng cách giữa tiêu đề và danh sách bên dưới
          
          // Sử dụng LayoutBuilder + Wrap thay vì GridView cố định tỉ lệ 1.0 để chống tràn chữ
          LayoutBuilder(
            builder: (context, constraints) {
              // Trừ đi khoảng cách giữa 2 cột (16px) rồi chia đôi
              final itemWidth = (constraints.maxWidth - 16) / 2;
              
              return Wrap(
                spacing: 16,    // Khoảng cách ngang giữa 2 cột
                runSpacing: 24, // Khoảng cách dọc giữa các hàng
                children: [
                  SizedBox(
                    width: itemWidth,
                    child: _WhyUsItem(
                      icon: Icons.local_shipping_outlined,
                      title: Trans.freeShippingTitle,
                      description: Trans.freeShippingOver,
                    ),
                  ),
                  SizedBox(
                    width: itemWidth,
                    child: _WhyUsItem(
                      icon: Icons.verified_outlined,
                      title: Trans.warranty24,
                      description: Trans.warranty24Desc,
                    ),
                  ),
                  SizedBox(
                    width: itemWidth,
                    child: _WhyUsItem(
                      icon: Icons.support_agent_outlined,
                      title: Trans.supportExpert,
                      description: Trans.supportExpertDesc,
                    ),
                  ),
                  SizedBox(
                    width: itemWidth,
                    child: _WhyUsItem(
                      icon: Icons.credit_card_outlined,
                      title: Trans.securePayment,
                      description: Trans.transactionsEncrypted,
                    ),
                  ),
                ],
              );
            },
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
      mainAxisAlignment: MainAxisAlignment.start, // Đổi thành start để các item thẳng hàng từ trên xuống
      crossAxisAlignment: CrossAxisAlignment.center,
      mainAxisSize: MainAxisSize.min, // Tự co kích thước theo nội dung bên trong
      children: [
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            color: const Color(0xFFEF7A45).withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Center(
            child: Icon(
              icon,
              color: const Color(0xFFEF7A45),
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