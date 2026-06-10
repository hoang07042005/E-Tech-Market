import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../utils/network_utils.dart';
import '../../../utils/app_snackbar.dart';
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
    // simple thousands separator
    return str.replaceAllMapped(RegExp(r"\B(?=(\d{3})+(?!\d))"), (m) => '.') + 'đ';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Kho Voucher', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18) ),
        backgroundColor: Theme.of(context).colorScheme.surface,
        foregroundColor: Theme.of(context).colorScheme.onSurface,
        elevation: 0,
      ),
      body: Container(
        color: Theme.of(context).colorScheme.surface,
        padding: const EdgeInsets.all(16),
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
                : _vouchers.isEmpty
                    ? Center(
                        child: Container(
                          padding: const EdgeInsets.all(24),
                          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
                          child: const Text('Hiện bạn chưa có mã giảm giá nào.'),
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadVouchers,
                        child: ListView.builder(
                          itemCount: _vouchers.length,
                          itemBuilder: (context, index) {
                            final c = _vouchers[index] as Map<String, dynamic>;
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: Container(
                                decoration: BoxDecoration(color: Theme.of(context).colorScheme.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: Theme.of(context).colorScheme.outline, width: 0.5)),
                                padding: const EdgeInsets.all(12),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(c['code']?.toString() ?? '-', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                                        ),
                                        if (c['coupon_type'] == 'percentage')
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                                            decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(8)),
                                            child: Text('Giảm ${c['value']}%', style: const TextStyle(color: Colors.orange)),
                                          )
                                        else
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                                            decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(8)),
                                            child: Text('Giảm ${_formatVnd(c['value'])}', style: const TextStyle(color: Colors.orange)),
                                          )
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    if (c['min_order_amount'] != null)
                                      Text('Đơn tối thiểu: ${_formatVnd(c['min_order_amount'])}', style: const TextStyle(color: Colors.grey)),
                                    if (c['end_at'] != null)
                                      Padding(
                                        padding: const EdgeInsets.only(top: 8.0),
                                        child: Text('HSD: ${c['end_at']?.toString().split('T').first}', style: const TextStyle(color: Colors.red)),
                                      ),
                                    const SizedBox(height: 8),
                                    Row(
                                      children: [
                                        Expanded(
                                          child: OutlinedButton(
                                            onPressed: () async {
                                              final code = c['code']?.toString() ?? '';
                                              await Clipboard.setData(ClipboardData(text: code));
                                              AppSnackBar.showSuccess(context, 'Đã sao chép mã $code vào bộ nhớ tạm.');
                                            },
                                            child: const Text('Sao chép mã'),
                                          ),
                                        ),
                                      ],
                                    )
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),
      ),
    );
  }
}
