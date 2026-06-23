import 'package:flutter/material.dart';

class QuickActionChips extends StatelessWidget {
  final void Function(String message) onChipTap;

  const QuickActionChips({super.key, required this.onChipTap});

  static const List<Map<String, dynamic>> _actions = [
    {
      'label': '🔍 Tìm & Gợi ý sản phẩm',
      'message': 'Tìm & Gợi ý sản phẩm',
      'color': Color(0xFF3B82F6),
    },
    {
      'label': '⚖️ So sánh sản phẩm',
      'message': 'So sánh sản phẩm',
      'color': Color(0xFF10B981),
    },
    {
      'label': '📦 Tra cứu đơn hàng',
      'message': 'Tra cứu đơn hàng',
      'color': Color(0xFF8B5CF6),
    },
    {
      'label': '🎁 Ưu đãi & Khuyến mãi',
      'message': 'Ưu đãi & Khuyến mãi',
      'color': Color(0xFFF59E0B),
    },
    {
      'label': '💬 Cần tư vấn chuyên sâu',
      'message': 'Cần tư vấn chuyên sâu',
      'color': Color(0xFFEC4899),
    },
    {
      'label': '❓ Câu hỏi thường gặp (FAQs)',
      'message': 'Câu hỏi thường gặp (FAQs)',
      'color': Color(0xFFEF4444),
    },
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Text(
              'Bạn cần hỗ trợ gì?',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: isDark
                    ? const Color(0xFF94A3B8)
                    : const Color(0xFF64748B),
              ),
            ),
          ),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _actions.map((action) {
              final color = action['color'] as Color;
              return Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () => onChipTap(action['message'] as String),
                  borderRadius: BorderRadius.circular(20),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: isDark ? 0.15 : 0.08),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: color.withValues(alpha: isDark ? 0.3 : 0.2),
                      ),
                    ),
                    child: Text(
                      action['label'] as String,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: isDark ? color.withValues(alpha: 0.9) : color,
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}
