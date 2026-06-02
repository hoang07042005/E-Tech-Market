import 'package:flutter/material.dart';

class FutureSection extends StatelessWidget {
  const FutureSection({super.key});

  static const Color _brandColor = Color(0xFFEF7A45);
  static const Color _surfaceColor = Color(0xFFFFFFFF);
  static const Color _backgroundLeft = Color(0xFFFFF5EE);
  static const Color _backgroundRight = Color(0xFFFFF0E5);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: _surfaceColor,
        borderRadius: BorderRadius.circular(5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 18,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isWide = constraints.maxWidth >= 680;
          final textSection = Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'ĐỘ CHÍNH XÁC KỸ THUẬT',
                style: TextStyle(
                  color: _brandColor,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: 14),
              const Text(
                'Công nghệ tương lai\nđược tạo nên một cách tinh xảo',
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF111827),
                  height: 1.1,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Chúng tôi không chỉ bán thiết bị điện tử — chúng tôi chọn lọc những công cụ thúc đẩy sự tiến bộ. Quy trình tuyển chọn dựa trên kiểm định kỹ thuật khắt khe để mỗi sản phẩm đạt tiêu chuẩn “Chất lượng không thỏa hiệp”.',
                style: TextStyle(
                  fontSize: 14,
                  color: Color(0xFF4B5563),
                  height: 1.7,
                ),
              ),
              const SizedBox(height: 22),
              Row(
                children: [
                  _StatPill(label: 'ĐỘ DUNG SAI CHẾ TẠO', value: '0.01mm'),
                  const SizedBox(width: 12),
                  _StatPill(label: 'ĐỘ TRONG CỦA TÍN HIỆU', value: '99.9%'),
                ],
              ),
            ],
          );

          final visualSection = Container(
            height: 260,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [_backgroundLeft, _backgroundRight],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(5),
            ),
            child: Stack(
              children: [
                Center(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(5),
                    child: SizedBox(
                    //   width: 240,
                    //   height: 240,
                      child: Image.asset(
                        'assets/images/unnamed.png',
                        fit: BoxFit.cover,
                        width: double.infinity,
                        height: double.infinity,
                      ),
                    ),
                  ),
                ),
                Positioned(
                  top: 18,
                  right: 18,
                  child: Container(
                    width: 68,
                    height: 68,
                    decoration: BoxDecoration(
                      color: _brandColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(5),
                    ),
                    child: const Icon(Icons.memory, color: _brandColor, size: 34),
                  ),
                ),
              ],
            ),
          );

          return isWide
              ? Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(child: textSection),
                    const SizedBox(width: 20),
                    Expanded(child: visualSection),
                  ],
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    textSection,
                    const SizedBox(height: 18),
                    visualSection,
                  ],
                );
        },
      ),
    );
  }
}

class _StatPill extends StatelessWidget {
  final String label;
  final String value;
  const _StatPill({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFFAE3D1)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 12,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(value,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF111827),
                )),
            const SizedBox(height: 4),
            Text(label,
                style: const TextStyle(
                  fontSize: 10,
                  color: Color(0xFF6B7280),
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.3,
                )),
          ],
        ),
      ),
    );
  }
}
