import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../../services/order_service.dart';
import '../../../utils/network_utils.dart';

class OrderDetailScreen extends StatefulWidget {
  final int orderId;

  const OrderDetailScreen({super.key, required this.orderId});

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _order;
  bool _actionBusy = false;
  String? _actionError;
  String _returnContent = '';
  final List<XFile> _returnMedia = [];

  @override
  void initState() {
    super.initState();
    _loadOrder();
  }

  Future<void> _loadOrder() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final result = await OrderService.fetchOrderDetail(widget.orderId);
      setState(() {
        _order = result;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Map<String, dynamic> _statusMeta(String status) {
    final s = status.toLowerCase();
    if (s == 'pending') return {'label': 'Chờ xác nhận', 'color': Colors.orange};
    if (s == 'processing') return {'label': 'Đã xác nhận', 'color': Colors.blue};
    if (s == 'paid') return {'label': 'Đang chuẩn bị', 'color': Colors.blue};
    if (s == 'shipped') return {'label': 'Đang giao', 'color': Colors.blue};
    if (s == 'delivered') return {'label': 'Đã giao', 'color': Colors.green};
    if (s == 'completed') return {'label': 'Hoàn thành', 'color': Colors.green};
    if (s == 'returned') return {'label': 'Hoàn trả', 'color': Colors.purple};
    if (s == 'cancelled') return {'label': 'Đã hủy', 'color': Colors.red};
    return {'label': status.isEmpty ? '—' : status, 'color': Colors.grey};
  }

  String _formatMoney(dynamic amount) {
    final value = amount is num
        ? amount.toDouble()
        : double.tryParse(amount?.toString() ?? '') ?? 0.0;
    return value.toStringAsFixed(0).replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (match) => '.');
  }

  String _resolveOrderItemImageUrl(dynamic item) {
    final product = item is Map<String, dynamic> ? item['product'] as Map<String, dynamic>? : null;
    final candidates = <String?>[
      product?['main_image_url']?.toString(),
      product?['image_url']?.toString(),
      item['image_url']?.toString(),
      item['product_main_image_url']?.toString(),
      item['product_image_url']?.toString(),
    ];
    for (final url in candidates) {
      if (url != null && url.trim().isNotEmpty) {
        return NetworkUtils.fixDeviceUrl(url);
      }
    }
    return '';
  }

  String _formatDateTime(String? iso) {
    if (iso == null || iso.isEmpty) return '—';
    final parsed = DateTime.tryParse(iso);
    if (parsed == null) return '—';
    final day = parsed.day;
    final month = parsed.month;
    final year = parsed.year;
    final hour = parsed.hour.toString().padLeft(2, '0');
    final minute = parsed.minute.toString().padLeft(2, '0');
    return '$day/$month/$year $hour:$minute';
  }

  String _payLabel(String method) {
    final s = method.toLowerCase();
    if (s == 'cod') return 'Thanh toán khi nhận hàng (COD)';
    if (s == 'momo') return 'Ví MoMo';
    if (s == 'vnpay') return 'VNPAY';
    return method.isEmpty ? '—' : method;
  }

  Future<void> _pickReturnMedia() async {
    final picker = ImagePicker();
    final images = await picker.pickMultiImage(imageQuality: 80);
    if (images.isNotEmpty) {
      setState(() {
        _returnMedia.addAll(images);
      });
    }
  }

  Future<void> _performAction(Future<Map<String, dynamic>> Function() action) async {
    setState(() {
      _actionBusy = true;
      _actionError = null;
    });
    try {
      final updated = await action();
      setState(() {
        _order = updated;
      });
    } catch (e) {
      setState(() {
        _actionError = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _actionBusy = false;
        });
      }
    }
  }

  Future<void> _onCancelOrder() async {
    if (_order == null) return;
    await _performAction(() => OrderService.cancelOrder(_order!['id'] as int));
  }

  Future<void> _onConfirmPayment() async {
    if (_order == null) return;
    await _performAction(() => OrderService.confirmPayment(_order!['id'] as int));
  }

  Future<void> _onConfirmReceived() async {
    if (_order == null) return;
    await _performAction(() => OrderService.confirmReceived(_order!['id'] as int));
  }

  Future<void> _onSubmitReturnRequest() async {
    if (_order == null) return;
    if (_returnContent.trim().length < 5) {
      setState(() {
        _actionError = 'Nội dung yêu cầu phải có ít nhất 5 ký tự.';
      });
      return;
    }
    final files = _returnMedia.map((xfile) => File(xfile.path)).toList();
    await _performAction(() => OrderService.requestReturn(_order!['id'] as int, _returnContent.trim(), files));
    if (_actionError == null) {
      setState(() {
        _returnContent = '';
        _returnMedia.clear();
      });
    }
  }

  Future<void> _onConfirmRefundReceived() async {
    if (_order == null) return;
    await _performAction(() => OrderService.confirmRefundReceived(_order!['id'] as int));
  }

  Widget _buildSection({required String title, required Widget child}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Chi tiết đơn hàng'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: Container(
        color: const Color(0xFFFAF1EB),
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
                : _order == null
                    ? const Center(child: Text('Không tìm thấy đơn hàng.'))
                    : ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          _buildOrderHeader(),
                          _buildSection(title: 'Trạng thái đơn hàng', child: _buildStatusInfo()),
                          _buildSection(title: 'Danh sách sản phẩm', child: _buildItems()),
                          _buildSection(title: 'Địa chỉ nhận hàng', child: _buildShippingInfo()),
                          _buildSection(title: 'Thanh toán', child: _buildPaymentInfo()),
                          _buildSection(title: 'Tổng kết đơn hàng', child: _buildSummary()),
                          if (_actionError != null) ...[
                            Text(_actionError!, style: const TextStyle(color: Colors.red)),
                            const SizedBox(height: 12),
                          ],
                          _buildActions(),
                          if (_order!['return_request'] != null) ...[
                            const SizedBox(height: 16),
                            _buildSection(title: 'Yêu cầu hoàn trả', child: _buildReturnRequest()),
                          ],
                          if (_order!['status_history'] != null) ...[
                            const SizedBox(height: 16),
                            _buildSection(title: 'Lịch sử trạng thái', child: _buildStatusHistory()),
                          ],
                        ],
                      ),
      ),
    );
  }

  Widget _buildOrderHeader() {
    final orderCode = _order!['order_code']?.toString() ?? '#${_order!['id']}';
    final createdAt = _formatDateTime(_order!['created_at']?.toString());
    final status = (_order!['status'] ?? '').toString().toLowerCase();
    final meta = _statusMeta(status);

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Đơn hàng #$orderCode', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text('Ngày đặt: $createdAt', style: const TextStyle(color: Colors.grey)),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Color.fromRGBO(
                ((meta['color'] as Color).r).round(),
                ((meta['color'] as Color).g).round(),
                ((meta['color'] as Color).b).round(),
                0.14,
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Text(meta['label'] as String, style: TextStyle(color: meta['color'] as Color, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusInfo() {
    final status = (_order!['status'] ?? '').toString().toLowerCase();
    final meta = _statusMeta(status);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Trạng thái hiện tại: ${meta['label']}', style: const TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 10),
        const Text('Mã đơn hàng và chi tiết trạng thái được cập nhật tự động.'),
      ],
    );
  }

  Widget _buildItems() {
    final items = (_order!['items'] as List<dynamic>?) ?? [];
    if (items.isEmpty) {
      return const Text('Không có sản phẩm trong đơn hàng.');
    }
    return Column(
      children: items.map((item) {
        final product = item['product'] as Map<String, dynamic>?;
        final name = (product?['name'] ?? item['product_name_snapshot'] ?? 'Sản phẩm không xác định').toString();
        final imageUrl = _resolveOrderItemImageUrl(item);
        final quantity = item['quantity']?.toString() ?? '0';
        final total = _formatMoney(item['total_price']);
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          child: Row(
            children: [
              if (imageUrl.isNotEmpty)
                ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Image.network(imageUrl, width: 72, height: 72, fit: BoxFit.cover, errorBuilder: (_, __, ___) => Container(color: Colors.grey.shade200, width: 72, height: 72)),
                )
              else
                Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(color: Colors.grey.shade200, borderRadius: BorderRadius.circular(16)),
                  child: const Icon(Icons.image_not_supported, color: Colors.grey),
                ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name, style: const TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 6),
                    Text('Số lượng: $quantity', style: const TextStyle(color: Colors.grey)),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text('$totalđ', style: const TextStyle(fontWeight: FontWeight.bold)),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildShippingInfo() {
    final name = _order!['shipping_name']?.toString() ?? '—';
    final phone = _order!['shipping_phone']?.toString() ?? '—';
    final parts = [
      _order!['shipping_address_line'],
      _order!['shipping_ward'],
      _order!['shipping_district'],
      _order!['shipping_province'],
    ].where((element) => element != null && element.toString().trim().isNotEmpty).map((e) => e.toString().trim()).toList();
    final address = parts.isEmpty ? '—' : parts.join(', ');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Người nhận: $name', style: const TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Text('Số điện thoại: $phone'),
        const SizedBox(height: 8),
        Text('Địa chỉ: $address'),
      ],
    );
  }

  Widget _buildPaymentInfo() {
    final payment = _order!['payment'] as Map<String, dynamic>?;
    final method = payment?['method']?.toString() ?? '—';
    final status = payment?['status']?.toString() ?? '—';
    final transactionCode = payment?['transaction_code']?.toString() ?? '—';
    final paidAt = _formatDateTime(payment?['paid_at']?.toString());
    final currency = _order!['currency']?.toString() ?? 'VND';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Phương thức: ${_payLabel(method)}', style: const TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Text('Trạng thái thanh toán: ${status.isNotEmpty ? status : '—'}'),
        const SizedBox(height: 8),
        Text('Mã giao dịch: $transactionCode'),
        const SizedBox(height: 8),
        Text('Thời gian thanh toán: $paidAt'),
        const SizedBox(height: 8),
        Text('Tiền tệ: $currency'),
      ],
    );
  }

  Widget _buildSummary() {
    final subtotal = _formatMoney(_order!['subtotal_amount']);
    final discount = _formatMoney(_order!['discount_amount']);
    final shipping = _formatMoney(_order!['shipping_fee']);
    final total = _formatMoney(_order!['total_amount']);
    return Column(
      children: [
        _buildSummaryRow('Tổng tiền hàng', '${subtotal}đ'),
        _buildSummaryRow('Giảm giá', '${discount}đ'),
        _buildSummaryRow('Phí vận chuyển', '${shipping}đ'),
        const Divider(height: 24, color: Colors.black12),
        _buildSummaryRow('Tổng thanh toán', '${total}đ', bold: true),
      ],
    );
  }

  Widget _buildSummaryRow(String label, String value, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: 14, color: Colors.grey.shade700)),
          Text(value, style: TextStyle(fontWeight: bold ? FontWeight.bold : FontWeight.normal)),
        ],
      ),
    );
  }

  Widget _buildActions() {
    if (_order == null) return const SizedBox.shrink();
    final status = (_order!['status'] ?? '').toString().toLowerCase();
    final paymentMethod = (_order!['payment']?['method'] ?? '').toString().toLowerCase();
    final paymentStatus = (_order!['payment']?['status'] ?? '').toString().toLowerCase();
    final hasReturnRequest = _order!['return_request'] != null;
    final isCod = paymentMethod == 'cod';
    final showCancel = status == 'pending' || status == 'processing' || status == 'paid';
    final showConfirmPayment = isCod && paymentStatus != 'paid';
    final showConfirmReceived = status == 'delivered' && !hasReturnRequest;
    final showRequestReturn = status == 'delivered' && !hasReturnRequest;
    final showRefundConfirm = _order!['return_request'] != null && (_order!['return_request']['status']?.toString().toLowerCase() ?? '') == 'refunded';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_actionBusy) const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: LinearProgressIndicator()),
        if (showCancel)
          _buildActionButton('Hủy đơn hàng', Colors.red.shade600, _onCancelOrder),
        if (showConfirmPayment)
          _buildActionButton('Xác nhận đã thanh toán', Colors.orange.shade700, _onConfirmPayment),
        if (showConfirmReceived)
          _buildActionButton('Xác nhận đã nhận hàng', Colors.green.shade700, _onConfirmReceived),
        if (showRequestReturn)
          _buildActionButton('Yêu cầu hoàn trả', Colors.purple.shade700, () => _showReturnRequestDialog()),
        if (showRefundConfirm)
          _buildActionButton('Xác nhận đã nhận tiền hoàn', Colors.blue.shade700, _onConfirmRefundReceived),
      ],
    );
  }

  Widget _buildActionButton(String label, Color color, VoidCallback onPressed) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          padding: const EdgeInsets.symmetric(vertical: 14),
        ),
        onPressed: _actionBusy ? null : onPressed,
        child: Text(label, style: const TextStyle(fontWeight: FontWeight.bold)),
      ),
    );
  }

  Widget _buildReturnRequest() {
    final request = _order!['return_request'] as Map<String, dynamic>?;
    if (request == null) {
      return const Text('Chưa có yêu cầu hoàn trả.');
    }
    final status = request['status']?.toString() ?? '—';
    final content = request['content']?.toString() ?? '—';
    final adminNote = request['admin_note']?.toString();
    final media = (request['media'] as List<dynamic>?) ?? [];
    final refundProof = (request['refund_proof'] as List<dynamic>?) ?? [];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Trạng thái: ${status.isEmpty ? '—' : status}', style: const TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Text('Nội dung: $content'),
        if (adminNote != null && adminNote.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text('Phản hồi admin: $adminNote'),
        ],
        if (media.isNotEmpty) ...[
          const SizedBox(height: 8),
          const Text('Hình ảnh/Video:', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: media.map((entry) {
              final url = entry is Map<String, dynamic> ? entry['url']?.toString() ?? '' : entry.toString();
              if (url.isEmpty) return const SizedBox.shrink();
              return ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Image.network(NetworkUtils.fixDeviceUrl(url), width: 80, height: 80, fit: BoxFit.cover, errorBuilder: (_, __, ___) => Container(color: Colors.grey.shade200, width: 80, height: 80)),
              );
            }).toList(),
          ),
        ],
        if (refundProof.isNotEmpty) ...[
          const SizedBox(height: 8),
          const Text('Chứng từ hoàn tiền:', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: refundProof.map((entry) {
              final url = entry is Map<String, dynamic> ? entry['url']?.toString() ?? '' : entry.toString();
              if (url.isEmpty) return const SizedBox.shrink();
              return ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Image.network(NetworkUtils.fixDeviceUrl(url), width: 80, height: 80, fit: BoxFit.cover, errorBuilder: (_, __, ___) => Container(color: Colors.grey.shade200, width: 80, height: 80)),
              );
            }).toList(),
          ),
        ],
      ],
    );
  }

  Widget _buildStatusHistory() {
    final history = (_order!['status_history'] as List<dynamic>?) ?? [];
    if (history.isEmpty) return const Text('Chưa có lịch sử thay đổi trạng thái.');

    return Column(
      children: history.map((entry) {
        final from = entry['from_status']?.toString() ?? '—';
        final to = entry['to_status']?.toString() ?? '—';
        final changedAt = _formatDateTime(entry['changed_at']?.toString());
        final note = entry['note']?.toString();
        final changedByName = entry['changed_by']?['name']?.toString() ?? 'Hệ thống';
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.grey.shade50,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('$from → $to', style: const TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text('Thay đổi: $changedAt', style: const TextStyle(color: Colors.grey)),
              Text('Người thay đổi: $changedByName', style: const TextStyle(color: Colors.grey)),
              if (note != null && note.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text('Ghi chú: $note'),
              ],
            ],
          ),
        );
      }).toList(),
    );
  }

  void _showReturnRequestDialog() {
    showDialog<void>(
      context: context,
      builder: (context) {
        return StatefulBuilder(builder: (context, setStateDialog) {
          return AlertDialog(
            title: const Text('Yêu cầu hoàn trả'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextField(
                    maxLines: 4,
                    decoration: const InputDecoration(hintText: 'Mô tả lý do hoàn trả'),
                    onChanged: (value) => setStateDialog(() {
                      _returnContent = value;
                    }),
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton.icon(
                    onPressed: () async {
                      await _pickReturnMedia();
                      setStateDialog(() {});
                    },
                    icon: const Icon(Icons.photo_library),
                    label: const Text('Chọn ảnh'),
                  ),
                  if (_returnMedia.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _returnMedia.map((file) {
                        return Stack(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(16),
                              child: Image.file(File(file.path), width: 80, height: 80, fit: BoxFit.cover),
                            ),
                            Positioned(
                              top: 4,
                              right: 4,
                              child: GestureDetector(
                                onTap: () {
                                  setStateDialog(() {
                                    _returnMedia.remove(file);
                                  });
                                },
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: Colors.black54,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  padding: const EdgeInsets.all(4),
                                  child: const Icon(Icons.close, size: 16, color: Colors.white),
                                ),
                              ),
                            ),
                          ],
                        );
                      }).toList(),
                    ),
                  ],
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.of(context).pop();
                },
                child: const Text('Huỷ'),
              ),
              ElevatedButton(
                onPressed: () async {
                  Navigator.of(context).pop();
                  await _onSubmitReturnRequest();
                },
                child: const Text('Gửi yêu cầu'),
              ),
            ],
          );
        });
      },
    );
  }
}