import 'package:flutter/material.dart';

import '../../../services/order_service.dart';
import '../../../utils/network_utils.dart';
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
  bool _showSearch = false;

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
    final amount = value is num
        ? value.toDouble()
        : double.tryParse(value?.toString() ?? '') ?? 0.0;
    return amount.toStringAsFixed(0).replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (match) => '.');
  }

  String _resolveOrderImageUrl(dynamic item) {
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
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
        title: Row(
          children: [
            const Text('Đơn hàng'),
            const Spacer(),
            IconButton(
              icon: const Icon(Icons.search_outlined),
              onPressed: () => setState(() => _showSearch = true),
            ),
          ],
        ),
      ),
      body: Container(
        color: const Color(0xFFFFFFFF),
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
                                if (_showSearch) _buildSearchBar() else const SizedBox.shrink(),
                                const SizedBox(height: 12),
                                _buildStatusChips(),
                                const SizedBox(height: 12),
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
        // legacy: kept for compatibility; use _buildSearchBar when shown
        const SizedBox.shrink(),
      ],
    );
  }

  Widget _buildSearchBar() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Container(
                height: 48,
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
                child: TextField(
                  autofocus: true,
                  decoration: InputDecoration(
                    hintText: 'Tìm mã đơn hoặc sản phẩm...',
                    prefixIcon: const Icon(Icons.search_outlined),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  onChanged: (value) => setState(() => _search = value),
                ),
              ),
            ),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: () => setState(() {
                _showSearch = false;
                _search = '';
              }),
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
                child: const Icon(Icons.close, size: 20),
              ),
            )
          ],
        ),
        const SizedBox(height: 12),
        const SizedBox.shrink(),
      ],
    );
  }

  Widget _buildStatusChips() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
      child: Row(
        children: [
          const Text('Trạng thái:', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(width: 12),
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _statusChip('all', 'Tất cả'),
                  const SizedBox(width: 8),
                  _statusChip('pending', 'Chờ xác nhận'),
                  const SizedBox(width: 8),
                  _statusChip('processing', 'Đã xác nhận'),
                  const SizedBox(width: 8),
                  _statusChip('paid', 'Đang chuẩn bị'),
                  const SizedBox(width: 8),
                  _statusChip('shipped', 'Đang giao'),
                  const SizedBox(width: 8),
                  _statusChip('delivered', 'Đã giao'),
                  const SizedBox(width: 8),
                  _statusChip('completed', 'Hoàn thành'),
                  const SizedBox(width: 8),
                  _statusChip('returned', 'Hoàn trả'),
                  const SizedBox(width: 8),
                  _statusChip('cancelled', 'Đã hủy'),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _statusChip(String value, String label) {
    final selected = _statusFilter == value;
    return ChoiceChip(
      label: Text(label, style: TextStyle(color: selected ? Colors.white : Colors.black, fontSize: 13)),
      selected: selected,
      onSelected: (_) => setState(() => _statusFilter = value),
      selectedColor: Colors.orange,
      backgroundColor: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
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
  final statusColor = meta['color'] as Color? ?? Colors.grey;

  return Card(
    color: const Color(0xFFFFFFFF),
    elevation: 0,
    // 1. Thêm viền ngoài (BorderSide) cho Card tại đây
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(8), // Tăng lên 8 nhìn sẽ mượt mà hơn
      side: BorderSide(
        color: Colors.grey.shade200, // Màu viền nhẹ nhàng, tinh tế
        width: 1,
      ),
    ),
    margin: const EdgeInsets.symmetric(vertical: 8),
    child: InkWell(
      // 2. Đồng bộ bo góc với Card để hiệu ứng gợn sóng không bị lem ra ngoài
      borderRadius: BorderRadius.circular(8),
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
              crossAxisAlignment: CrossAxisAlignment.center, // Căn giữa theo chiều dọc để cân bằng với Tag trạng thái
              children: [
                Expanded(
                  child: Text(
                    order['order_code'] ?? 'Đơn hàng #${order['id'] ?? ''}',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
                // 3. Phần hiển thị trạng thái được thiết kế lại cao cấp hơn
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    // Lấy chính màu trạng thái làm nền mờ (12% opacity)
                    color: statusColor.withValues(alpha: 0.12),
                    // Giảm bo góc từ viên thuốc (12) xuống dạng Tag hiện đại (6)
                    borderRadius: BorderRadius.circular(6), 
                  ),
                  child: Text(
                    meta['label'] as String? ?? 'Không rõ',
                    style: TextStyle(
                      color: statusColor, 
                      fontWeight: FontWeight.w600, // Chữ thanh thoát, không bị quá dày dính vào nhau
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // Hiển thị ảnh chính + badge số lượng
            Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Stack(
                    children: [
                      Container(
                        width: 100,
                        height: 100,
                        color: Colors.grey.shade200,
                        child: (() {
                          if (items.isNotEmpty) {
                            final first = items.first;
                            final url = _resolveOrderImageUrl(first);
                            if (url.isNotEmpty) {
                              return Image.network(
                                url, 
                                width: 100, 
                                height: 100, 
                                fit: BoxFit.cover, 
                                errorBuilder: (_, __, ___) => const SizedBox.shrink()
                              );
                            }
                          }
                          return const Icon(Icons.image_not_supported, color: Colors.grey, size: 40);
                        })(),
                      ),
                      if (items.length > 1)
                        Positioned(
                          right: 6,
                          top: 6,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.7), 
                              borderRadius: BorderRadius.circular(16)
                            ),
                            child: Text('+${items.length - 1}', style: const TextStyle(color: Colors.white, fontSize: 12)),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        summary.isEmpty ? 'Không có tên sản phẩm' : summary,
                         // Giới hạn dòng tránh làm vỡ giao diện card
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '${items.length} sản phẩm · ${_formatDate(order['created_at']?.toString())}', 
                        style: const TextStyle(color: Colors.grey, fontSize: 13)
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('${totalText}đ', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.red)),
                          TextButton(
                            onPressed: () {
                              final id = order['id'];
                              if (id is int) {
                                Navigator.push(context, MaterialPageRoute(builder: (_) => OrderDetailScreen(orderId: id))).then((_) {
                                  _loadOrders(page: _page);
                                });
                              }
                            },
                            style: TextButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            child: const Text('Xem chi tiết', style: TextStyle(color: Colors.black54)),
                          )
                        ],
                      ),
                    ],
                  ),
                )
              ],
            ),
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
