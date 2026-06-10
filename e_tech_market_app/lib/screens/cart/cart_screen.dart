import 'package:flutter/material.dart';

import '../../services/cart_service.dart';
import '../products/product_detail_screen.dart';
import '../checkout/checkout_screen.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  CartState _cart = CartState.empty();
  bool _loading = true;
  bool _updating = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadCart();
  }

  Future<void> _loadCart() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final cart = await CartService.fetchCart();
      if (!mounted) return;
      setState(() {
        _cart = cart;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _runCartAction(Future<CartState> Function() action) async {
    if (_updating) return;
    setState(() {
      _updating = true;
      _error = null;
    });
    try {
      final cart = await action();
      if (!mounted) return;
      setState(() => _cart = cart);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
    } finally {
      if (mounted) setState(() => _updating = false);
    }
  }

  void _openProduct(CartItem item) {
    if (item.slug.isEmpty) return;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ProductDetailScreen(
          slug: item.slug,
          variantId: item.variantId?.toString(),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    const accent = Color(0xFFF26522);
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.surface,
        foregroundColor: Theme.of(context).colorScheme.onSurface,
        elevation: 0,
        title: const Text(
          'Giỏ hàng',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
        actions: [
          if (_cart.items.isNotEmpty)
            TextButton.icon(
              onPressed: _updating
                  ? null
                  : () => _runCartAction(() => CartService.clearCart(_cart)),
              icon: const Icon(Icons.delete_outline, size: 18),
              label: const Text('Xóa tất cả'),
              style: TextButton.styleFrom(foregroundColor: accent),
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: accent))
          : _error != null
              ? _buildError()
              : _cart.items.isEmpty
                  ? _buildEmpty()
                  : _buildCartContent(),
      bottomNavigationBar:
          (!_loading && _error == null && _cart.items.isNotEmpty)
              ? _buildCheckoutBar()
              : null,
    );
  }

  Widget _buildError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.remove_shopping_cart,
              size: 64, 
              color: Colors.grey.shade400,
            ),
            const SizedBox(height: 12),
            Text(
              _error!,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Color(0xFF475569)),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadCart,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFF26522),
                foregroundColor: Colors.white,
              ),
              child: const Text('Thử lại'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 84,
              height: 84,
              decoration: const BoxDecoration(
                color: Color(0xFFFFEDD5),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.shopping_bag_outlined,
                  size: 40, color: Color(0xFFF26522)),
            ),
            const SizedBox(height: 18),
            const Text(
              'Giỏ hàng của bạn đang trống',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            const Text(
              'Hãy thêm sản phẩm vào giỏ hàng để bắt đầu trải nghiệm mua sắm tại E-Tech Market.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Color(0xFF64748B), height: 1.4),
            ),
            const SizedBox(height: 18),
            OutlinedButton.icon(
              onPressed: () => Navigator.of(context).pop(),
              icon: const Icon(Icons.arrow_back),
              label: const Text('Quay lại trang chủ'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCartContent() {
    return RefreshIndicator(
      onRefresh: _loadCart,
      color: const Color(0xFFF26522),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 118),
        children: [
          Row(
            children: [
              Text(
                '${_cart.totalQuantity} sản phẩm',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurface,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const Spacer(),
              if (_updating)
                const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
            ],
          ),
          const SizedBox(height: 10),
          ..._cart.items.map(_buildCartItem),
        ],
      ),
    );
  }

  Widget _buildCartItem(CartItem item) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Theme.of(context).colorScheme.outline, width: 0.5),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          InkWell(
            onTap: () => _openProduct(item),
            borderRadius: BorderRadius.circular(10),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Container(
                width: 100,
                height: 100,
                color: const Color(0xFFF1F5F9),
                child: item.imageUrl == null
                    ? const Icon(Icons.devices_other,
                        color: Color(0xFF94A3B8), size: 30)
                    : Image.network(
                        item.imageUrl!,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const Icon(
                          Icons.devices_other,
                          color: Color(0xFF94A3B8),
                        ),
                      ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                InkWell(
                  onTap: () => _openProduct(item),
                  child: Text(
                    item.name,
                    style:  TextStyle(
                      fontWeight: FontWeight.w800,
                      color: Theme.of(context).colorScheme.onSurface,
                      height: 1.25,
                    ),
                  ),
                ),
                if ((item.variantLabel ?? '').isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    item.variantLabel!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurface),
                  ),
                ],
                const SizedBox(height: 8),
                Text(
                  formatCurrency(item.unitPrice),
                  style: const TextStyle(
                    color: Color(0xFFF26522),
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    _qtyButton(
                      icon: Icons.remove,
                      enabled: item.quantity > 1 && !_updating,
                      onTap: () => _runCartAction(
                        () => CartService.updateItemQuantity(
                          productId: item.productId,
                          quantity: item.quantity - 1,
                        ),
                      ),
                    ),
                    SizedBox(
                      width: 42,
                      child: Text(
                        '${item.quantity}',
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                    ),
                    _qtyButton(
                      icon: Icons.add,
                      enabled: !_updating,
                      onTap: () => _runCartAction(
                        () => CartService.updateItemQuantity(
                          productId: item.productId,
                          quantity: item.quantity + 1,
                        ),
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      onPressed: _updating
                          ? null
                          : () => _runCartAction(
                                () => CartService.removeItem(
                                  productId: item.productId,
                                ),
                              ),
                      icon: const Icon(Icons.delete_outline),
                      color: const Color(0xFFEF4444),
                      tooltip: 'Xóa sản phẩm',
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _qtyButton({
    required IconData icon,
    required bool enabled,
    required VoidCallback onTap,
  }) {
    return SizedBox(
      width: 34,
      height: 34,
      child: OutlinedButton(
        onPressed: enabled ? onTap : null,
        style: OutlinedButton.styleFrom(
          padding: EdgeInsets.zero,
          side: const BorderSide(color: Color(0xFFE2E8F0)),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
        child: Icon(icon, size: 16),
      ),
    );
  }

  Widget _buildCheckoutBar() {
    return SafeArea(
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          border: Border(top: BorderSide(color: Theme.of(context).colorScheme.outline, width: 0.5)),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Tổng tiền',
                    style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                  ),
                  Text(
                    formatCurrency(_cart.totalPrice),
                    style: const TextStyle(
                      color: Color(0xFFF26522),
                      fontWeight: FontWeight.w900,
                      fontSize: 18,
                    ),
                  ),
                ],
              ),
            ),
            ElevatedButton(
              onPressed: _updating
                  ? null
                  : () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const CheckoutScreen(),
                        ),
                      ).then((_) => _loadCart());
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFF26522),
                foregroundColor: Colors.white,
                padding:
                    const EdgeInsets.symmetric(horizontal: 22, vertical: 13),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              child: const Text(
                'Thanh toán',
                style: TextStyle(fontWeight: FontWeight.w800),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
