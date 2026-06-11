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
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        title: Text(Trans.voucherWarehouse, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: Theme.of(context).colorScheme.surface,
        foregroundColor: Theme.of(context).colorScheme.onSurface,
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
              : _vouchers.isEmpty
                  ? Center(
                      child: Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
                        child: Text(Trans.noCouponYet),
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _loadVouchers,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _vouchers.length,
                        itemBuilder: (context, index) {
                          final c = _vouchers[index] as Map<String, dynamic>;
                          final isPercentage = c['coupon_type'] == 'percentage';
                          final displayValue = isPercentage 
                              ? '-${(num.tryParse(c['value']?.toString() ?? '0') ?? 0).toInt()}%'
                              : '-${_formatVnd(c['value'])}';

                          return Container(
                            margin: const EdgeInsets.only(bottom: 14),
                            height: 105, // Cố định chiều cao để các phần tử cân đối theo hàng ngang
                            decoration: BoxDecoration(
                              color: Theme.of(context).colorScheme.surface,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Theme.of(context).colorScheme.onSurface, width: 0.5),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.04),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Row(
                              children: [
                                // 1. Khối hiển thị số tiền/phần trăm giảm giá (Bên trái)
                                Container(
                                  width: 95,
                                  height: double.infinity,
                                  decoration: BoxDecoration(
                                    color: Colors.orange.shade50,
                                    borderRadius: const BorderRadius.only(
                                      topLeft: Radius.circular(12),
                                      bottomLeft: Radius.circular(12),
                                    ),
                                  ),
                                  alignment: Alignment.center,
                                  padding: const EdgeInsets.symmetric(horizontal: 8),
                                  child: Text(
                                    displayValue,
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(
                                      color: Colors.orange,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 18,
                                    ),
                                  ),
                                ),

                                // Đường cắt giữa (Phần phân cách giả lập vé xé)
                                VerticalDivider(
                                  width: 1,
                                  thickness: 1,
                                  color: Colors.grey.shade200,
                                ),

                                // 2. Khối thông tin Voucher (Ở giữa)
                                Expanded(
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Text(
                                          c['code']?.toString() ?? '-',
                                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        const SizedBox(height: 4),
                                        if (c['min_order_amount'] != null)
                                          Text(
                                            Trans.minOrderRequiredValue(_formatVnd(c['min_order_amount'])),
                                            style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontSize: 12),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        const SizedBox(height: 4),
                                        if (c['end_at'] != null)
                                          Text(
                                            'HSD: ${c['end_at']?.toString().split('T').first ?? ''}',
                                            style: const TextStyle(color: Colors.redAccent, fontSize: 11, fontWeight: FontWeight.w500),
                                          ),
                                      ],
                                    ),
                                  ),
                                ),

                                // 3. Nút Sao chép mã (Bên phải)
                                Padding(
                                  padding: const EdgeInsets.only(right: 12),
                                  child: ElevatedButton(
                                    onPressed: () async {
                                      final code = c['code']?.toString() ?? '';
                                      await Clipboard.setData(ClipboardData(text: code));
                                      AppSnackBar.showSuccess(context, Trans.copiedToClipboardMessage(code));
                                    },
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.orange,
                                      foregroundColor: Colors.white,
                                      elevation: 0,
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                      minimumSize: Size.zero,
                                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(20),
                                      ),
                                    ),
                                    child: const Text(
                                      'Sao chép', // Bạn có thể thay bằng Trans.copyCode nếu text ngắn gọn vừa nút
                                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}