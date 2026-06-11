import 'package:flutter/material.dart';

import '../../../services/order_service.dart';
import '../../../utils/network_utils.dart';

class PurchasedProductsWidget extends StatefulWidget {
  const PurchasedProductsWidget({super.key});

  @override
  State<PurchasedProductsWidget> createState() => _PurchasedProductsWidgetState();
}

class _PurchasedProductsWidgetState extends State<PurchasedProductsWidget> {
  bool _loading = true;
  String? _error;

  // gom theo sản phẩm
  final List<_PurchasedProduct> _products = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      // Lấy 1-2 trang để gom đủ, tránh trang đầu chỉ có 1 phần
      // (Nếu backend có nhiều đơn, bạn có thể tăng số trang)
      const int maxPagesToFetch = 2;

      final Map<String, _PurchasedProduct> map = {};

      int page = 1;
      for (; page <= maxPagesToFetch; page++) {
        final response = await OrderService.fetchOrders(page: page);
        final data = response['data'];

        final List<dynamic> orders = data is List ? data : [];
        if (orders.isEmpty) break;

        for (final order in orders) {
          if (order is! Map<String, dynamic>) continue;
          final items = order['items'];
          if (items is! List) continue;

          for (final item in items) {
            if (item is! Map<String, dynamic>) continue;

            final product = item['product'] as Map<String, dynamic>?;
            final productId = product?['id'] ?? item['product_id'];
            final productName =
                (product?['name'] ?? item['product_name_snapshot'] ?? 'Sản phẩm').toString();

            final imageUrl = _resolveOrderItemImageUrl(item);
            final key = productId != null
                ? 'id:${productId.toString()}'
                : 'name:${productName.toLowerCase()}';

            final qty = (item['quantity'] ?? 1);
            final qtyNum = qty is num ? qty.toInt() : int.tryParse(qty.toString()) ?? 1;

            final moneyValue = item['total_price'] ?? item['price'] ?? item['unit_price'] ?? 0;
            final amount = moneyValue is num
                ? moneyValue.toDouble()
                : double.tryParse(moneyValue.toString()) ?? 0.0;

            final existing = map[key];
            if (existing == null) {
              map[key] = _PurchasedProduct(
                key: key,
                productId: productId,
                name: productName,
                imageUrl: imageUrl,
                quantity: qtyNum,
                totalAmount: amount,
              );
            } else {
              existing.quantity += qtyNum;
              existing.totalAmount += amount;

              // ưu tiên ảnh có sẵn
              if ((existing.imageUrl?.isEmpty ?? true) && imageUrl.isNotEmpty) {
                existing.imageUrl = imageUrl;
              }
            }
          }
        }
      }

      final list = map.values.toList();
      // Sắp xếp theo số lượng giảm dần, rồi theo tổng tiền
      list.sort((a, b) {
        final q = b.quantity.compareTo(a.quantity);
        if (q != 0) return q;
        return b.totalAmount.compareTo(a.totalAmount);
      });

      setState(() {
        _products
          ..clear()
          ..addAll(list);
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  String _formatMoney(dynamic value) {
    final amount = value is num
        ? value.toDouble()
        : double.tryParse(value?.toString() ?? '') ?? 0.0;
    return amount.toStringAsFixed(0).replaceAllMapped(
          RegExp(r'\B(?=(\d{3})+(?!\d))'),
          (match) => '.',
        );
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

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return _buildSection(
        child: const Padding(
          padding: EdgeInsets.symmetric(vertical: 24),
          child: Center(child: CircularProgressIndicator()),
        ),
      );
    }

    if (_error != null) {
      return _buildSection(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Text(
            _error!,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
        ),
      );
    }

    if (_products.isEmpty) {
      return _buildSection(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 24),
          child: Column(
            children: [
              Icon(Icons.shopping_bag_outlined,
                  size: 48, color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.4)),
              const SizedBox(height: 12),
              const Text(
                'Bạn chưa mua sản phẩm nào.',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
            ],
          ),
        ),
      );
    }

    return _buildSection(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(
              'Sản phẩm đã mua',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
          ),
          ..._products.take(20).map((p) => _buildProductRow(context, p)).toList(),
        ],
      ),
    );
  }

  Widget _buildSection({required Widget child}) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(3),
      child: child,
    );
  }

  Widget _buildProductRow(BuildContext context, _PurchasedProduct p) {
    final total = _formatMoney(p.totalAmount);
    return Container(
      padding: const EdgeInsets.all(5),
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: (p.imageUrl?.isNotEmpty ?? false)
                ? Image.network(
                    p.imageUrl!,
                    width: 80,
                    height: 80,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      width: 80,
                      height: 80,
                      color: Theme.of(context).colorScheme.surface,
                      child: Icon(Icons.image_not_supported,
                          color: Theme.of(context).colorScheme.onSurface),
                    ),
                  )
                : Container(
                    width: 80,
                    height: 80,
                    color: Theme.of(context).colorScheme.surface,
                    child: Icon(Icons.image_not_supported,
                        color: Theme.of(context).colorScheme.onSurface),
                  ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  p.name,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 6),
                Text(
                  'Số lượng: ${p.quantity}',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        //   Text(
        //     '${total}đ',
        //     style: TextStyle(
        //       fontWeight: FontWeight.bold,
        //       color: Theme.of(context).colorScheme.primary,
        //     ),
        //   ),
        ],
      ),
    );
  }
}

class _PurchasedProduct {
  _PurchasedProduct({
    required this.key,
    required this.productId,
    required this.name,
    required this.imageUrl,
    required this.quantity,
    required this.totalAmount,
  });

  final String key;
  final dynamic productId;
  final String name;
  String? imageUrl;
  int quantity;
  double totalAmount;
}

