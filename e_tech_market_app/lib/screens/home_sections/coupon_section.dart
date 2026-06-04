import 'dart:async';

import 'package:flutter/material.dart';

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
  static const _softOrange = Color(0xFFFFF2E6);
  static const _borderColor = Color(0xFFFFD6B8);

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
      final num = int.parse(price);
      return num.toString()
          .replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (match) => '.');
    } catch (_) {
      return price;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(5),

      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Ưu đãi dành cho bạn',
                      style:
                          TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                    ),
                    SizedBox(height: 6),
                    Text(
                      'Mã giảm giá tự chạy, chạm để sao chép hoặc lưu vào tài khoản.',
                      style: TextStyle(
                          fontSize: 13, color: Colors.black54, height: 1.4),
                    ),
                  ],
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(
                        color: Colors.black.withValues(alpha: 0.08),
                        blurRadius: 8,
                        offset: const Offset(0, 3))
                  ],
                ),
                child: Text(
                  '${widget.coupons.length}',
                  style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: _brandColor),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (widget.error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(widget.error!,
                  style: const TextStyle(
                      color: Colors.redAccent, fontWeight: FontWeight.w600)),
            ),
          if (widget.isLoading)
            _buildLoadingCoupons()
          else if (widget.coupons.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 20),
              child: Text('Không có ưu đãi mới vào lúc này.',
                  style: TextStyle(fontSize: 14, color: Colors.black54)),
            )
          else
            _buildCouponList(),
        ],
      ),
    );
  }

  Widget _buildLoadingCoupons() {
    return SizedBox(
      height: 178,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        itemCount: 3,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, index) => Container(
          width: 238,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            boxShadow: [
              BoxShadow(
                  color: Colors.black.withValues(alpha: 0.03),
                  blurRadius: 12,
                  offset: const Offset(0, 6))
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCouponList() {
    return SizedBox(
      height: 168,
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
              ? 'Giảm $value%'
              : 'Giảm ${_formatPrice(value)} đ';
          final subtitle = minAmount != null
              ? 'Đơn từ ${_formatPrice(minAmount.toString())} đ'
              : 'Áp dụng mọi đơn hàng';

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
    return Container(
      width: 238,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Colors.white, _CouponSectionState._softOrange],
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: _CouponSectionState._borderColor),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 14,
              offset: const Offset(0, 8))
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color:
                      _CouponSectionState._brandColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.local_offer_outlined,
                    color: _CouponSectionState._brandColor, size: 21),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(valueText,
                        style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: _CouponSectionState._brandDark)),
                    const SizedBox(height: 3),
                    Text(
                      subtitle,
                      style:
                          const TextStyle(fontSize: 12, color: Colors.black54),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          GestureDetector(
            onTap: onCopy,
            child: Container(
              height: 34,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: _CouponSectionState._borderColor),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      code,
                      style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF333333)),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Icon(Icons.copy,
                      size: 16, color: _CouponSectionState._brandColor),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            height: 32,
            child: ElevatedButton.icon(
              onPressed: onSave,
              icon: const Icon(Icons.bookmark_add_outlined, size: 16),
              label: const Text('Lưu mã',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
              style: ElevatedButton.styleFrom(
                backgroundColor: _CouponSectionState._brandColor,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
                padding: EdgeInsets.zero,
                elevation: 0,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
