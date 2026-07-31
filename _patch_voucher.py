import re

with open('d:/E-Tech-Market/e_tech_market_app/lib/screens/account/voucher_warehouse/voucher_warehouse_screen.dart', 'r', encoding='utf-8') as f:
    content = f.read()

# We want to replace everything from `class _WarehouseVoucherPainter` to the end of the file.
# First, find where _WarehouseVoucherPainter starts.
painter_start = content.find('class _WarehouseVoucherPainter')

if painter_start != -1:
    content = content[:painter_start]

# We need to add the new painter and card.
new_classes = """class _WarehouseVoucherCard extends StatelessWidget {
  final String code;
  final String couponType;
  final double value;
  final String subtitle;
  final int? showRemaining;
  final int? showLimit;
  final VoidCallback onCopy;

  const _WarehouseVoucherCard({
    required this.code,
    required this.couponType,
    required this.value,
    required this.subtitle,
    this.showRemaining,
    this.showLimit,
    required this.onCopy,
  });

  @override
  Widget build(BuildContext context) {
    final leftWidth = 110.0;
    
    return CustomPaint(
      painter: _VoucherWarehousePainter(
        leftWidth: leftWidth,
      ),
      child: SizedBox(
        width: double.infinity,
        height: 145, // Set height to match coupon_section
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
                        couponType == 'percentage' ? '%' : 'K',
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
                                    : '${Trans.discountAmountValue2(value.toString())}',
                                style: const TextStyle(
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
                                style: const TextStyle(
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
                          const Icon(
                            Icons.timer_outlined,
                            size: 14,
                            color: Color(0xFFFF6B00),
                          ),
                          const SizedBox(width: 4),
                          const Text(
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
                                  valueColor: const AlwaysStoppedAnimation<Color>(
                                    Color(0xFFFF6B00),
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
                        height: 32,
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
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.black87,
                                  letterSpacing: 1.0,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const Text(
                              'Sao chép',
                              style: TextStyle(
                                fontSize: 11,
                                color: Color(0xFFFF6B00),
                                fontWeight: FontWeight.bold,
                              ),
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

class _VoucherWarehousePainter extends CustomPainter {
  final double leftWidth;

  _VoucherWarehousePainter({required this.leftWidth});

  @override
  void paint(Canvas canvas, Size size) {
    const double radius = 12.0;
    const double holeRadius = 6.0;
    const double bigHoleRadius = 14.0;

    final ticketPath = Path();
    ticketPath.moveTo(radius, 0);
    // Top edge and divider hole
    ticketPath.lineTo(leftWidth - holeRadius, 0);
    ticketPath.arcToPoint(Offset(leftWidth + holeRadius, 0), radius: const Radius.circular(holeRadius), clockwise: false);
    ticketPath.lineTo(size.width - radius, 0);
    // Top right corner
    ticketPath.arcToPoint(Offset(size.width, radius), radius: const Radius.circular(radius), clockwise: true);
    // Right edge and big hole
    ticketPath.lineTo(size.width, size.height * 0.5 - bigHoleRadius);
    ticketPath.arcToPoint(Offset(size.width, size.height * 0.5 + bigHoleRadius), radius: const Radius.circular(bigHoleRadius), clockwise: false);
    ticketPath.lineTo(size.width, size.height - radius);
    // Bottom right corner
    ticketPath.arcToPoint(Offset(size.width - radius, size.height), radius: const Radius.circular(radius), clockwise: true);
    // Bottom edge and divider hole
    ticketPath.lineTo(leftWidth + holeRadius, size.height);
    ticketPath.arcToPoint(Offset(leftWidth - holeRadius, size.height), radius: const Radius.circular(holeRadius), clockwise: false);
    ticketPath.lineTo(radius, size.height);
    // Bottom left corner
    ticketPath.arcToPoint(Offset(0, size.height - radius), radius: const Radius.circular(radius), clockwise: true);
    // Left edge and big hole
    ticketPath.lineTo(0, size.height * 0.5 + bigHoleRadius);
    ticketPath.arcToPoint(Offset(0, size.height * 0.5 - bigHoleRadius), radius: const Radius.circular(bigHoleRadius), clockwise: false); 
    ticketPath.lineTo(0, radius);
    // Top left corner
    ticketPath.arcToPoint(const Offset(radius, 0), radius: const Radius.circular(radius), clockwise: true);
    ticketPath.close();

    canvas.drawShadow(ticketPath, Colors.black.withOpacity(0.06), 8.0, false);

    // Left Path
    final lPath = Path();
    lPath.moveTo(radius, 0);
    lPath.lineTo(leftWidth - holeRadius, 0);
    lPath.arcToPoint(Offset(leftWidth, holeRadius), radius: const Radius.circular(holeRadius), clockwise: false);
    lPath.lineTo(leftWidth, size.height - holeRadius);
    lPath.arcToPoint(Offset(leftWidth - holeRadius, size.height), radius: const Radius.circular(holeRadius), clockwise: false);
    lPath.lineTo(radius, size.height);
    lPath.arcToPoint(Offset(0, size.height - radius), radius: const Radius.circular(radius), clockwise: true);
    lPath.lineTo(0, size.height * 0.5 + bigHoleRadius);
    lPath.arcToPoint(Offset(0, size.height * 0.5 - bigHoleRadius), radius: const Radius.circular(bigHoleRadius), clockwise: false);
    lPath.lineTo(0, radius);
    lPath.arcToPoint(const Offset(radius, 0), radius: const Radius.circular(radius), clockwise: true);
    lPath.close();

    final leftGradient = const LinearGradient(
      colors: [Color(0xFFFF8C4A), Color(0xFFFF5715)],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    ).createShader(Rect.fromLTWH(0, 0, leftWidth, size.height));
    
    canvas.drawPath(lPath, Paint()..shader = leftGradient);

    // Right Path
    final rPath = Path();
    rPath.moveTo(leftWidth, holeRadius);
    rPath.arcToPoint(Offset(leftWidth + holeRadius, 0), radius: const Radius.circular(holeRadius), clockwise: false);
    rPath.lineTo(size.width - radius, 0);
    rPath.arcToPoint(Offset(size.width, radius), radius: const Radius.circular(radius), clockwise: true);
    rPath.lineTo(size.width, size.height * 0.5 - holeRadius);
    rPath.arcToPoint(Offset(size.width, size.height * 0.5 + holeRadius), radius: const Radius.circular(holeRadius), clockwise: false);
    rPath.lineTo(size.width, size.height - radius);
    rPath.arcToPoint(Offset(size.width - radius, size.height), radius: const Radius.circular(radius), clockwise: true);
    rPath.lineTo(leftWidth + holeRadius, size.height);
    rPath.arcToPoint(Offset(leftWidth, size.height - holeRadius), radius: const Radius.circular(holeRadius), clockwise: false);
    rPath.lineTo(leftWidth, holeRadius);
    rPath.close();

    final rightGradient = const LinearGradient(
      colors: [Color(0xFFFFC1A5), Color(0xFFF9EAE4)],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    ).createShader(Rect.fromLTWH(leftWidth, 0, size.width - leftWidth, size.height));
    
    canvas.drawPath(rPath, Paint()..shader = rightGradient);

    // Draw dashed line
    const double dashWidth = 4, dashSpace = 4;
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
"""

content += new_classes

# Now we need to update the ListView.builder to use _WarehouseVoucherCard instead of the old Container.
listview_regex = r"itemBuilder:\s*\(context,\s*index\)\s*\{.*?return\s+Padding\(\s*padding:.*?child:\s*CustomPaint\(.*?;\s*\n\s*\},\s*\n\s*\),"

new_listview_item_builder = """itemBuilder: (context, index) {
                          final c = _vouchers[index] as Map<String, dynamic>;
                          final code = c['code']?.toString() ?? '-';
                          final couponType = c['coupon_type']?.toString() ?? 'fixed';
                          final value = double.tryParse(c['value']?.toString() ?? '0') ?? 0.0;
                          
                          // Tính lượt còn lại
                          final maxPerUser = c['max_uses_per_user'];
                          final userUsed = c['user_usage_count'] ?? 0;
                          final maxUses = c['max_uses'];
                          final usagesCount = c['usages_count'] ?? 0;

                          int? showRemaining;
                          int? showLimit;
                          if (maxPerUser != null && maxPerUser is num) {
                            showRemaining = (maxPerUser - (userUsed as num)).toInt();
                            showLimit = maxPerUser.toInt();
                          } else if (maxUses != null && maxUses is num) {
                            showRemaining = (maxUses - (usagesCount as num)).toInt();
                            showLimit = maxUses.toInt();
                          }

                          final subtitle = c['min_order_amount'] != null
                              ? Trans.minOrderRequiredValue(_formatVnd(c['min_order_amount']))
                              : Trans.allOrders;

                          return Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: _WarehouseVoucherCard(
                              code: code,
                              couponType: couponType,
                              value: value,
                              subtitle: subtitle,
                              showRemaining: showRemaining,
                              showLimit: showLimit,
                              onCopy: () async {
                                await Clipboard.setData(ClipboardData(text: code));
                                if (mounted) {
                                  AppSnackBar.showSuccess(context, Trans.copiedToClipboardMessage(code));
                                }
                              },
                            ),
                          );
                        },
                      ),"""

content = re.sub(listview_regex, new_listview_item_builder, content, flags=re.DOTALL)

# Add missing Scaffold background color fix since we changed to bright coupons
# Previously Scaffold had `backgroundColor: Theme.of(context).colorScheme.surface` (dark background).
# Let's keep it but since the coupons are bright, it should look fine.

with open('d:/E-Tech-Market/e_tech_market_app/lib/screens/account/voucher_warehouse/voucher_warehouse_screen.dart', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done patching.")
