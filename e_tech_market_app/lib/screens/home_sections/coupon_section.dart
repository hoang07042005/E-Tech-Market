import 'dart:async';

import 'package:flutter/material.dart';

import '../../utils/translation.dart';

class CouponSection extends StatefulWidget {
  final List<dynamic> coupons;
  final bool isLoading;
  final String? error;
  final Function(String) onSaveCoupon;
  final Function(String) onCopyCoupon;

  const CouponSection({
    super.key,
    required this.coupons,
    required this.isLoading,
    this.error,
    required this.onSaveCoupon,
    required this.onCopyCoupon,
  });

  @override
  State<CouponSection> createState() => _CouponSectionState();
}

class _CouponSectionState extends State<CouponSection> {
  static const _brandColor = Color(0xFFEF7A45);
  static const _brandDark = Color(0xFFDB5E12);
  static const _softBgColor = Color(0xFFF9F9FA);
  static const _borderColor = Color(0xFFEAEAEA);

  final ScrollController _scrollController = ScrollController();
  Timer? _autoScrollTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _startAutoScroll());
  }

  @override
  void didUpdateWidget(CouponSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.coupons.length != widget.coupons.length ||
        oldWidget.isLoading != widget.isLoading) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _startAutoScroll());
    }
  }

  @override
  void dispose() {
    _autoScrollTimer?.cancel();
    _scrollController.dispose();
    super.dispose();
  }

  void _startAutoScroll() {
    _autoScrollTimer?.cancel();
    if (!mounted || widget.isLoading || widget.coupons.length <= 1) return;

    _autoScrollTimer = Timer.periodic(const Duration(milliseconds: 35), (_) {
      if (!mounted || !_scrollController.hasClients) return;

      final maxOffset = _scrollController.position.maxScrollExtent;
      if (maxOffset <= 0) return;

      final nextOffset = _scrollController.offset + 0.8;
      if (nextOffset >= maxOffset) {
        _scrollController.jumpTo(0);
      } else {
        _scrollController.jumpTo(nextOffset);
      }
    });
  }

  String _formatPrice(String price) {
    try {
      String cleanPrice = price;
      if (price.contains('.')) {
        cleanPrice = price.split('.').first;
      }
      final num = int.parse(cleanPrice);
      return num.toString()
          .replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (match) => '.');
    } catch (_) {
      return price;
    }
  }

  String _formatPercentage(String value) {
    try {
      if (value.contains('.')) {
        final doubleValue = double.parse(value);
        if (doubleValue == doubleValue.toInt()) {
          return doubleValue.toInt().toString();
        }
        return doubleValue.toString();
      }
      return value;
    } catch (_) {
      return value;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
      color: Theme.of(context).colorScheme.surface,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Ưu đãi dành cho bạn',
                      style: TextStyle(
                        fontSize: 16, 
                        fontWeight: FontWeight.w700,
                        color: Theme.of(context).colorScheme.onSurface,
                        letterSpacing: -0.3,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Chạm vào mã để sao chép nhanh',
                      style: TextStyle(
                        fontSize: 12, 
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: _brandColor.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '${widget.coupons.length} ưu đãi',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: _brandColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          if (widget.error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(
                widget.error!,
                style: const TextStyle(
                  color: Colors.redAccent, 
                  fontWeight: FontWeight.w500,
                  fontSize: 12,
                ),
              ),
            ),
          if (widget.isLoading)
            _buildLoadingCoupons()
          else if (widget.coupons.isEmpty)
            Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: Text(
                  'Hiện tại không có ưu đãi nào phù hợp.',
                    style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurfaceVariant),
                ),
              ),
            )
          else
            _buildCouponList(),
        ],
      ),
    );
  }

  Widget _buildLoadingCoupons() {
    return SizedBox(
      height: 135,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: 2,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, index) => Container(
          width: 260,
          decoration: BoxDecoration(
            color: _softBgColor,
            borderRadius: BorderRadius.circular(10),
          ),
        ),
      ),
    );
  }

  Widget _buildCouponList() {
    return SizedBox(
      height: 140, // Điều chỉnh chiều cao cân đối gọn gàng
      child: ListView.separated(
        controller: _scrollController,
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        itemCount: widget.coupons.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final coupon = widget.coupons[index] as Map<String, dynamic>;
          final code = coupon['code'] as String? ?? '';
          final couponType = coupon['coupon_type'] as String? ?? 'fixed';
          final value = coupon['value']?.toString() ?? '0';
          final minAmount = coupon['min_order_amount'];

          final valueText = couponType == 'percentage'
              ? Trans.discountPercentValue((double.tryParse(value) ?? 0).toInt())
              : Trans.discountAmountValue2(double.tryParse(value) ?? 0);

          final subtitle = minAmount != null
              ? Trans.ordersFrom(double.tryParse(minAmount.toString()) ?? 0)
              : Trans.allOrders;

          return _CouponCard(
            code: code,
            valueText: valueText,
            subtitle: subtitle,
            onCopy: () => widget.onCopyCoupon(code),
            onSave: () => widget.onSaveCoupon(code),
          );
        },
      ),
    );
  }
}

class _CouponCard extends StatelessWidget {
  final String code;
  final String valueText;
  final String subtitle;
  final VoidCallback onCopy;
  final VoidCallback onSave;

  const _CouponCard({
    required this.code,
    required this.valueText,
    required this.subtitle,
    required this.onCopy,
    required this.onSave,
  });

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _VoucherPainter(
        backgroundColor: Theme.of(context).colorScheme.surface,
        borderColor: Theme.of(context).colorScheme.outline,
      ),
      child: Container(
        width: 265,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Dòng trên: Thông tin chi tiết giảm giá
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(1),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    Icons.local_offer_rounded,
                    size: 25,
                    color: const Color(0xFFEF7A45),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        valueText,
                          style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: Theme.of(context).colorScheme.onSurface,
                          height: 1.2,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        subtitle,
                          style: TextStyle(
                          fontSize: 11,
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                // Nút Lưu mã thiết kế thanh lịch (Nền nhạt chữ đậm)
                TextButton(
                  onPressed: onSave,
                  style: TextButton.styleFrom(
                    backgroundColor: const Color(0xFFFFF2EC),
                    foregroundColor: const Color(0xFFEF7A45),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(6),
                    ),
                  ),
                  child: Text(
                    Trans.save,
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
            const Spacer(),
            // Đường phân cách đứt đoạn nhẹ nhàng thanh lịch
            Row(
              children: List.generate(
                20,
                (index) => Expanded(
                  child: Container(
                    color: index % 2 == 0 ? Colors.transparent : const Color(0xFFE5E5E5),
                    height: 1,
                  ),
                ),
              ),
            ),
            const Spacer(),
            // Dòng dưới: Ô hiển thị mã Code tối giản, tinh tế
            GestureDetector(
              onTap: onCopy,
              child: Container(
                height: 34,
                padding: const EdgeInsets.symmetric(horizontal: 10),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      code,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                        letterSpacing: 0.3,
                      ),
                    ),
                    const Row(
                      children: [
                        Text(
                          'Sao chép',
                          style: TextStyle(
                            fontSize: 10,
                            color: Color(0xFFEF7A45),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        SizedBox(width: 4),
                        Icon(
                          Icons.copy_rounded,
                          size: 12, 
                          color: Color(0xFFEF7A45),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Custom Painter vẽ hình dáng voucher có khoét lỗ và border chính xác
class _VoucherPainter extends CustomPainter {
  final Color backgroundColor;
  final Color borderColor;

  _VoucherPainter({required this.backgroundColor, required this.borderColor});

  @override
  void paint(Canvas canvas, Size size) {
    final path = Path();
    final double radius = 10.0;
    
    // Vị trí lỗ khoét (ở giữa chiều cao card)
    double cutoutY = size.height * 0.45;
    double cutoutRadius = 6.0;

    path.moveTo(0, radius);
    
    // Khoét cạnh trái
    path.lineTo(0, cutoutY - cutoutRadius);
    path.arcToPoint(
      Offset(0, cutoutY + cutoutRadius),
      radius: Radius.circular(cutoutRadius),
      clockwise: true,
    );
    path.lineTo(0, size.height - radius);
    path.arcToPoint(Offset(radius, size.height), radius: Radius.circular(radius), clockwise: false);

    path.lineTo(size.width - radius, size.height);
    path.arcToPoint(Offset(size.width, size.height - radius), radius: Radius.circular(radius), clockwise: false);

    // Khoét cạnh phải
    path.lineTo(size.width, cutoutY + cutoutRadius);
    path.arcToPoint(
      Offset(size.width, cutoutY - cutoutRadius),
      radius: Radius.circular(cutoutRadius),
      clockwise: true,
    );
    path.lineTo(size.width, radius);
    path.arcToPoint(Offset(size.width - radius, 0), radius: Radius.circular(radius), clockwise: false);
    
    path.lineTo(radius, 0);
    path.arcToPoint(Offset(0, radius), radius: Radius.circular(radius), clockwise: false);
    
    path.close();

    // Draw shadow
    canvas.drawShadow(path, Colors.black.withValues(alpha: 0.02), 4.0, false);

    // Draw background
    final bgPaint = Paint()
      ..color = backgroundColor
      ..style = PaintingStyle.fill;
    canvas.drawPath(path, bgPaint);

    // Draw border
    final borderPaint = Paint()
      ..color = borderColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;
    canvas.drawPath(path, borderPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
