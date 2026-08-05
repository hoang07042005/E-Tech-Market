import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

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

class _CouponSectionState extends State<CouponSection> with SingleTickerProviderStateMixin {
  static const _brandColor = Color(0xFFEF7A45);

  final ScrollController _scrollController = ScrollController();
  Ticker? _ticker;

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
    _ticker?.stop();
    _ticker?.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _startAutoScroll() {
    if (!mounted || widget.isLoading || widget.coupons.length <= 1) {
      _ticker?.stop();
      return;
    }

    if (_ticker == null) {
      _ticker = createTicker((elapsed) {
        if (!mounted || !_scrollController.hasClients) return;

        final maxOffset = _scrollController.position.maxScrollExtent;
        if (maxOffset <= 0) return;

        final nextOffset = _scrollController.offset + 1.0;
        if (nextOffset >= maxOffset) {
          _scrollController.jumpTo(0);
        } else {
          _scrollController.jumpTo(nextOffset);
        }
      });
    }

    if (!_ticker!.isActive) {
      _ticker!.start();
    }
  }

  /// Lọc ẩn mã user đã hết lượt (giống web frontend)
  /// Chỉ lọc khi đã đăng nhập - nếu chưa đăng nhập thì hiển thị tất cả
  List<Map<String, dynamic>> _getVisibleCoupons() {
    return widget.coupons.cast<Map<String, dynamic>>().where((c) {
      // Giống web: chỉ lọc khi max_uses_per_user có giá trị và user đã dùng hết lượt
      final maxPerUser = c['max_uses_per_user'];
      final userUsed = c['user_usage_count'] ?? 0;
      if (maxPerUser != null && maxPerUser is num && maxPerUser > 0 && userUsed is num) {
        if (userUsed >= maxPerUser) return false;
      }
      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final visibleCoupons = _getVisibleCoupons();

    if (!widget.isLoading && visibleCoupons.isEmpty) {
      return const SizedBox.shrink();
    }

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
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        const Icon(Icons.card_giftcard, color: Color(0xFFFF2424), size: 28),
                        const SizedBox(width: 6), 
                        Expanded( 
                          child: Text(
                            'Ưu đãi dành cho bạn',
                            style: TextStyle(
                              fontSize: 18, 
                              fontWeight: FontWeight.w700,
                              color: Theme.of(context).colorScheme.onSurface,
                              letterSpacing: -0.3,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4), 
                    Text(
                      'Chạm vào mã để sao chép nhanh',
                      style: TextStyle(
                        fontSize: 15, 
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
                  '${visibleCoupons.length} ưu đãi',
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
          else
            _buildCouponList(visibleCoupons),
        ],
      ),
    );
  }

  Widget _buildLoadingCoupons() {
    return SizedBox(
      height: 150,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: 2,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, index) => Container(
          width: 330,
          decoration: BoxDecoration(
            color: const Color(0xFFF9F9FA),
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }

  Widget _buildCouponList(List<Map<String, dynamic>> visibleCoupons) {
    // Nhân đôi danh sách để auto-scroll liền mạch (giống web)
    final items = [...visibleCoupons, ...visibleCoupons];

    return SizedBox(
      height: 130,
      child: ListView.separated(
        controller: _scrollController,
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final coupon = items[index];
          final code = coupon['code'] as String? ?? '';
          final couponType = coupon['coupon_type'] as String? ?? 'fixed';
          final value = coupon['value']?.toString() ?? '0';
          final minAmount = coupon['min_order_amount'];
          final isSaved = coupon['is_saved'] == true;

          // Tính lượt còn lại
          final maxPerUser = coupon['max_uses_per_user'];
          final userUsed = coupon['user_usage_count'] ?? 0;
          final maxUses = coupon['max_uses'];
          final usagesCount = coupon['usages_count'] ?? 0;

          int? showRemaining;
          int? showLimit;
          if (maxPerUser != null && maxPerUser is num) {
            showRemaining = (maxPerUser - (userUsed as num)).toInt();
            showLimit = maxPerUser.toInt();
          } else if (maxUses != null && maxUses is num) {
            showRemaining = (maxUses - (usagesCount as num)).toInt();
            showLimit = maxUses.toInt();
          }

          final subtitle = minAmount != null
              ? Trans.ordersFrom(double.tryParse(minAmount.toString()) ?? 0)
              : Trans.allOrders;

          return _CouponCard(
            code: code,
            couponType: couponType,
            value: double.tryParse(value) ?? 0.0,
            subtitle: subtitle,
            isSaved: isSaved,
            showRemaining: showRemaining,
            showLimit: showLimit,
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
  final String couponType;
  final double value;
  final String subtitle;
  final bool isSaved;
  final int? showRemaining;
  final int? showLimit;
  final VoidCallback onCopy;
  final VoidCallback onSave;

  const _CouponCard({
    required this.code,
    required this.couponType,
    required this.value,
    required this.subtitle,
    required this.isSaved,
    this.showRemaining,
    this.showLimit,
    required this.onCopy,
    required this.onSave,
  });

  @override
  Widget build(BuildContext context) {
    final leftWidth = 110.0;
    
    return CustomPaint(
      painter: _VoucherPainter(
        leftWidth: leftWidth,
      ),
      child: SizedBox(
        width: 330,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Left Part
            SizedBox(
              width: leftWidth,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                 
                  const SizedBox(height: 2),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        couponType == 'percentage'
                            ? value.toInt().toString()
                            : (value / 1000).floor().toString(),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 23,
                          fontWeight: FontWeight.w800,
                          height: 1.0,
                        ),
                      ),
                      Text(
                        couponType == 'percentage' ? ',00%' : 'K',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.white.withOpacity(0.5)),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      couponType == 'percentage' ? 'Phiếu ưu đãi' : 'Giảm trực tiếp',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // Right Part
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(14, 12, 12, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Top Section
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(
                          Icons.local_offer_outlined,
                          color: Color(0xFFFF6B00),
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                couponType == 'percentage'
                                    ? '${value.toInt()}%'
                                    : '${Trans.discountAmountValue2(value)}',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.black87,
                                  height: 1.2,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                subtitle,
                                style: TextStyle(
                                  fontSize: 10,
                                  color: Colors.black54,
                                  fontWeight: FontWeight.w600,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 6),
                        // Save Button
                        TextButton(
                          onPressed: isSaved ? null : onSave,
                          style: TextButton.styleFrom(
                            backgroundColor: isSaved
                                ? const Color(0xFFF3F4F6)
                                : const Color(0xFFFFF2EC),
                            foregroundColor: isSaved
                                ? const Color(0xFF9CA3AF)
                                : const Color(0xFFFF6B00),
                            disabledForegroundColor: const Color(0xFF9CA3AF),
                            disabledBackgroundColor: const Color(0xFFF3F4F6),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(4),
                            ),
                          ),
                          child: Text(
                            isSaved ? 'Đã lưu' : 'Lưu',
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
                          ),
                        ),
                      ],
                    ),
                    // Progress Bar
                    if (showRemaining != null && showLimit != null && showLimit! > 0) ...[
                      const SizedBox(height: 8),
                      Container(
                        height: 1,
                        color: Theme.of(context).colorScheme.outlineVariant.withOpacity(0.5),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(
                            Icons.timer_outlined,
                            size: 14,
                            color: const Color(0xFFFF6B00),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Còn ',
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.black54,
                            ),
                          ),
                          Text(
                            '$showRemaining/$showLimit',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFFFF6B00),
                            ),
                          ),
                          const Text(
                            ' lượt',
                            style: TextStyle(
                              fontSize: 11,
                              color: Color(0xFFFF6B00),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: SizedBox(
                                height: 5,
                                child: LinearProgressIndicator(
                                  value: ((showLimit! - showRemaining!) / showLimit!).clamp(0.0, 1.0),
                                  backgroundColor: const Color(0xFFFEE2E2),
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                    const Color(0xFFFF6B00),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                    const Spacer(),
                    // Code Box
                    GestureDetector(
                      onTap: onCopy,
                      child: Container(
                        height: 26,
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        decoration: BoxDecoration(
                          color: Colors.grey[200],
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: Colors.grey[400]!.withOpacity(0.5)),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.confirmation_number_outlined,
                              size: 14,
                              color: Color(0xFFFF6B00),
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                code,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.black87,
                                ),
                              ),
                            ),
                            const Icon(
                              Icons.copy_rounded,
                              size: 16,
                              color: Color(0xFF9CA3AF),
                            ),
                          ],
                        ),
                      ),
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

class _VoucherPainter extends CustomPainter {
  final double leftWidth;

  _VoucherPainter({required this.leftWidth});

  @override
  void paint(Canvas canvas, Size size) {
    final double radius = 12.0;
    final double holeRadius = 6.0;
    final double bigHoleRadius = 8.0;
    
    // Draw right part shadow
    final ticketPath = Path();
    ticketPath.moveTo(radius, 0);
    // Top edge and divider hole
    ticketPath.lineTo(leftWidth - holeRadius, 0);
    ticketPath.arcToPoint(Offset(leftWidth + holeRadius, 0), radius: Radius.circular(holeRadius), clockwise: false);
    ticketPath.lineTo(size.width - radius, 0);
    // Top right corner
    ticketPath.arcToPoint(Offset(size.width, radius), radius: Radius.circular(radius), clockwise: true);
    // Right edge and hole
    ticketPath.lineTo(size.width, size.height * 0.5 - holeRadius);
    ticketPath.arcToPoint(Offset(size.width, size.height * 0.5 + holeRadius), radius: Radius.circular(holeRadius), clockwise: false);
    ticketPath.lineTo(size.width, size.height - radius);
    // Bottom right corner
    ticketPath.arcToPoint(Offset(size.width - radius, size.height), radius: Radius.circular(radius), clockwise: true);
    // Bottom edge and divider hole
    ticketPath.lineTo(leftWidth + holeRadius, size.height);
    ticketPath.arcToPoint(Offset(leftWidth - holeRadius, size.height), radius: Radius.circular(holeRadius), clockwise: false);
    ticketPath.lineTo(radius, size.height);
    // Bottom left corner
    ticketPath.arcToPoint(Offset(0, size.height - radius), radius: Radius.circular(radius), clockwise: true);
    // Left edge and big hole
    ticketPath.lineTo(0, size.height * 0.5 + bigHoleRadius);
    ticketPath.arcToPoint(Offset(0, size.height * 0.5 - bigHoleRadius), radius: Radius.circular(bigHoleRadius), clockwise: false); 
    ticketPath.lineTo(0, radius);
    // Top left corner
    ticketPath.arcToPoint(Offset(radius, 0), radius: Radius.circular(radius), clockwise: true);
    ticketPath.close();

    canvas.drawShadow(ticketPath, Colors.black.withOpacity(0.06), 8.0, false);

    // Left Path
    final lPath = Path();
    lPath.moveTo(radius, 0);
    lPath.lineTo(leftWidth - holeRadius, 0);
    lPath.arcToPoint(Offset(leftWidth, holeRadius), radius: Radius.circular(holeRadius), clockwise: false);
    lPath.lineTo(leftWidth, size.height - holeRadius);
    lPath.arcToPoint(Offset(leftWidth - holeRadius, size.height), radius: Radius.circular(holeRadius), clockwise: false);
    lPath.lineTo(radius, size.height);
    lPath.arcToPoint(Offset(0, size.height - radius), radius: Radius.circular(radius), clockwise: true);
    lPath.lineTo(0, size.height * 0.5 + bigHoleRadius);
    lPath.arcToPoint(Offset(0, size.height * 0.5 - bigHoleRadius), radius: Radius.circular(bigHoleRadius), clockwise: false);
    lPath.lineTo(0, radius);
    lPath.arcToPoint(Offset(radius, 0), radius: Radius.circular(radius), clockwise: true);
    lPath.close();

    final leftGradient = LinearGradient(
      colors: const [Color(0xFFFF8C4A), Color(0xFFFF5715)],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    ).createShader(Rect.fromLTWH(0, 0, leftWidth, size.height));
    
    canvas.drawPath(lPath, Paint()..shader = leftGradient);

    // Right Path
    final rPath = Path();
    rPath.moveTo(leftWidth, holeRadius);
    rPath.arcToPoint(Offset(leftWidth + holeRadius, 0), radius: Radius.circular(holeRadius), clockwise: false);
    rPath.lineTo(size.width - radius, 0);
    rPath.arcToPoint(Offset(size.width, radius), radius: Radius.circular(radius), clockwise: true);
    rPath.lineTo(size.width, size.height * 0.5 - holeRadius);
    rPath.arcToPoint(Offset(size.width, size.height * 0.5 + holeRadius), radius: Radius.circular(holeRadius), clockwise: false);
    rPath.lineTo(size.width, size.height - radius);
    rPath.arcToPoint(Offset(size.width - radius, size.height), radius: Radius.circular(radius), clockwise: true);
    rPath.lineTo(leftWidth + holeRadius, size.height);
    rPath.arcToPoint(Offset(leftWidth, size.height - holeRadius), radius: Radius.circular(holeRadius), clockwise: false);
    rPath.lineTo(leftWidth, holeRadius);
    rPath.close();

    final rightGradient = LinearGradient(
      colors: const [Color(0xFFFFC1A5), Color(0xFFF9EAE4)],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    ).createShader(Rect.fromLTWH(leftWidth, 0, size.width - leftWidth, size.height));
    
    canvas.drawPath(rPath, Paint()..shader = rightGradient);

    // Draw dashed line
    final double dashWidth = 4, dashSpace = 4;
    double startY = holeRadius + 4;
    final dashPaint = Paint()
      ..color = const Color(0xFFE5E5E5)
      ..strokeWidth = 1.0;
      
    while (startY < size.height - holeRadius - 4) {
      canvas.drawLine(Offset(leftWidth, startY), Offset(leftWidth, startY + dashWidth), dashPaint);
      startY += dashWidth + dashSpace;
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
