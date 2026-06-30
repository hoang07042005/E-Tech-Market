import 'package:flutter/material.dart';

import '../../../services/order_service.dart';
import '../../../utils/network_utils.dart';
import '../../../utils/translation.dart';
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
  bool _isSearching = false;
  final _searchCtrl = TextEditingController();

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
        backgroundColor: Theme.of(context).colorScheme.surface,
        foregroundColor: Theme.of(context).colorScheme.onSurface,
        elevation: 0,
        title: _isSearching
            ? TextField(
                controller: _searchCtrl,
                autofocus: true,
                style: const TextStyle(fontSize: 16),
                decoration: InputDecoration(
                  hintText: 'Tìm mã đơn hàng hoặc sản phẩm...',
                  hintStyle: TextStyle(color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5)),
                  border: InputBorder.none,
                ),
                onChanged: (value) => setState(() => _search = value),
              )
            : Text(Trans.myOrders, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
        actions: [
          if (_isSearching)
            IconButton(
              icon: const Icon(Icons.close),
              onPressed: () => setState(() {
                _isSearching = false;
                _search = '';
                _searchCtrl.clear();
              }),
            )
          else
            IconButton(
              icon: const Icon(Icons.search_outlined),
              onPressed: () => setState(() => _isSearching = true),
            ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: _buildTopTabs(),
        ),
      ),
      body: Container(
        color: Theme.of(context).colorScheme.surface,
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
                            Icon(Icons.receipt_long_outlined, size: 72, color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.4)),
                            const SizedBox(height: 24),
                            Text(Trans.noOrdersYet, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 12),
                            Text(Trans.shopNowToCreateFirstOrder, style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6))),
                          ],
                        )
                      : ListView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.all(16),
                          children: [
                            const SizedBox(height: 8),
                            ..._filteredOrders.map((order) => _buildOrderCard(context, order)).toList(),
                            const SizedBox(height: 16),
                            _buildPagination(),
                          ],
                        ),
        ),
      ),
    );
  }

  Widget _buildSearchSection() => const SizedBox.shrink();

  Widget _buildTopTabs() {
    final tabs = [
      {'value': 'all', 'label': 'Tất cả'},
      {'value': 'pending', 'label': 'Chờ xác nhận'},
      {'value': 'processing', 'label': 'Chờ lấy hàng'}, // Changed from 'Đã xác nhận'
      {'value': 'shipped', 'label': 'Chờ giao hàng'}, // Changed from 'Đang giao'
      {'value': 'delivered', 'label': 'Đã giao'},
      {'value': 'completed', 'label': 'Hoàn thành'},
      {'value': 'returned', 'label': 'Hoàn trả'},
      {'value': 'cancelled', 'label': 'Đã hủy'},
    ];

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(bottom: BorderSide(color: Theme.of(context).colorScheme.outline, width: 0.2)),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: tabs.map((tab) {
            final isSelected = _statusFilter == tab['value'];
            return InkWell(
              onTap: () {
                setState(() {
                  _statusFilter = tab['value'] as String;
                  _page = 1; // Reset to page 1 when changing filter
                });
                _loadOrders(page: 1);
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(
                      color: isSelected ? const Color(0xFFF26522) : Colors.transparent,
                      width: 2,
                    ),
                  ),
                ),
                child: Text(
                  tab['label'] as String,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                    color: isSelected ? const Color(0xFFF26522) : Theme.of(context).colorScheme.onSurface,
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }



  Widget _buildOrderCard(BuildContext context, dynamic order) {
    if (order is! Map<String, dynamic>) return const SizedBox.shrink();

    final id = order['id'];
    final code = order['order_code']?.toString() ?? '#$id';
    final date = _formatDate(order['created_at']?.toString());
    // Đã sửa đổi: Sửa lỗi NetworkUtils.formatPrice không định nghĩa thành hàm _formatMoney cục bộ
    final finalPrice = _formatMoney(order['total_amount']);
    final status = (order['status'] ?? '').toString().toLowerCase();
    final meta = _statusMeta(status);

    final items = (order['items'] as List<dynamic>?) ?? [];
    final hasItems = items.isNotEmpty;
    final firstItem = hasItems ? items.first : null;

    String prodName = 'Không có sản phẩm';
    String prodImg = '';
    String prodQty = '0';

    if (firstItem is Map<String, dynamic>) {
      final product = firstItem['product'] as Map<String, dynamic>?;
      prodName = (product?['name'] ?? firstItem['product_name_snapshot'] ?? 'Sản phẩm').toString();
      final variant = firstItem['variant'] as Map<String, dynamic>?;
      final color = variant?['color']?.toString();
      if (color != null && color.isNotEmpty) {
        prodName = '$prodName ($color)';
      }
      // Đã sửa đổi: Sửa lỗi NetworkUtils.buildImage thành Image.network cục bộ dựa trên URL xử lý bằng hàm nội bộ
      prodImg = _resolveOrderImageUrl(firstItem);
      prodQty = firstItem['quantity']?.toString() ?? '1';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Theme.of(context).colorScheme.outline, width: 0.15),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 12, offset: const Offset(0, 4)),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('#$code', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: (meta['color'] as Color).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          meta['label'] as String,
                          style: TextStyle(color: meta['color'] as Color, fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(Trans.orderDateLabel(date), style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6), fontSize: 12)),
                  // const Divider(height: 24),
                  if (items.length > 1) ...[
                    // Hàng 1: Cuộn ngang ảnh sản phẩm
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: items.map((item) {
                          final imgUrl = _resolveOrderImageUrl(item);
                          if (imgUrl.isNotEmpty) {
                            return Padding(
                              padding: const EdgeInsets.only(right: 8.0),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(5),
                                child: Image.network(
                                  imgUrl,
                                  width: 64,
                                  height: 64,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => Container(color: Theme.of(context).colorScheme.surfaceContainerHighest, width: 64, height: 64, child: Icon(Icons.image_not_supported, color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.4))),
                                ),
                              ),
                            );
                          } else {
                            return Padding(
                              padding: const EdgeInsets.only(right: 8.0),
                              child: Container(
                                width: 64,
                                height: 64,
                                decoration: BoxDecoration(color: Theme.of(context).colorScheme.surfaceContainerHighest, borderRadius: BorderRadius.circular(12)),
                                child: Icon(Icons.image_not_supported, color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.4)),
                              ),
                            );
                          }
                        }).toList(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    // Hàng 2: Tất cả tên sản phẩm dạng gạch đầu dòng
                    ...items.map((item) {
                      final product = item is Map<String, dynamic> ? item['product'] as Map<String, dynamic>? : null;
                      String name = (product?['name'] ?? item['product_name_snapshot'] ?? 'Sản phẩm').toString();
                      final variant = item is Map<String, dynamic> ? item['variant'] as Map<String, dynamic>? : null;
                      final color = variant?['color']?.toString();
                      if (color != null && color.isNotEmpty) {
                        name = '$name ($color)';
                      }
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 2.0),
                        child: Text(
                          '- $name',
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      );
                    }),
                    const SizedBox(height: 4),
                    // Hàng 3: Tổng số lượng
                    Text(
                      'Tổng số lượng: ${items.fold<int>(0, (sum, item) => sum + (int.tryParse(item['quantity']?.toString() ?? '1') ?? 1))}',
                      style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6), fontSize: 13),
                    ),
                  ] else ...[
                    Row(
                      children: [
                        if (prodImg.isNotEmpty)
                          ClipRRect(
                            borderRadius: BorderRadius.circular(5),
                            child: Image.network(
                              prodImg,
                              width: 64,
                              height: 64,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Container(color: Theme.of(context).colorScheme.surfaceContainerHighest, width: 64, height: 64, child: Icon(Icons.image_not_supported, color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.4))),
                            ),
                          )
                        else
                          Container(
                            width: 64,
                            height: 64,
                            decoration: BoxDecoration(color: Theme.of(context).colorScheme.surfaceContainerHighest, borderRadius: BorderRadius.circular(12)),
                            child: Icon(Icons.image_not_supported, color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.4)),
                          ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(prodName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14), maxLines: 2, overflow: TextOverflow.ellipsis),
                              const SizedBox(height: 4),
                              Text(
                                Trans.quantityLabel(int.tryParse(prodQty) ?? 1),
                                style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6), fontSize: 13),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                  // const Divider(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Text(Trans.totalLabel, style: const TextStyle(fontSize: 13)),
                          Text('$finalPriceđ', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFF26522), fontSize: 16)),
                        ],
                      ),
                      TextButton(
                        onPressed: () {
                          if (id is int) {
                            Navigator.push(context, MaterialPageRoute(builder: (_) => OrderDetailScreen(orderId: id))).then((_) {
                              _loadOrders(page: _page);
                            });
                          }
                        },
                        style: TextButton.styleFrom(
                          backgroundColor: const Color(0xFF4F46E5),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                        ),
                        child: Text(Trans.detail, style: TextStyle(color: Theme.of(context).colorScheme.onSurface)),
                      )
                    ],
                  ),
                ],
              ),
            ),
          ],
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
        Text(Trans.pageOf(_page, _lastPage)),
        IconButton(
          onPressed: _page < _lastPage ? () => _loadOrders(page: _page + 1) : null,
          icon: const Icon(Icons.chevron_right),
        ),
      ],
    );
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }
}
