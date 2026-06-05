import 'package:flutter/material.dart';
import 'package:e_tech_market_app/services/admin_orders_service.dart';
import 'admin_order_detail_screen.dart';

class AdminOrdersScreen extends StatefulWidget {
  const AdminOrdersScreen({super.key});

  @override
  State<AdminOrdersScreen> createState() => _AdminOrdersScreenState();
}

class _AdminOrdersScreenState extends State<AdminOrdersScreen> {
  bool _isLoading = true;
  String? _error;
  Map<String, dynamic>? _response;
  String _activeTab = 'all';
  int _currentPage = 1;
  bool _filterExpanded = false;

  late TextEditingController _orderCodeCtrl;
  late TextEditingController _customerCtrl;
  late TextEditingController _dateFromCtrl;
  late TextEditingController _dateToCtrl;
  String _filterStatus = 'all';
  String _filterPaymentMethod = 'all';
  String _filterPaymentStatus = 'all';

  @override
  void initState() {
    super.initState();
    _orderCodeCtrl = TextEditingController();
    _customerCtrl = TextEditingController();
    _dateFromCtrl = TextEditingController();
    _dateToCtrl = TextEditingController();
    _loadOrders();
  }

  @override
  void dispose() {
    _orderCodeCtrl.dispose();
    _customerCtrl.dispose();
    _dateFromCtrl.dispose();
    _dateToCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadOrders() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final data = await AdminOrdersService.fetchAdminOrders(
        page: _currentPage,
        orderCode: _orderCodeCtrl.text.trim().isNotEmpty ? _orderCodeCtrl.text.trim() : null,
        customer: _customerCtrl.text.trim().isNotEmpty ? _customerCtrl.text.trim() : null,
        dateFrom: _dateFromCtrl.text.trim().isNotEmpty ? _dateFromCtrl.text.trim() : null,
        dateTo: _dateToCtrl.text.trim().isNotEmpty ? _dateToCtrl.text.trim() : null,
        status: _filterStatus != 'all' ? _filterStatus : null,
        paymentMethod: _filterPaymentMethod != 'all' ? _filterPaymentMethod : null,
        paymentStatus: _filterPaymentStatus != 'all' ? _filterPaymentStatus : null,
        returnRequests: _activeTab == 'returns' ? 'pending' : null,
      );
      setState(() {
        _response = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  void _resetFilters() {
    setState(() {
      _orderCodeCtrl.clear();
      _customerCtrl.clear();
      _dateFromCtrl.clear();
      _dateToCtrl.clear();
      _filterStatus = 'all';
      _filterPaymentMethod = 'all';
      _filterPaymentStatus = 'all';
      _currentPage = 1;
    });
    _loadOrders();
  }

  Future<void> _selectDate(TextEditingController controller) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime(2000),
      lastDate: DateTime.now(),
    );
    if (picked != null) {
      setState(() {
        controller.text = picked.toIso8601String().split('T').first;
      });
    }
  }

  String _formatDisplayDate(Map<String, dynamic> row) {
    final dynamic rawDate = row['created_date'] ?? row['created_at'];
    if (rawDate == null) return '—';
    final String dateStr = rawDate.toString();
    if (dateStr.contains('-') && dateStr.length >= 10) {
      try {
        final dt = DateTime.parse(dateStr);
        return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
      } catch (_) {}
    }
    return dateStr;
  }

  @override
  Widget build(BuildContext context) {
    final stats = _response?['stats'] ?? {};
    final rows = _response?['data'] ?? [];
    final pagination = _response?['pagination'] ?? {};

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
        centerTitle: true,
        title: const Text('Quản Lý Đơn Hàng', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        child: Padding(
          padding: const EdgeInsets.all(14.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Khối thống kê số liệu KPI (2x2)
              Column(
                children: [
                  Row(
                    children: [
                      Expanded(child: _buildKpiCard('Tổng số đơn', stats['total'], const Color(0xFF3B82F6), Icons.receipt_long_rounded)),
                      const SizedBox(width: 10),
                      Expanded(child: _buildKpiCard('Chờ xử lý', stats['pending'], const Color(0xFFF59E0B), Icons.hourglass_empty_rounded)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(child: _buildKpiCard('Đang xử lý', stats['processing'], const Color(0xFF06B6D4), Icons.local_shipping_outlined)),
                      const SizedBox(width: 10),
                      Expanded(child: _buildKpiCard('Hoàn thành', stats['completed'], const Color(0xFF10B981), Icons.check_circle_outline_rounded)),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Hàng điều hướng: Tất cả đơn, Hoàn trả & Nút bộ lọc ẩn/hiện
              Row(
                children: [
                  _buildTabButton('Tất cả đơn', 'all'),
                  const SizedBox(width: 8),
                  _buildTabButton('Đơn hoàn trả', 'returns'),
                  const SizedBox(width: 8),
                  InkWell(
                    onTap: () => setState(() => _filterExpanded = !_filterExpanded),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      height: 38,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: _filterExpanded ? const Color(0xFF4F46E5).withOpacity(0.08) : Colors.white,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: _filterExpanded ? const Color(0xFF4F46E5) : const Color(0xFFE2E8F0),
                          width: 1.2,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.tune_rounded,
                            size: 16,
                            color: _filterExpanded ? const Color(0xFF4F46E5) : const Color(0xFF475569),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'Bộ lọc',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: _filterExpanded ? const Color(0xFF4F46E5) : const Color(0xFF475569),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),

              // Khối bộ lọc lưới 2 cột nâng cao
              AnimatedSize(
                duration: const Duration(milliseconds: 250),
                curve: Curves.fastOutSlowIn,
                child: _filterExpanded
                    ? Container(
                        margin: const EdgeInsets.only(top: 12),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF0F172A).withOpacity(0.03),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            )
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Tìm kiếm nâng cao',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF1E293B)),
                            ),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                Expanded(
                                  child: TextField(
                                    controller: _orderCodeCtrl,
                                    style: const TextStyle(fontSize: 13),
                                    decoration: _buildInputDecoration('Mã đơn hàng', Icons.tag),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: TextField(
                                    controller: _customerCtrl,
                                    style: const TextStyle(fontSize: 13),
                                    decoration: _buildInputDecoration('Tên khách mua', Icons.person_outline_rounded),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Expanded(
                                  child: GestureDetector(
                                    onTap: () => _selectDate(_dateFromCtrl),
                                    child: AbsorbPointer(
                                      child: TextField(
                                        controller: _dateFromCtrl,
                                        style: const TextStyle(fontSize: 13),
                                        decoration: _buildInputDecoration('Từ ngày', Icons.calendar_today_rounded),
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: GestureDetector(
                                    onTap: () => _selectDate(_dateToCtrl),
                                    child: AbsorbPointer(
                                      child: TextField(
                                        controller: _dateToCtrl,
                                        style: const TextStyle(fontSize: 13),
                                        decoration: _buildInputDecoration('Đến ngày', Icons.calendar_today_rounded),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 14),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                SizedBox(
                                  height: 32,
                                  child: OutlinedButton(
                                    onPressed: _resetFilters,
                                    style: OutlinedButton.styleFrom(
                                      side: const BorderSide(color: Color(0xFFCBD5E1)),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                                      padding: const EdgeInsets.symmetric(horizontal: 12),
                                    ),
                                    child: const Text('Xoá bộ lọc', style: TextStyle(color: Color(0xFF64748B), fontSize: 12, fontWeight: FontWeight.w500)),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                SizedBox(
                                  height: 32,
                                  child: ElevatedButton(
                                    onPressed: () {
                                      setState(() => _currentPage = 1);
                                      _loadOrders();
                                    },
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF4F46E5),
                                      foregroundColor: Colors.white,
                                      elevation: 0,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                                      padding: const EdgeInsets.symmetric(horizontal: 16),
                                    ),
                                    child: const Text('Tìm kiếm', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                  ),
                                ),
                              ],
                            )
                          ],
                        ),
                      )
                    : const SizedBox.shrink(),
              ),
              const SizedBox(height: 14),

              // Danh sách đơn hàng
              if (_isLoading)
                const Center(child: Padding(padding: EdgeInsets.all(40.0), child: CircularProgressIndicator(color: Color(0xFF4F46E5))))
              else if (_error != null)
                Center(child: Text('Đã xảy ra lỗi: $_error', style: const TextStyle(color: Colors.red)))
              else if (rows.isEmpty)
                const Center(child: Padding(padding: EdgeInsets.all(40.0), child: Text('Không tìm thấy đơn hàng nào.')))
              else
                Column(
                  children: [
                    ...rows.map((row) => _buildOrderCard(row)).toList(),
                    const SizedBox(height: 16),
                    if (pagination.isNotEmpty && pagination['last_page'] > 1)
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 14),
                            onPressed: _currentPage > 1 ? () { setState(() => _currentPage--); _loadOrders(); } : null,
                          ),
                          Text('Trang $_currentPage / ${pagination['last_page']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          IconButton(
                            icon: const Icon(Icons.arrow_forward_ios_rounded, size: 14),
                            onPressed: _currentPage < pagination['last_page'] ? () { setState(() => _currentPage++); _loadOrders(); } : null,
                          ),
                        ],
                      )
                  ],
                )
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildKpiCard(String label, dynamic count, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(height: 6),
          Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
          Text('${count ?? 0}', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
        ],
      ),
    );
  }

  InputDecoration _buildInputDecoration(String label, IconData icon) {
    return InputDecoration(
      labelText: label,
      isDense: true,
      labelStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
      prefixIcon: Icon(icon, size: 16, color: const Color(0xFF94A3B8)),
      filled: true,
      fillColor: const Color(0xFFF8FAFC),
      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF4F46E5), width: 1.2)),
    );
  }

  Widget _buildTabButton(String label, String value) {
    final isSelected = _activeTab == value;
    return Expanded(
      child: SizedBox(
        height: 38,
        child: ElevatedButton(
          onPressed: () {
            setState(() {
              _activeTab = value;
              _currentPage = 1;
            });
            _loadOrders();
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: isSelected ? const Color(0xFF4F46E5) : Colors.white,
            foregroundColor: isSelected ? Colors.white : const Color(0xFF475569),
            elevation: 0,
            padding: EdgeInsets.zero,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8), 
              side: BorderSide(color: isSelected ? Colors.transparent : const Color(0xFFE2E8F0), width: 1.2),
            ),
          ),
          child: Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
        ),
      ),
    );
  }

  Widget _buildOrderCard(Map<String, dynamic> row) {
    final statusColor = _getStatusColor(row['status_tone']);
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
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
              Text(row['order_code'] ?? '—', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: statusColor.withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
                child: Text(row['status_label'] ?? '—', style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text('Khách hàng: ${row['customer_name'] ?? '—'}', style: const TextStyle(color: Color(0xFF475569), fontSize: 13)),
          const SizedBox(height: 4),
          Text('Ngày đặt: ${_formatDisplayDate(row)}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 13)),
          const Divider(height: 18, color: Color(0xFFF1F5F9)),
          
          // ĐÃ SỬA CHÍNH XÁC KEY: Đổi thành 'payment_method' theo đúng API gốc
          Text('Phương thức thanh toán: ${row['payment_method'] ?? '—'}', style: const TextStyle(color: Color(0xFF475569), fontSize: 13)),
          const SizedBox(height: 4),
          
          // ĐÃ SỬA CHÍNH XÁC KEY: Đổi thành 'product' để hiển thị chuỗi danh sách sản phẩm tóm tắt
          Text(
            'Sản phẩm: ${row['product'] ?? '—'}', 
            style: const TextStyle(color: Color(0xFF475569), fontSize: 13),
          ),
          const SizedBox(height: 4),
          
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Tổng tiền: ${AdminOrdersService.formatVnd(row['total_amount'] ?? 0)}₫',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFFFF2424)),
              ),
              SizedBox(
                height: 32,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => AdminOrderDetailScreen(orderId: row['id'])),
                    ).then((_) => _loadOrders());
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF4F46E5),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                  ),
                  child: const Text('Chi tiết', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          )
        ],
      ),
    );
  }

  Color _getStatusColor(String? tone) {
    switch (tone) {
      case 'ok': return Colors.green;
      case 'wait': return Colors.orange;
      case 'info': return Colors.blue;
      case 'bad': return Colors.red;
      default: return Colors.grey;
    }
  }
}