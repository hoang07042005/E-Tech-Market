import 'package:flutter/material.dart';
import 'package:e_tech_market_app/services/admin_orders_service.dart';

class AdminOrderDetailScreen extends StatefulWidget {
  final int orderId;
  const AdminOrderDetailScreen({super.key, required this.orderId});

  @override
  State<AdminOrderDetailScreen> createState() => _AdminOrderDetailScreenState();
}

class _AdminOrderDetailScreenState extends State<AdminOrderDetailScreen> {
  bool _isLoading = true;
  String? _error;
  Map<String, dynamic>? _detail;
  String _selectedStatus = 'pending';
  bool _isSavingStatus = false;

  @override
  void initState() {
    super.initState();
    _loadDetail();
  }

  Future<void> _loadDetail() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final data = await AdminOrdersService.fetchAdminOrderDetail(widget.orderId);
      setState(() {
        _detail = data;
        _selectedStatus = data['status'] ?? 'pending';
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  // Đồng bộ logic gọi lại _loadDetail() sau khi cập nhật để tự động hiển thị dòng lịch sử mới ở dưới
  Future<void> _saveStatus() async {
    if (_selectedStatus == _detail?['status']) return;
    setState(() => _isSavingStatus = true);
    try {
      await AdminOrdersService.updateAdminOrder(widget.orderId, status: _selectedStatus);
      _showSnackBar('Cập nhật trạng thái thành công', Colors.green);
      await _loadDetail(); // Tải lại toàn bộ dữ liệu để cập nhật Stepper & Khối Lịch sử
      setState(() => _isSavingStatus = false);
    } catch (e) {
      setState(() => _isSavingStatus = false);
      _showSnackBar('Lỗi: ${e.toString()}', Colors.red);
    }
  }

  void _showSnackBar(String msg, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: color, behavior: SnackBarBehavior.floating),
    );
  }

  // ĐÃ SỬA: Sửa hàm phân giải URL ảnh - Trỏ trực tiếp về root domain host, loại bỏ prefix '/api' gây lỗi 404
  String _getResolvedProductImage(Map<String, dynamic> item) {
    String? path = item['image_url'] ?? item['image'];
    
    if (path == null && item['product'] is Map) {
      path = item['product']['image_url'] ?? item['product']['image'];
    }
    
    if (path == null || path.isEmpty) return '';
    if (path.startsWith('http')) return path;
    
    const String serviceUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://192.168.24.14:8000/api');
    final String rootHost = serviceUrl.replaceAll('/api', '');
    final String cleanPath = path.startsWith('/') ? path : '/$path';
    return '$rootHost$cleanPath';
  }

  // Đồng bộ logic hiển thị các tuỳ chọn Dropdown tương thích 100% luật chặn từ Web công ty
  List<DropdownMenuItem<String>> _buildDropdownItems() {
    final currentStatus = _detail?['status'] ?? 'pending';
    final currentStep = _detail?['status_step'] ?? 1;
    
    final List<Map<String, dynamic>> allOptions = [
      {'value': 'pending', 'label': 'Chờ xác nhận', 'step': 1},
      {'value': 'processing', 'label': 'Đã xác nhận', 'step': 2},
      {'value': 'paid', 'label': 'Chuẩn bị hàng', 'step': 3},
      {'value': 'shipped', 'label': 'Đang giao', 'step': 4},
      {'value': 'delivered', 'label': 'Đã giao', 'step': 5},
      {'value': 'completed', 'label': 'Hoàn thành', 'step': 6},
      {'value': 'returned', 'label': 'Hoàn trả', 'step': 7},
      {'value': 'cancelled', 'label': 'Hủy đơn', 'step': 0},
    ];

    List<DropdownMenuItem<String>> menuItems = [];
    for (var opt in allOptions) {
      final val = opt['value'] as String;
      final lbl = opt['label'] as String;
      final step = opt['step'] as int;

      // Áp dụng bộ lọc cấu hình phân quyền từ bản Web:
      if ((val == 'completed' || val == 'returned' || val == 'cancelled') && currentStatus != val) {
        continue; 
      }
      if (val != 'cancelled' && step > 0 && currentStep > 0 && step < currentStep) {
        continue; 
      }

      menuItems.add(DropdownMenuItem<String>(
        value: val,
        child: Text(lbl, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
      ));
    }

    if (!menuItems.any((item) => item.value == currentStatus)) {
      menuItems.insert(0, DropdownMenuItem<String>(
        value: currentStatus,
        child: Text(_detail?['status_label'] ?? currentStatus, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
      ));
    }
    return menuItems;
  }

  // Thiết kế Thanh tiến trình trạng thái tuyến tính (Timeline Stepper) theo Web
  Widget _buildOrderStepsTracker() {
    final currentStatus = _detail?['status'] ?? 'pending';
    final currentStep = _detail?['status_step'] ?? 1;

    final List<Map<String, dynamic>> stepsList = [
      {'value': 'pending', 'label': 'Chờ XN', 'step': 1},
      {'value': 'processing', 'label': 'Đã XN', 'step': 2},
      {'value': 'paid', 'label': 'Chuẩn bị', 'step': 3},
      {'value': 'shipped', 'label': 'Đang giao', 'step': 4},
      {'value': 'delivered', 'label': 'Đã giao', 'step': 5},
    ];

    if (currentStatus == 'cancelled') {
      return Container(
        margin: const EdgeInsets.symmetric(vertical: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: Colors.red.withOpacity(0.06), borderRadius: BorderRadius.circular(8)),
        child: const Row(
          children: [
            Icon(Icons.cancel_rounded, color: Colors.red, size: 18),
            SizedBox(width: 8),
            Text('Đơn hàng này đã hủy bỏ thành công', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 13)),
          ],
        ),
      );
    }

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.symmetric(vertical: 4),
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
                    Expanded(child: Divider(color: index == 0 ? Colors.transparent : (isDone ? const Color(0xFF4F46E5) : const Color(0xFFE2E8F0)), thickness: 2.2)),
                    Container(
                      width: 22,
                      height: 22,
                      decoration: BoxDecoration(
                        color: isActive ? const Color(0xFF4F46E5) : (isDone ? const Color(0xFF4F46E5).withOpacity(0.12) : Colors.white),
                        border: Border.all(color: isDone ? const Color(0xFF4F46E5) : const Color(0xFFCBD5E1), width: 2),
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: isDone && !isActive
                            ? const Icon(Icons.check, size: 12, color: Color(0xFF4F46E5))
                            : Text(
                                '${index + 1}',
                                style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: isActive ? Colors.white : const Color(0xFF64748B)),
                              ),
                      ),
                    ),
                    Expanded(child: Divider(color: index == stepsList.length - 1 ? Colors.transparent : (currentStep > sStep ? const Color(0xFF4F46E5) : const Color(0xFFE2E8F0)), thickness: 2.2)),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  sLabel,
                  style: TextStyle(fontSize: 10, fontWeight: isActive ? FontWeight.bold : FontWeight.w500, color: isActive ? const Color(0xFF4F46E5) : const Color(0xFF64748B)),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          );
        }),
      ),
    );
  }

  // Khối hiển thị chi tiết "Lịch sử chuyển trạng thái" đồng bộ theo Web dưới cùng
  Widget _buildStatusHistorySection() {
    final history = _detail?['status_history'] as List? ?? [];
    return _buildSectionCard(
      title: 'Lịch sử chuyển trạng thái',
      trailing: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(12)),
        child: Text('${history.length} lần', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF475569))),
      ),
      child: history.isEmpty
          ? const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Center(child: Text('Chưa ghi nhận lịch sử biến động.', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13))),
            )
          : Column(
              children: history.map((h) {
                final fromLabel = h['from_label'] ?? '—';
                final toLabel = h['to_label'] ?? h['to_status'] ?? '—';
                final changedAt = h['changed_at'] ?? '';
                final changedBy = h['changed_by']?['name'] ?? 'Hệ thống';
                final note = h['note'] ?? '';

                return Container(
                  margin: const EdgeInsets.symmetric(vertical: 6),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
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
                            Text('$fromLabel  ➔  $toLabel', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A))),
                            const SizedBox(height: 4),
                            Text(
                              '${AdminOrdersService.formatViTime(changedAt)} • $changedBy',
                              style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                            ),
                            if (note.toString().trim().isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Text('Ghi chú: $note', style: const TextStyle(fontSize: 12, color: Color(0xFF475569), fontStyle: FontStyle.italic)),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final items = _detail?['items'] as List? ?? [];
    final amounts = _detail?['amounts'] ?? {};

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
        centerTitle: true,
        title: Text(
          _detail?['order_code'] != null ? 'Đơn hàng #${_detail!['order_code']}' : 'Chi Tiết Đơn Hàng', 
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF4F46E5)))
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
              : SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Khối 1: Quản lý trạng thái + Stepper tiến trình
                      _buildSectionCard(
                        title: 'Quản lý trạng thái',
                        child: Column(
                          children: [
                            _buildOrderStepsTracker(),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                Expanded(
                                  child: DropdownButtonFormField<String>(
                                    value: _selectedStatus,
                                    items: _buildDropdownItems(),
                                    onChanged: (v) => setState(() => _selectedStatus = v ?? 'pending'),
                                    decoration: InputDecoration(
                                      isDense: true,
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                SizedBox(
                                  height: 40,
                                  child: ElevatedButton(
                                    onPressed: _isSavingStatus ? null : _saveStatus,
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF4F46E5),
                                      foregroundColor: Colors.white,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                      elevation: 0,
                                      padding: const EdgeInsets.symmetric(horizontal: 16),
                                    ),
                                    child: Text(_isSavingStatus ? 'Lưu…' : 'Cập nhật'),
                                  ),
                                )
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Khối 2: Thông tin giao nhận hàng
                      _buildSectionCard(
                        title: 'Thông tin khách hàng',
                        child: Column(
                          children: [
                            // Thông tin tài khoản người mua
                            _buildInfoRow('Tên khách hàng', _detail?['user']?['name'] ?? _detail?['customer_name'] ?? '—'),
                            _buildInfoRow('Email khách hàng', _detail?['user']?['email'] ?? _detail?['user_email'] ?? '—'),
                            const Divider(height: 16, color: Color(0xFFF1F5F9)),
                            // Thông tin giao hàng (Người nhận)
                            _buildInfoRow('Tên người nhận', _detail?['shipping_name'] ?? _detail?['customer_name'] ?? '—'),
                            _buildInfoRow('Số điện thoại', _detail?['shipping_phone'] ?? '—'),
                            _buildInfoRow('Địa chỉ giao hàng', _detail?['shipping_address'] ?? '—'),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Khối 3: Danh sách các sản phẩm của đơn hàng
                      _buildSectionCard(
                        title: 'Danh sách sản phẩm (${items.length})',
                        child: Column(
                          children: items.map((item) {
                            final imgUrl = _getResolvedProductImage(item);
                            
                            return Padding(
                              padding: const EdgeInsets.symmetric(vertical: 8.0),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(8),
                                    child: Container(
                                      width: 56,
                                      height: 56,
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFF1F5F9),
                                        border: Border.all(color: const Color(0xFFE2E8F0)),
                                      ),
                                      child: imgUrl.isNotEmpty
                                          ? Image.network(
                                              imgUrl,
                                              fit: BoxFit.cover,
                                              errorBuilder: (context, error, stackTrace) {
                                                return const Icon(Icons.broken_image_rounded, color: Color(0xFF94A3B8), size: 20);
                                              },
                                            )
                                          : const Icon(Icons.image_rounded, color: Color(0xFF94A3B8), size: 20),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          item['name'] ?? 'Sản phẩm không tên', 
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A)), 
                                          maxLines: 2, 
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          'SL: ${item['quantity']}  ×  ${AdminOrdersService.formatVnd(item['unit_price'] ?? 0)}₫', 
                                          style: const TextStyle(color: Color(0xFF64748B), fontSize: 12, fontWeight: FontWeight.w500),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    '${AdminOrdersService.formatVnd(item['total_price'] ?? 0)}₫', 
                                    style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0F172A), fontSize: 13),
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Khối 4: Chi phí hóa đơn thanh toán
                      _buildSectionCard(
                        title: 'Thanh toán & Chi phí',
                        child: Column(
                          children: [
                            _buildAmountRow('Tạm tính', amounts['subtotal'] ?? 0),
                            _buildAmountRow('Phí vận chuyển', amounts['shipping_fee'] ?? 0),
                            _buildAmountRow('Mã giảm giá', amounts['discount'] ?? 0, isDiscount: true),
                            const Divider(height: 16, color: Color(0xFFF1F5F9)),
                            _buildAmountRow('Thành tiền', amounts['total'] ?? 0, isTotal: true),
                            const SizedBox(height: 6),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Phương thức', style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                                Text(_detail?['payment_method'] ?? '—', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF1E293B))),
                              ],
                            )
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),

                      // HIỂN THỊ LỊCH SỬ CHUYỂN TRẠNG THÁI Ở DƯỚI CÙNG THEO WEB
                      _buildStatusHistorySection(),
                    ],
                  ),
                ),
    );
  }

  Widget _buildSectionCard({required String title, required Widget child, Widget? trailing}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white, 
        borderRadius: BorderRadius.circular(12), 
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start, 
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A))),
              if (trailing != null) trailing,
            ],
          ),
          const Padding(padding: EdgeInsets.symmetric(vertical: 6), child: Divider(height: 1, color: Color(0xFFF1F5F9))),
          child
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
          SizedBox(width: 110, child: Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 13))),
          Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF1E293B)))),
        ],
      ),
    );
  }

  Widget _buildAmountRow(String label, num val, {bool isDiscount = false, bool isTotal = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: isTotal ? 14 : 13, fontWeight: isTotal ? FontWeight.bold : FontWeight.normal, color: isTotal ? const Color(0xFF0F172A) : const Color(0xFF64748B))),
          Text(
            '${isDiscount ? "-" : ""}${AdminOrdersService.formatVnd(val)}₫',
            style: TextStyle(
              fontSize: isTotal ? 15 : 13,
              fontWeight: isTotal ? FontWeight.bold : FontWeight.w600,
              color: isDiscount ? Colors.red : (isTotal ? const Color(0xFF4F46E5) : const Color(0xFF1E293B)),
            ),
          )
        ],
      ),
    );
  }
}