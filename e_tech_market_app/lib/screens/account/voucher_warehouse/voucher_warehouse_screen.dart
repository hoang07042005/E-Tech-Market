import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../utils/network_utils.dart';
import '../../../utils/app_snackbar.dart';
import '../../../utils/translation.dart';
import '../../../services/voucher_service.dart';

class VoucherWarehouseScreen extends StatefulWidget {
  const VoucherWarehouseScreen({Key? key}) : super(key: key);

  @override
  State<VoucherWarehouseScreen> createState() => _VoucherWarehouseScreenState();
}

class _VoucherWarehouseScreenState extends State<VoucherWarehouseScreen> {
  bool _loading = true;
  String? _error;
  List<dynamic> _vouchers = [];

  @override
  void initState() {
    super.initState();
    _loadVouchers();
  }

  Future<void> _loadVouchers() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await VoucherService.fetchMyCoupons();
      setState(() {
        _vouchers = res is List ? res : [];
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _formatVnd(dynamic n) {
    final val = n is num ? n.toDouble() : double.tryParse(n?.toString() ?? '') ?? 0.0;
    final str = val.round().toString();
    return str.replaceAllMapped(RegExp(r"\B(?=(\d{3})+(?!\d))"), (m) => '.') + 'đ';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface, // Nền tối huyền ảo sang trọng đồng bộ với Card voucher trong ảnh mẫu
      appBar: AppBar(
        title: Text(Trans.voucherWarehouse, style:  TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Theme.of(context).colorScheme.onSurface)),
        backgroundColor: Theme.of(context).colorScheme.surface,
        foregroundColor: Theme.of(context).colorScheme.onSurface,
        elevation: 0,
        iconTheme:  IconThemeData(color: Theme.of(context).colorScheme.onSurface),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: const Color(0xFFF26522)))
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
              : _vouchers.isEmpty
                  ? Center(
                      child: Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(color: const Color(0xFF1F2937), borderRadius: BorderRadius.circular(16)),
                        child: Text(Trans.noCouponYet, style: const TextStyle(color: Colors.white70)),
                      ),
                    )
                  : RefreshIndicator(
                      color: const Color(0xFFEF7A45),
                      onRefresh: _loadVouchers,
                      child: ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        itemCount: _vouchers.length,
                        itemBuilder: (context, index) {
                          final c = _vouchers[index] as Map<String, dynamic>;
                          final code = c['code']?.toString() ?? '-';
                          final isPercentage = c['coupon_type'] == 'percentage';
                          final displayValue = isPercentage 
                              ? 'Giảm ${(num.tryParse(c['value']?.toString() ?? '0') ?? 0).toInt()}%'
                              : 'Giảm ${_formatVnd(c['value'])}';

                          final subtitle = c['min_order_amount'] != null
                              ? Trans.minOrderRequiredValue(_formatVnd(c['min_order_amount']))
                              : Trans.allOrders;

                          return Padding(
                            padding: const EdgeInsets.only(bottom: 14),
                            child: CustomPaint(
                              painter: _WarehouseVoucherPainter(
                                backgroundColor: Theme.of(context).colorScheme.surface,
                                borderColor: Theme.of(context).colorScheme.onSurface,
                              ),
                              child: Container(
                                width: double.infinity,
                                height: 140, // Đồng bộ chiều cao chuẩn với thiết kế coupon_section
                                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    // Phần trên: Icon + Thông tin khuyến mãi chính
                                    Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.all(8),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFFFEFE7),
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          child: const Icon(
                                            Icons.local_offer_rounded,
                                            size: 24,
                                            color: Color(0xFFEF7A45),
                                          ),
                                        ),
                                        const SizedBox(width: 14),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                displayValue,
                                                style:  TextStyle(
                                                  fontSize: 18,
                                                  fontWeight: FontWeight.w800,
                                                  color: Theme.of(context).colorScheme.onSurface,
                                                  height: 1.2,
                                                ),
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                              const SizedBox(height: 4),
                                              Text(
                                                subtitle,
                                                style:  TextStyle(
                                                  fontSize: 12,
                                                  color: Theme.of(context).colorScheme.onSurface,
                                                ),
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                    const Spacer(),
                                    // Đường phân cách nét đứt chấm chấm tinh tế ở giữa thân voucher
                                    Row(
                                      children: List.generate(
                                        30,
                                        (index) => Expanded(
                                          child: Container(
                                            color: index % 2 == 0 ? Colors.transparent : const Color(0xFF4B5563),
                                            height: 1,
                                          ),
                                        ),
                                      ),
                                    ),
                                    const Spacer(),
                                    // Phần dưới: Hiển thị Code ẩn và Nút Sao chép (Đã bỏ nút Lưu)
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          code,
                                          style:  TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.bold,
                                            color: Theme.of(context).colorScheme.onSurface,
                                            letterSpacing: 0.5,
                                          ),
                                        ),
                                        InkWell(
                                          onTap: () async {
                                            await Clipboard.setData(ClipboardData(text: code));
                                            if (mounted) {
                                              AppSnackBar.showSuccess(context, Trans.copiedToClipboardMessage(code));
                                            }
                                          },
                                          borderRadius: BorderRadius.circular(6),
                                          child: Padding(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                            child: Row(
                                              children: const [
                                                Text(
                                                  'Sao chép',
                                                  style: TextStyle(
                                                    fontSize: 11,
                                                    color: Color(0xFFEF7A45),
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                ),
                                                SizedBox(width: 4),
                                                Icon(
                                                  Icons.copy_rounded,
                                                  size: 13,
                                                  color: Color(0xFFEF7A45),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}

/// Custom Painter vẽ hình dáng voucher có khoét lỗ hai bên hông và bo góc mịn màng
class _WarehouseVoucherPainter extends CustomPainter {
  final Color backgroundColor;
  final Color borderColor;

  _WarehouseVoucherPainter({required this.backgroundColor, required this.borderColor});

  @override
  void paint(Canvas canvas, Size size) {
    final path = Path();
    const double radius = 12.0;
    
    // Điểm khoét lỗ nằm ở mức 52% chiều cao của thẻ để cân đối với đường phân cách đứt đoạn
    double cutoutY = size.height * 0.52;
    const double cutoutRadius = 6.0;

    path.moveTo(0, radius);
    
    // Khoét cạnh trái (Left Cutout)
    path.lineTo(0, cutoutY - cutoutRadius);
    path.arcToPoint(
      Offset(0, cutoutY + cutoutRadius),
      radius: const Radius.circular(cutoutRadius),
      clockwise: true,
    );
    path.lineTo(0, size.height - radius);
    path.arcToPoint(Offset(radius, size.height), radius: const Radius.circular(radius), clockwise: false);

    path.lineTo(size.width - radius, size.height);
    path.arcToPoint(Offset(size.width, size.height - radius), radius: const Radius.circular(radius), clockwise: false);

    // Khoét cạnh phải (Right Cutout)
    path.lineTo(size.width, cutoutY + cutoutRadius);
    path.arcToPoint(
      Offset(size.width, cutoutY - cutoutRadius),
      radius: const Radius.circular(cutoutRadius),
      clockwise: true,
    );
    path.lineTo(size.width, radius);
    path.arcToPoint(Offset(size.width - radius, 0), radius: const Radius.circular(radius), clockwise: false);
    
    path.lineTo(radius, 0);
    path.arcToPoint(const Offset(0, radius), radius: const Radius.circular(radius), clockwise: false);
    
    path.close();

    // Đổ bóng mờ nhẹ tạo chiều sâu cho vé
    canvas.drawShadow(path, Colors.black.withOpacity(0.1), 5.0, false);

    // Vẽ màu nền đổ đầy tấm vé
    final bgPaint = Paint()
      ..color = backgroundColor
      ..style = PaintingStyle.fill;
    canvas.drawPath(path, bgPaint);

    // Vẽ đường viền outline bo sát theo hình dáng cấu trúc vé
    final borderPaint = Paint()
      ..color = borderColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.8;
    canvas.drawPath(path, borderPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}