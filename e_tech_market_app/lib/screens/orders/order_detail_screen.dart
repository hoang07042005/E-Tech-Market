import 'dart:io';
import 'package:intl/intl.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../../services/auth_service.dart';
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
  Map<String, dynamic>? _currentUser;
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
      // Load order and current user in parallel
      final results = await Future.wait([
        OrderService.fetchOrderDetail(widget.orderId),
        AuthService.getCurrentUser(),
      ]);
      setState(() {
        _order = results[0] as Map<String, dynamic>?;
        _currentUser = results[1] as Map<String, dynamic>?;
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
    final variant = item is Map<String, dynamic> ? item['variant'] as Map<String, dynamic>? : null;
    final candidates = <String?>[
      variant?['image_url']?.toString(),
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
        _buildStatusCard(statusColor, statusLabel, order),
        const SizedBox(height: 16),

        // Shipping Info Card
        _buildShippingCard(order),
        const SizedBox(height: 16),
        
        // Products Card
        _buildProductsCard(order),
        const SizedBox(height: 16),
        
        // Payment Info Card (includes amounts & payment details)
        _buildPaymentCard(order),
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

  Widget _buildStatusCard(Color statusColor, String statusLabel, Map<String, dynamic> order) {
    final colorScheme = Theme.of(context).colorScheme;
    final status = (order['status'] ?? '').toString().toLowerCase();

    // Calculate step from status value (like TypeScript)
    int currentStep = 1;
    if (status == 'processing') currentStep = 2;
    else if (status == 'paid') currentStep = 3;
    else if (status == 'shipped') currentStep = 4;
    else if (status == 'delivered') currentStep = 5;
    else if (status == 'completed') currentStep = 6;
    else if (status == 'returned') currentStep = 7;
    else if (status == 'cancelled') currentStep = 0;

    // Check if has return request
    final hasReturnRequest = order['return_request'] != null;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colorScheme.outline, width: 0.15),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
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
          // Only show step tracker if NOT in final state (completed/returned)
          if (status != 'cancelled' && status != 'completed' && status != 'returned') ...[
            const SizedBox(height: 16),
            _buildOrderStepsTracker(currentStep: currentStep, hasReturnRequest: hasReturnRequest),
          ],
        ],
      ),
    );
  }

  Widget _buildOrderStepsTracker({required int currentStep, bool hasReturnRequest = false}) {
    // Build steps list - show Hoàn trả instead of Hoàn thành if has return request
    final List<Map<String, dynamic>> baseSteps = [
      {'value': 'pending', 'label': 'Chờ XN', 'step': 1},
      {'value': 'processing', 'label': 'Đã XN', 'step': 2},
      {'value': 'paid', 'label': 'Chuẩn bị', 'step': 3},
      {'value': 'shipped', 'label': 'Đang giao', 'step': 4},
      {'value': 'delivered', 'label': 'Đã giao', 'step': 5},
    ];

    // Add final step: Hoàn thành or Hoàn trả (if has return request)
    final lastStep = hasReturnRequest
        ? {'value': 'returned', 'label': 'Hoàn trả', 'step': 7}
        : {'value': 'completed', 'label': 'Đã HT', 'step': 6};

    final stepsList = [...baseSteps, lastStep];

    const Color activeStepColor = Color(0xFF10B981);

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      padding: const EdgeInsets.symmetric(vertical: 0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: List.generate(stepsList.length, (index) {
          final sData = stepsList[index];
          final sStep = sData['step'] as int;
          final sLabel = sData['label'] as String;

          final isDone = currentStep >= sStep;
          final isActive = currentStep == sStep;

          return Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Divider(
                        color: index == 0 ? Colors.transparent : (isDone ? activeStepColor : const Color(0xFFE2E8F0)),
                        thickness: 2.2,
                      ),
                    ),
                    Container(
                      width: 22,
                      height: 22,
                      decoration: BoxDecoration(
                        color: isActive ? activeStepColor : (isDone ? activeStepColor.withValues(alpha: 0.12) : Colors.white),
                        border: Border.all(color: isDone ? activeStepColor : const Color(0xFFCBD5E1), width: 2),
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: isDone && !isActive
                            ? const Icon(Icons.check, size: 12, color: activeStepColor)
                            : Text(
                                '${index + 1}',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: isActive ? Colors.white : const Color(0xFF64748B),
                                ),
                              ),
                      ),
                    ),
                    Expanded(
                      child: Divider(
                        color: index == stepsList.length - 1 ? Colors.transparent : (currentStep > sStep ? activeStepColor : const Color(0xFFE2E8F0)),
                        thickness: 2.2,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  sLabel,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: isActive ? FontWeight.bold : FontWeight.w500,
                    color: isActive ? activeStepColor : const Color(0xFF64748B),
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          );
        }),
      ),
    );
  }

  Widget _buildProductsCard(Map<String, dynamic> order) {
    final colorScheme = Theme.of(context).colorScheme;
    final items = (order['items'] as List<dynamic>?) ?? [];

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colorScheme.outline, width: 0.15),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                Trans.productList,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                  color: colorScheme.onSurface,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: colorScheme.surface,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '(${items.length})',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 11,
                    color: colorScheme.onSurface,
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

    final variant = item is Map<String, dynamic> ? item['variant'] as Map<String, dynamic>? : null;
    String? variantLabel;
    if (variant != null) {
      final parts = [
        variant['color']?.toString(),
        (variant['configuration'] ?? variant['storage'])?.toString(),
      ].where((part) => part != null && part.trim().isNotEmpty).toList();
      if (parts.isNotEmpty) {
        variantLabel = parts.join(' - ');
      }
    }

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Hình ảnh sản phẩm - 56x56 như admin
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: imageUrl.isNotEmpty
                  ? Image.network(
                      imageUrl,
                      width: 56,
                      height: 56,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const Icon(Icons.image_rounded, color: Color(0xFF94A3B8), size: 20),
                    )
                  : const Icon(Icons.image_rounded, color: Color(0xFF94A3B8), size: 20),
            ),
          ),
          const SizedBox(width: 12),

          // 2. Thông tin sản phẩm
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                    color: colorScheme.onSurface,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                if (variantLabel != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      variantLabel,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: colorScheme.onSurface,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                const SizedBox(height: 4),
                Text(
                  'SL: $quantity × ${total}₫',
                  style: const TextStyle(color: Color(0xFF64748B), fontSize: 12, fontWeight: FontWeight.w500),
                ),
              ],
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
        border: Border.all(color: colorScheme.outline, width: 0.15),
      ),
      child: Icon(Icons.image_not_supported, color: colorScheme.onSurface.withValues(alpha: 0.4)),
    );
  }

  Widget _buildShippingCard(Map<String, dynamic> order) {
    final colorScheme = Theme.of(context).colorScheme;
    // Try multiple paths for customer info (API may return different structures)
    String customerName = '—';
    String customerEmail = '—';

    // Try order['customer']
    var customer = order['customer'];
    if (customer is Map) {
      customerName = customer['name']?.toString() ?? '—';
      customerEmail = customer['email']?.toString() ?? '—';
    }
    // Fallback: try order['user']
    if (customerName == '—' || customerEmail == '—') {
      final user = order['user'];
      if (user is Map) {
        if (customerName == '—') customerName = user['name']?.toString() ?? '—';
        if (customerEmail == '—') customerEmail = user['email']?.toString() ?? '—';
      }
    }
    // Fallback: try direct fields
    if (customerName == '—') {
      customerName = order['customer_name']?.toString() ?? order['user_name']?.toString() ?? '—';
    }
    if (customerEmail == '—') {
      customerEmail = order['customer_email']?.toString() ?? order['user_email']?.toString() ?? '—';
    }
    // Final fallback: use current logged in user from local storage
    if (customerName == '—' && _currentUser != null) {
      customerName = _currentUser!['name']?.toString() ?? '—';
    }
    if (customerEmail == '—' && _currentUser != null) {
      customerEmail = _currentUser!['email']?.toString() ?? '—';
    }

    // Shipping info
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
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colorScheme.outline, width: 0.15),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Customer info (người đặt)
          Text(
                "Thông tin khách hàng",
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                  color: colorScheme.onSurface,
                ),
              ),
              
          const Divider(height: 16, color: Color(0xFFF1F5F9)),
          _buildInfoRow(Trans.customerNameLabel, customerName),
          _buildInfoRow(Trans.customerEmailLabel, customerEmail),
          const Divider(height: 16, color: Color(0xFFF1F5F9)),
          // Shipping info (người nhận)
          _buildInfoRow(Trans.receiverNameLabel, name),
          const SizedBox(height: 8),
          _buildInfoRow(Trans.phone, phone),
          const SizedBox(height: 8),
          _buildInfoRow(Trans.shippingAddressLabel, address),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(label, style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontSize: 13)),
          ),
          Expanded(
            child: Text(value, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Theme.of(context).colorScheme.onSurface)),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentCard(Map<String, dynamic> order) {
    final colorScheme = Theme.of(context).colorScheme;

    // Amounts
    final subtotal = _formatMoney(order['subtotal_amount']);
    final discount = _formatMoney(order['discount_amount']);
    final pointsDiscount = _formatMoney(order['points_discount']);
    final shipping = _formatMoney(order['shipping_fee']);
    final total = _formatMoney(order['total_amount']);

    // Payment info
    final payment = order['payment'] as Map<String, dynamic>?;
    final method = payment?['method']?.toString() ?? '—';
    final status = payment?['status']?.toString() ?? '—';
    final transactionCode = payment?['transaction_code']?.toString() ?? '—';
    final paidAt = _formatDateTime(payment?['paid_at']?.toString());

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colorScheme.outline, width: 0.15),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            Trans.paymentCost,
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 14,
              color: colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 12),
          // Amount rows like admin
          _buildAmountRow('Tạm tính', '$subtotal₫'),
          const SizedBox(height: 6),
          _buildAmountRow('Phí vận chuyển', '$shipping₫'),
          if (discount != '0')
            _buildAmountRow(
              (order['coupon_code'] != null && order['coupon_code'].toString().isNotEmpty) 
                  ? 'Mã giảm giá (${order['coupon_code']})' 
                  : 'Giảm giá',
              '-$discount₫', 
              isDiscount: true,
            ),
          if (pointsDiscount != '0')
            _buildAmountRow(
              'Giảm giá (Điểm thưởng)',
              '-$pointsDiscount₫', 
              isDiscount: true,
            ),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Divider(height: 1, color: const Color(0xFFF1F5F9)),
          ),
          _buildAmountRow('Thành tiền', '$total₫', isTotal: true),
          const SizedBox(height: 8),
          // Payment method
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(Trans.paymentMethod, style: TextStyle(color: colorScheme.onSurface, fontSize: 13)),
              Flexible(
                child: Text(
                  _payLabel(method),
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: colorScheme.onSurface),
                  textAlign: TextAlign.end,
                ),
              ),
            ],
          ),
          // Payment status (if available)
          if (status.isNotEmpty) ...[
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Trạng thái', style: TextStyle(color: colorScheme.onSurface, fontSize: 13)),
                Flexible(
                  child: Text(status, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: colorScheme.onSurface), textAlign: TextAlign.end),
                ),
              ],
            ),
          ],
          // Transaction code
          if (transactionCode != '—') ...[
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Mã giao dịch', style: TextStyle(color: colorScheme.onSurface, fontSize: 13)),
                Flexible(
                  child: Text(transactionCode, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: colorScheme.onSurface), textAlign: TextAlign.end),
                ),
              ],
            ),
          ],
          // Paid at
          if (paidAt != '—') ...[
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Thời gian', style: TextStyle(color: colorScheme.onSurface, fontSize: 13)),
                Flexible(
                  child: Text(paidAt, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: colorScheme.onSurface), textAlign: TextAlign.end),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildAmountRow(String label, String value, {bool isDiscount = false, bool isTotal = false}) {
    final colorScheme = Theme.of(context).colorScheme;
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: isTotal ? 14 : 13,
            fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
            color: isTotal ? colorScheme.primary : colorScheme.onSurface,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: isTotal ? 15 : 13,
            fontWeight: isTotal ? FontWeight.bold : FontWeight.w500,
            color: isDiscount ? Colors.green : (isTotal ? const Color(0xFFFF2424) : colorScheme.onSurface),
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
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colorScheme.outline, width: 0.15),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(Icons.undo_outlined, color: Colors.green, size: 22),
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
            Text('Phản hồi từ Admin:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.red)),
            const SizedBox(height: 4),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: colorScheme.surface,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.red, width: 0.5),
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
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colorScheme.outline, width: 0.15),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.history, color: Colors.blue, size: 22),
              const SizedBox(width: 8),
              Text(
                'Lịch sử thay đổi',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: colorScheme.onSurface,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: colorScheme.surface,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text('${history.length} lần', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: colorScheme.onSurface)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...history.map<Widget>((entry) {
            // Use from_label/to_label like admin (or fallback to from_status/to_status)
            final fromLabel = entry['from_label']?.toString() ?? entry['from_status']?.toString() ?? '—';
            final toLabel = entry['to_label']?.toString() ?? entry['to_status']?.toString() ?? '—';
            final changedAt = entry['changed_at']?.toString() ?? '';
            final note = entry['note']?.toString() ?? '';
            final changedByName = entry['changed_by']?['name']?.toString() ?? 'Hệ thống';

            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: colorScheme.surface,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '$fromLabel  ➔  $toLabel',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: colorScheme.onSurface),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${_formatDateTime(changedAt)} • $changedByName',
                          style: TextStyle(fontSize: 11, color: colorScheme.onSurface, fontWeight: FontWeight.w500),
                        ),
                        if (note.trim().isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Text('Ghi chú: $note', style: TextStyle(fontSize: 12, color: const Color(0xFF475569), fontStyle: FontStyle.italic)),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
        ],
      ),
    );
  }
}
