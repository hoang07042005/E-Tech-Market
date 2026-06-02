import 'package:flutter/material.dart';

import '../../../services/order_service.dart';
import 'order_detail_screen.dart';

class OrderListScreen extends StatefulWidget {
  const OrderListScreen({super.key});

  @override
  State<OrderListScreen> createState() => _OrderListScreenState();
}

class _OrderListScreenState extends State<OrderListScreen> {
  bool _loading = true;
  String? _error;
  int _page = 1;
  int _lastPage = 1;
  List<dynamic> _orders = [];
  String _search = '';
  String _statusFilter = 'all';

  @override
  void initState() {
    super.initState();
    _loadOrders();
  }

  Future<void> _loadOrders({int page = 1}) async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final response = await OrderService.fetchOrders(page: page);
      final data = response['data'];
      setState(() {
        _page = response['current_page'] is int ? response['current_page'] as int : page;
        _lastPage = response['last_page'] is int ? response['last_page'] as int : 1;
        _orders = data is List ? data : [];
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

  List<dynamic> get _filteredOrders {
    return _orders.where((order) {
      final q = _search.trim().toLowerCase();
      if (q.isNotEmpty) {
        final code = (order['order_code'] ?? '').toString().toLowerCase();
        final items = (order['items'] as List<dynamic>?) ?? [];
        final names = items.map((item) {
          if (item is Map<String, dynamic>) {
            return (item['product_name_snapshot'] ?? item['product']?['name'] ?? '').toString();
          }
          return '';
        }).join(' ').toLowerCase();
        if (!code.contains(q) && !names.contains(q)) return false;
      }
      if (_statusFilter != 'all') {
        final status = (order['status'] ?? '').toString().toLowerCase();
        if (status != _statusFilter) return false;
      }
      return true;
    }).toList();
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

  String _formatMoney(dynamic value) {
    final amount = value is num ? value : int.tryParse(value?.toString() ?? '') ?? 0;
    return amount.toStringAsFixed(0).replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (match) => '.');
  }

  String _formatDate(String? iso) {
    if (iso == null || iso.isEmpty) return '—';
    final t = DateTime.tryParse(iso);
    if (t == null) return '—';
    return '${t.day}/${t.month}/${t.year}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Đơn hàng'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: Container(
        color: const Color(0xFFFAF1EB),
        child: RefreshIndicator(
          onRefresh: () => _loadOrders(page: _page),
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      children: [
                        Padding(
                          padding: const EdgeInsets.all(24),
                          child: Text(_error!, style: const TextStyle(color: Colors.red)),
                        ),
                      ],
                    )
                  : _orders.isEmpty
                      ? ListView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.all(24),
                          children: [
                            const SizedBox(height: 40),
                            const Icon(Icons.receipt_long_outlined, size: 72, color: Colors.grey),
                            const SizedBox(height: 24),
                            const Text('Bạn chưa có đơn hàng nào.', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 12),
                            const Text('Mua sắm ngay để tạo đơn hàng đầu tiên.', style: TextStyle(color: Colors.grey)),
                          ],
                        )
                      : ListView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.all(16),
                          children: [
                            _buildSearchSection(),
                            const SizedBox(height: 16),
                            ..._filteredOrders.map((order) => _buildOrderCard(context, order)).toList(),
                            const SizedBox(height: 16),
                            _buildPagination(),
                          ],
                        ),
        ),
      ),
    );
  }

  Widget _buildSearchSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          decoration: const InputDecoration(
            hintText: 'Tìm mã đơn hoặc sản phẩm...',
            prefixIcon: Icon(Icons.search_outlined),
            border: OutlineInputBorder(),
            filled: true,
            fillColor: Colors.white,
          ),
          onChanged: (value) => setState(() => _search = value),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
          child: Row(
            children: [
              const Text('Trạng thái:', style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(width: 12),
              Expanded(
                child: DropdownButton<String>(
                  value: _statusFilter,
                  isExpanded: true,
                  underline: const SizedBox.shrink(),
                  items: const [
                    DropdownMenuItem(value: 'all', child: Text('Tất cả')),
                    DropdownMenuItem(value: 'pending', child: Text('Chờ xác nhận')),
                    DropdownMenuItem(value: 'processing', child: Text('Đã xác nhận')),
                    DropdownMenuItem(value: 'paid', child: Text('Đang chuẩn bị')),
                    DropdownMenuItem(value: 'shipped', child: Text('Đang giao')),
                    DropdownMenuItem(value: 'delivered', child: Text('Đã giao')),
                    DropdownMenuItem(value: 'completed', child: Text('Hoàn thành')),
                    DropdownMenuItem(value: 'returned', child: Text('Hoàn trả')),
                    DropdownMenuItem(value: 'cancelled', child: Text('Đã hủy')),
                  ],
                  onChanged: (value) {
                    if (value != null) {
                      setState(() => _statusFilter = value);
                    }
                  },
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildOrderCard(BuildContext context, dynamic order) {
    final status = (order['status'] ?? '').toString().toLowerCase();
    final meta = _statusMeta(status);
    final items = (order['items'] as List<dynamic>?) ?? [];
    final summary = items
        .map((item) {
          if (item is Map<String, dynamic>) {
            return (item['product_name_snapshot'] ?? item['product']?['name'] ?? '').toString();
          }
          return '';
        })
        .where((text) => text.isNotEmpty)
        .join(', ');

    final totalText = _formatMoney(order['total_amount']);
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () {
          final id = order['id'];
          if (id is int) {
            Navigator.push(context, MaterialPageRoute(builder: (_) => OrderDetailScreen(orderId: id))).then((_) {
              _loadOrders(page: _page);
            });
          }
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      order['order_code'] ?? 'Đơn hàng #${order['id'] ?? ''}',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: Color.fromRGBO(
                        ((meta['color'] as Color).r).round(),
                        ((meta['color'] as Color).g).round(),
                        ((meta['color'] as Color).b).round(),
                        0.12,
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      meta['label'] as String,
                      style: TextStyle(color: meta['color'] as Color, fontWeight: FontWeight.w700, fontSize: 12),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(summary.isEmpty ? 'Không có tên sản phẩm' : summary, maxLines: 2, overflow: TextOverflow.ellipsis),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('${items.length} sản phẩm', style: const TextStyle(color: Colors.grey)),
                  Text('${_formatDate(order['created_at']?.toString())}', style: const TextStyle(color: Colors.grey)),
                ],
              ),
              const SizedBox(height: 12),
              Text('${totalText}đ', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPagination() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        IconButton(
          onPressed: _page > 1 ? () => _loadOrders(page: _page - 1) : null,
          icon: const Icon(Icons.chevron_left),
        ),
        Text('Trang $_page / $_lastPage'),
        IconButton(
          onPressed: _page < _lastPage ? () => _loadOrders(page: _page + 1) : null,
          icon: const Icon(Icons.chevron_right),
        ),
      ],
    );
  }
}
