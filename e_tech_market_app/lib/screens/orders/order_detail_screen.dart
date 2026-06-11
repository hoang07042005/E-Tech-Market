import 'dart:io';
import 'package:intl/intl.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../../services/order_service.dart';
import '../../../utils/network_utils.dart';
import '../../../utils/translation.dart';

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

  Color _statusColor(String status) {
    final s = status.toLowerCase();
    if (s == 'pending') return Colors.orange;
    if (s == 'processing') return Colors.blue;
    if (s == 'paid') return Colors.blue;
    if (s == 'shipped') return Colors.indigo;
    if (s == 'delivered') return Colors.green;
    if (s == 'completed') return Colors.green;
    if (s == 'returned') return Colors.purple;
    if (s == 'cancelled') return Colors.red;
    return Colors.grey;
  }

  String _statusLabel(String status) {
    final s = status.toLowerCase();
    if (s == 'pending') return Trans.statusPending;
    if (s == 'processing') return Trans.statusProcessing;
    if (s == 'paid') return Trans.statusPreparing;
    if (s == 'shipped') return Trans.statusShipped;
    if (s == 'delivered') return Trans.statusDelivered;
    if (s == 'completed') return Trans.statusCompleted;
    if (s == 'returned') return Trans.statusReturned;
    if (s == 'cancelled') return Trans.statusCancelled;
    return status.isEmpty ? '—' : status;
  }

String _formatMoney(dynamic value) {
  final num number = num.tryParse(value.toString()) ?? 0;
  final formatter = NumberFormat('#,###', 'vi_VN');
  return formatter.format(number);
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
    return '${parsed.day}/${parsed.month}/${parsed.year} ${parsed.hour.toString().padLeft(2, '0')}:${parsed.minute.toString().padLeft(2, '0')}';
  }

  String _payLabel(String method) {
    final s = method.toLowerCase();
    if (s == 'cod') return Trans.paymentCOD;
    if (s == 'momo') return Trans.paymentMoMo;
    if (s == 'vnpay') return Trans.paymentVNPAY;
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
    await _performAction(() => OrderService.requestReturn(
      _order!['id'] as int,
      _returnContent,
      _returnMedia.map((f) => File(f.path)).toList(),
    ));
  }

  Future<void> _onConfirmRefundReceived() async {
    if (_order == null) return;
    await _performAction(() => OrderService.confirmRefundReceived(_order!['id'] as int));
  }
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final order = _order;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          order != null ? '#${order['order_code'] ?? order['id']}' : 'Chi tiết đơn hàng',
          style: TextStyle(color: colorScheme.onSurface, fontWeight: FontWeight.bold),
        ),
        backgroundColor: colorScheme.surface,
        foregroundColor: colorScheme.onSurface,
        elevation: 0,
      ),
      body: Container(
        color: colorScheme.surface,
        child: _loading
            ? Center(child: CircularProgressIndicator(color: colorScheme.primary))
            : _error != null
                ? Center(child: Text(_error!, style: TextStyle(color: colorScheme.error)))
                : order == null
                    ? Center(child: Text(Trans.orderNotFound, style: TextStyle(color: colorScheme.onSurface)))
                    : _buildContent(order),
      ),
    );
  }

  Widget _buildContent(Map<String, dynamic> order) {
    final status = (order['status'] ?? '').toString().toLowerCase();
    final statusColor = _statusColor(status);
    final statusLabel = _statusLabel(status);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Status Card
        _buildStatusCard(statusColor, statusLabel),
        const SizedBox(height: 16),
        
        // Products Card
        _buildProductsCard(order),
        const SizedBox(height: 16),
        
        // Shipping Info Card
        _buildShippingCard(order),
        const SizedBox(height: 16),
        
        // Payment Info Card
        _buildPaymentCard(order),
        const SizedBox(height: 16),
        
        // Price Summary Card
        _buildSummaryCard(order),
        const SizedBox(height: 16),
        
        // Actions
        if (_actionError != null) ...[
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.errorContainer,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              _actionError!,
              style: TextStyle(color: Theme.of(context).colorScheme.onErrorContainer),
            ),
          ),
          const SizedBox(height: 12),
        ],
        _buildActions(order),
        const SizedBox(height: 16),
        
        // Return Request
        if (order['return_request'] != null) ...[
          _buildReturnRequestCard(order['return_request']),
          const SizedBox(height: 16),
        ],
        
        // Status History
        if (order['status_history'] != null) ...[
          _buildHistoryCard(order['status_history']),
        ],
      ],
    );
  }

  Widget _buildStatusCard(Color statusColor, String statusLabel) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(5),
        border: Border.all(color: colorScheme.outline, width: 0.5),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(Icons.local_shipping_outlined, color: statusColor, size: 28),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Trạng thái đơn hàng',
                  style: TextStyle(
                    color: colorScheme.onSurface,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  statusLabel,
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProductsCard(Map<String, dynamic> order) {
    final colorScheme = Theme.of(context).colorScheme;
    final items = (order['items'] as List<dynamic>?) ?? [];
    
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(5),
        border: Border.all(color: colorScheme.outline, width: 0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.shopping_bag_outlined, color: colorScheme.primary, size: 22),
              const SizedBox(width: 8),
              Text(
                'Sản phẩm',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: colorScheme.onSurface,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: colorScheme.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${items.length} sản phẩm',
                  style: TextStyle(
                    color: colorScheme.primary,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ...items.map((item) => _buildProductItem(item)),
        ],
      ),
    );
  }

  Widget _buildProductItem(dynamic item) {
    final colorScheme = Theme.of(context).colorScheme;
    final product = item is Map<String, dynamic> ? item['product'] as Map<String, dynamic>? : null;
    final name = (product?['name'] ?? item['product_name_snapshot'] ?? 'Sản phẩm').toString();
    final imageUrl = _resolveOrderItemImageUrl(item);
    final quantity = item['quantity']?.toString() ?? '1';
    final total = _formatMoney(item['total_price'] ?? item['price'] ?? 0);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        // Thêm shadow nhẹ để item nổi bật và cao cấp hơn
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start, // Căn đỉnh để ảnh và chữ thẳng hàng phía trên
        children: [
          // 1. Hình ảnh sản phẩm
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: imageUrl.isNotEmpty
                ? Image.network(
                    imageUrl,
                    width: 72, // Tăng nhẹ kích thước ảnh cho rõ ràng hơn
                    height: 72,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => _buildImagePlaceholder(),
                  )
                : _buildImagePlaceholder(),
          ),
          const SizedBox(width: 12),

          // 2. Khu vực thông tin chi tiết (Chiếm trọn phần không gian còn lại)
          Expanded(
            child: SizedBox(
              height: 72, // Khóa chiều cao bằng với ảnh để dễ dàn trang dọc
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween, // Đẩy tên lên đỉnh, giá xuống đáy
                children: [
                  // Tên sản phẩm
                  Text(
                    name,
                    style: TextStyle(
                      fontWeight: FontWeight.w600, 
                      color: colorScheme.onSurface,
                      fontSize: 14,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  
                  // Hàng hiển thị Giá và Số lượng phía dưới
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Giá tiền (Đưa xuống dưới giúp hiển thị được số lớn mà không bị đè chữ)
                      Text(
                        '${total}đ',
                        style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFF26522), fontSize: 16),
                      ),
                      
                      // Số lượng bên góc phải đáy
                      Text(
                        'x$quantity', // Viết dạng 'x1' trông sẽ gọn gàng và chuẩn e-commerce hơn
                        style: TextStyle(
                          color: colorScheme.onSurface.withOpacity(0.6),
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildImagePlaceholder() {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      width: 64,
      height: 64,
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: colorScheme.outline, width: 0.5),
      ),
      child: Icon(Icons.image_not_supported, color: colorScheme.onSurface.withValues(alpha: 0.4)),
    );
  }

  Widget _buildShippingCard(Map<String, dynamic> order) {
    final colorScheme = Theme.of(context).colorScheme;
    final name = order['shipping_name']?.toString() ?? '—';
    final phone = order['shipping_phone']?.toString() ?? '—';
    final parts = [
      order['shipping_address_line'],
      order['shipping_ward'],
      order['shipping_district'],
      order['shipping_province'],
    ].where((e) => e != null && e.toString().trim().isNotEmpty).map((e) => e.toString().trim()).toList();
    final address = parts.isEmpty ? '—' : parts.join(', ');

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(5),
        border: Border.all(color: colorScheme.outline, width: 0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.location_on_outlined, color: colorScheme.primary, size: 22),
              const SizedBox(width: 8),
              Text(
                'Địa chỉ nhận hàng',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: colorScheme.onSurface,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildInfoRow('Người nhận', name, Icons.person_outline),
          const SizedBox(height: 8),
          _buildInfoRow('Số điện thoại', phone, Icons.phone_outlined),
          const SizedBox(height: 8),
          _buildInfoRow('Địa chỉ', address, Icons.home_outlined),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, IconData icon) {
    final colorScheme = Theme.of(context).colorScheme;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: colorScheme.onSurface),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  color: colorScheme.onSurface.withValues(alpha: 0.6),
                  fontSize: 12,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: TextStyle(
                  color: colorScheme.onSurface,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPaymentCard(Map<String, dynamic> order) {
    final colorScheme = Theme.of(context).colorScheme;
    final payment = order['payment'] as Map<String, dynamic>?;
    final method = payment?['method']?.toString() ?? '—';
    final status = payment?['status']?.toString() ?? '—';
    final transactionCode = payment?['transaction_code']?.toString() ?? '—';
    final paidAt = _formatDateTime(payment?['paid_at']?.toString());

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(5),
        border: Border.all(color: colorScheme.outline, width: 0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.payment_outlined, color: colorScheme.primary, size: 22),
              const SizedBox(width: 8),
              Text(
                'Thanh toán',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: colorScheme.onSurface,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildInfoRow('Phương thức', _payLabel(method), Icons.account_balance_wallet_outlined),
          const SizedBox(height: 8),
          _buildInfoRow('Trạng thái', status.isNotEmpty ? status : '—', Icons.check_circle_outline),
          const SizedBox(height: 8),
          _buildInfoRow('Mã giao dịch', transactionCode, Icons.receipt_long_outlined),
          const SizedBox(height: 8),
          _buildInfoRow('Thời gian thanh toán', paidAt, Icons.access_time),
        ],
      ),
    );
  }

  Widget _buildSummaryCard(Map<String, dynamic> order) {
    final colorScheme = Theme.of(context).colorScheme;
    final subtotal = _formatMoney(order['subtotal_amount']);
    final discount = _formatMoney(order['discount_amount']);
    final shipping = _formatMoney(order['shipping_fee']);
    final total = _formatMoney(order['total_amount']);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(5),
        border: Border.all(color: colorScheme.outline, width: 0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.receipt_long_outlined, color: colorScheme.primary, size: 22),
              const SizedBox(width: 8),
              Text(
                'Tổng kết đơn hàng',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: colorScheme.onSurface,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildPriceRow('Tổng tiền hàng', '${subtotal}đ'),
          const SizedBox(height: 8),
          _buildPriceRow('Giảm giá', '-${discount}đ', isDiscount: true),
          const SizedBox(height: 8),
          _buildPriceRow('Phí vận chuyển', '${shipping}đ'),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Divider(color: colorScheme.outlineVariant),
          ),
          _buildPriceRow('Tổng thanh toán', '${total}đ', isTotal: true),
        ],
      ),
    );
  }

  Widget _buildPriceRow(String label, String value, {bool isTotal = false, bool isDiscount = false}) {
    final colorScheme = Theme.of(context).colorScheme;
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            color: colorScheme.onSurface,
            fontSize: isTotal ? 16 : 14,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
            fontSize: isTotal ? 18 : 14,
            color: isTotal ? colorScheme.primary : (isDiscount ? Colors.green : colorScheme.onSurface),
          ),
        ),
      ],
    );
  }

  Widget _buildActions(Map<String, dynamic> order) {
    final colorScheme = Theme.of(context).colorScheme;
    final status = (order['status'] ?? '').toString().toLowerCase();
    final paymentMethod = (order['payment']?['method'] ?? '').toString().toLowerCase();
    final paymentStatus = (order['payment']?['status'] ?? '').toString().toLowerCase();
    final returnRequest = order['return_request'];
    final hasReturnRequest = returnRequest != null;
    final isRefundConfirmed = hasReturnRequest && returnRequest['customer_confirmed_at'] != null && returnRequest['customer_confirmed_at'].toString().isNotEmpty;
    final isCancelled = status == 'cancelled';
    final isCompleted = status == 'completed';

    if (isCancelled || isCompleted) return const SizedBox.shrink();

    return Column(
      children: [
        if (isCancelled) ...[
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: colorScheme.errorContainer,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Icon(Icons.cancel_outlined, color: colorScheme.onErrorContainer),
                const SizedBox(width: 8),
                Text(Trans.orderCancelled, style: TextStyle(color: colorScheme.onErrorContainer)),
              ],
            ),
          ),
        ],
        if (paymentMethod == 'cod' && paymentStatus != 'paid') ...[
          _buildActionButton('Xác nhận thanh toán', Colors.green, _onConfirmPayment),
          const SizedBox(height: 8),
        ],
        if (status == 'delivered') ...[
          _buildActionButton('Xác nhận đã nhận hàng', Colors.green, _onConfirmReceived),
          const SizedBox(height: 8),
        ],
        if (hasReturnRequest && status == 'returned' && !isRefundConfirmed) ...[
          _buildActionButton('Xác nhận đã hoàn tiền', Colors.green, _onConfirmRefundReceived),
          const SizedBox(height: 8),
        ],
        if (status == 'pending' || status == 'processing' || status == 'paid') ...[
          _buildActionButton('Hủy đơn hàng', colorScheme.error, _onCancelOrder, isDestructive: true),
        ],
      ],
    );
  }

  Widget _buildActionButton(String label, Color color, VoidCallback onPressed, {bool isDestructive = false}) {
    final colorScheme = Theme.of(context).colorScheme;
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: _actionBusy ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: isDestructive ? colorScheme.error : color,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
        child: _actionBusy
            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : Text(label, style: const TextStyle(fontWeight: FontWeight.bold)),
      ),
    );
  }

  String _resolveMediaUrl(dynamic m) {
    final url = (m is Map) ? (m['url'] ?? m['image_url'] ?? m['image'])?.toString() : null;
    return url != null ? NetworkUtils.fixDeviceUrl(url) : '';
  }

  Widget _buildReturnRequestCard(dynamic returnRequest) {
    final colorScheme = Theme.of(context).colorScheme;
    if (returnRequest == null) return const SizedBox.shrink();

    final status = returnRequest['status']?.toString() ?? 'pending';
    final content = returnRequest['content']?.toString() ?? '';
    final reason = returnRequest['reason']?.toString() ?? '';
    final displayContent = content.isNotEmpty ? content : reason;
    final adminNote = returnRequest['admin_note']?.toString() ?? '';

    final media = (returnRequest['media'] as List?) ?? [];
    final refundProof = (returnRequest['refund_proof'] as List?) ?? [];

    final Color chipColor = _statusColor(status);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(5),
        border: Border.all(color: colorScheme.outline, width: 0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(Icons.undo_outlined, color: colorScheme.primary, size: 22),
                  const SizedBox(width: 8),
                  Text(
                    Trans.returnRequest,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      color: colorScheme.onSurface,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: chipColor.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(999)),
                child: Text(_statusLabel(status), style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: chipColor)),
              ),
            ],
          ),
          const SizedBox(height: 16),
          
          if (displayContent.trim().isNotEmpty) ...[
            Text('Lý do / Nội dung:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: colorScheme.onSurface)),
            const SizedBox(height: 4),
            Text(displayContent, style: TextStyle(fontSize: 14, color: colorScheme.onSurface)),
            const SizedBox(height: 12),
          ],

          if (media.isNotEmpty) ...[
            Text(Trans.images, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: colorScheme.onSurface)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: media.take(8).map<Widget>((m) {
                final u = _resolveMediaUrl(m);
                if (u.isEmpty) return const SizedBox.shrink();
                return ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(u, width: 76, height: 76, fit: BoxFit.cover, errorBuilder: (c, e, s) {
                    return const SizedBox(width: 76, height: 76, child: Icon(Icons.broken_image_rounded, color: Colors.grey));
                  }),
                );
              }).toList(),
            ),
            const SizedBox(height: 12),
          ],

          if (adminNote.trim().isNotEmpty) ...[
            Text('Phản hồi từ Admin:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: colorScheme.onSurface)),
            const SizedBox(height: 4),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: colorScheme.surface,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: colorScheme.outline, width: 0.5),
              ),
              child: Text(
                adminNote,
                style: TextStyle(fontSize: 13, color: colorScheme.onSurface, fontStyle: FontStyle.italic),
              ),
            ),
            const SizedBox(height: 12),
          ],

          if (refundProof.isNotEmpty) ...[
            Text(Trans.refundProof, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: colorScheme.onSurface)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: refundProof.take(8).map<Widget>((m) {
                final u = _resolveMediaUrl(m);
                if (u.isEmpty) return const SizedBox.shrink();
                return ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(u, width: 76, height: 76, fit: BoxFit.cover, errorBuilder: (c, e, s) {
                    return const SizedBox(width: 76, height: 76, child: Icon(Icons.broken_image_rounded, color: Colors.grey));
                  }),
                );
              }).toList(),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildHistoryCard(dynamic history) {
    final colorScheme = Theme.of(context).colorScheme;
    if (history is! List || history.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(5),
        border: Border.all(color: colorScheme.outline, width: 0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.history, color: colorScheme.primary, size: 22),
              const SizedBox(width: 8),
              Text(
                'Lịch sử thay đổi',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: colorScheme.onSurface,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ...history.map<Widget>((entry) {
            final from = entry['from_status']?.toString() ?? '—';
            final to = entry['to_status']?.toString() ?? '—';
            final changedAt = _formatDateTime(entry['changed_at']?.toString());
            final note = entry['note']?.toString();
            final changedByName = entry['changed_by']?['name']?.toString() ?? 'Hệ thống';
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: colorScheme.surface,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '$from → $to',
                    style: TextStyle(fontWeight: FontWeight.bold, color: colorScheme.onSurface),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Thay đổi: $changedAt',
                    style: TextStyle(color: colorScheme.onSurface.withValues(alpha: 0.6), fontSize: 12),
                  ),
                  Text(
                    'Người thay đổi: $changedByName',
                    style: TextStyle(color: colorScheme.onSurface.withValues(alpha: 0.6), fontSize: 12),
                  ),
                  if (note != null && note.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(Trans.noteLabel(note), style: TextStyle(color: colorScheme.onSurface)),
                  ],
                ],
              ),
            );
          }).toList(),
        ],
      ),
    );
  }
}
