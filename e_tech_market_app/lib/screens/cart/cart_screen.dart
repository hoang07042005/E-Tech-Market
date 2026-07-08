import 'package:flutter/material.dart';

import '../../services/cart_service.dart';
import '../../utils/translation.dart';
import '../products/product_detail_screen.dart';
import '../checkout/checkout_screen.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  CartState _cart = CartState.empty();
  Set<int> _selectedProductIds = {};
  bool _loading = true;
  bool _updating = false;
  String? _error;

  List<CartItem> get _selectedItems =>
      _cart.items.where((item) => _selectedProductIds.contains(item.productId)).toList();

  double get _selectedTotalPrice =>
      _selectedItems.fold(0.0, (sum, item) => sum + item.lineTotal);

  bool get _allSelected =>
      _cart.items.isNotEmpty && _selectedProductIds.length == _cart.items.length;

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
      final itemIds = cart.items.map((item) => item.productId).toSet();
      final selectedIds = _selectedProductIds.isEmpty
          ? itemIds
          : _selectedProductIds.intersection(itemIds);
      if (!mounted) return;
      setState(() {
        _cart = cart;
        _selectedProductIds = selectedIds;
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
      setState(() {
        _cart = cart;
        _selectedProductIds = _selectedProductIds
            .intersection(cart.items.map((item) => item.productId).toSet());
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
    } finally {
      if (mounted) setState(() => _updating = false);
    }
  }

  void _toggleSelectAll(bool selected) {
    setState(() {
      _selectedProductIds = selected
          ? _cart.items.map((item) => item.productId).toSet()
          : <int>{};
    });
  }

  void _toggleItemSelection(int productId, bool selected) {
    setState(() {
      if (selected) {
        _selectedProductIds.add(productId);
      } else {
        _selectedProductIds.remove(productId);
      }
    });
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
        title: Text(
          Trans.cartTitle,
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
        actions: [
          if (_cart.items.isNotEmpty)
            TextButton.icon(
              onPressed: _updating
                  ? null
                  : () => _runCartAction(() => CartService.clearCart(_cart)),
              label: Text(Trans.clearAll),
              style: TextButton.styleFrom(foregroundColor: accent),
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: const Color(0xFFF26522)))
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
                '(${_cart.totalQuantity}) sản phẩm',
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
          Row(
            children: [
              GestureDetector(
                onTap: _updating ? null : () => _toggleSelectAll(!_allSelected),
                child: Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    color: _allSelected
                        ? const Color(0xFFF26522)
                        : Colors.white,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: _allSelected
                          ? const Color(0xFFF26522)
                          : Colors.grey.shade400,
                      width: 1.5,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.08),
                        blurRadius: 4,
                      ),
                    ],
                  ),
                  child: _allSelected
                      ? const Icon(Icons.check, size: 14, color: Colors.white)
                      : const SizedBox.shrink(),
                ),
              ),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: _updating ? null : () => _toggleSelectAll(!_allSelected),
                child: Text(
                  'Chọn tất cả',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                ),
              ),
              const Spacer(),
              Text(
                '${_selectedItems.length} / ${_cart.items.length} đã chọn',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                  fontSize: 12,
                ),
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
    final selected = _selectedProductIds.contains(item.productId);
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Theme.of(context).colorScheme.outline, width: 0.15),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Ảnh + overlay checkbox góc trên trái ──
          SizedBox(
            width: 88,
            height: 88,
            child: Stack(
              children: [
                // Ảnh sản phẩm
                GestureDetector(
                  onTap: () => _openProduct(item),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      width: 88,
                      height: 88,
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
                // Checkbox overlay – góc trên trái
                Positioned(
                  top: 4,
                  left: 4,
                  child: GestureDetector(
                    onTap: _updating
                        ? null
                        : () => _toggleItemSelection(item.productId, !selected),
                    child: Container(
                      width: 22,
                      height: 22,
                      decoration: BoxDecoration(
                        color: selected
                            ? const Color(0xFFF26522)
                            : Colors.white.withOpacity(0.9),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: selected
                              ? const Color(0xFFF26522)
                              : Colors.grey.shade400,
                          width: 1.5,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.15),
                            blurRadius: 4,
                          ),
                        ],
                      ),
                      child: selected
                          ? const Icon(Icons.check,
                              size: 13, color: Colors.white)
                          : const SizedBox.shrink(),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          // ── Nội dung bên phải ──
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Tên sản phẩm
                Text(
                  item.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: Theme.of(context).colorScheme.onSurface,
                    height: 1.35,
                  ),
                ),
                // Màu · Phiên bản (giống web)
                if (item.variantColor != null || item.variantConfig != null || (item.variantLabel ?? '').isNotEmpty) ...[
                  const SizedBox(height: 5),
                  _buildVariantRow(item),
                ],
                const SizedBox(height: 8),
                // Giá
                Text(
                  '${formatCurrency(item.unitPrice)} đ',
                  style: const TextStyle(
                    color: Color(0xFFF26522),
                    fontWeight: FontWeight.w900,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 10),
                // Stepper + nút xóa
                Row(
                  children: [
                    // Stepper tối giản theo ảnh tham chiếu
                    Container(
                      height: 36,
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.surface,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: Theme.of(context).colorScheme.outline,
                          width: 0.15,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Nút —
                          GestureDetector(
                            onTap: item.quantity > 1 && !_updating
                                ? () => _runCartAction(
                                      () => CartService.updateItemQuantity(
                                        productId: item.productId,
                                        quantity: item.quantity - 1,
                                      ),
                                    )
                                : null,
                            child: SizedBox(
                              width: 38,
                              height: 36,
                              child: Icon(
                                Icons.remove,
                                size: 16,
                                color: item.quantity > 1 && !_updating
                                    ? Theme.of(context).colorScheme.onSurface
                                    : Theme.of(context).colorScheme.outline,
                              ),
                            ),
                          ),
                          // Đường phân cách
                          Container(
                            width: 1,
                            height: 18,
                            color: Theme.of(context).colorScheme.outline,
                          ),
                          // Số lượng
                          SizedBox(
                            width: 44,
                            child: Text(
                              '${item.quantity}',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 15,
                                color: Theme.of(context).colorScheme.onSurface,
                              ),
                            ),
                          ),
                          // Đường phân cách
                          Container(
                            width: 1,
                            height: 18,
                            color: Theme.of(context).colorScheme.outline,
                          ),
                          // Nút +
                          GestureDetector(
                            onTap: !_updating
                                ? () => _runCartAction(
                                      () => CartService.updateItemQuantity(
                                        productId: item.productId,
                                        quantity: item.quantity + 1,
                                      ),
                                    )
                                : null,
                            child: SizedBox(
                              width: 38,
                              height: 36,
                              child: Icon(
                                Icons.add,
                                size: 16,
                                color: !_updating
                                    ? Theme.of(context).colorScheme.onSurface
                                    : Theme.of(context).colorScheme.outline,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Spacer(),
                    // Nút xóa
                    GestureDetector(
                      onTap: _updating
                          ? null
                          : () => _runCartAction(
                                () => CartService.removeItem(
                                    productId: item.productId),
                              ),
                      child: const Icon(
                        Icons.delete_outline,
                        size: 22,
                        color: Color(0xFFEF4444),
                      ),
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

  /// Hiển thị màu - phiên bản trên 1 dòng
  Widget _buildVariantRow(CartItem item) {
    final parts = <String>[
      if (item.variantColor != null) item.variantColor!,
      if (item.variantConfig != null) item.variantConfig!,
    ];

    final label = parts.isNotEmpty
        ? parts.join(' - ')
        : (item.variantLabel ?? '');

    return Text(
      label,
      maxLines: 2,
      overflow: TextOverflow.ellipsis,
      style: TextStyle(
        fontSize: 12,
        color: Theme.of(context).colorScheme.onSurfaceVariant,
        height: 1.4,
      ),
    );
  }

  // _qtyButton không còn được dùng nữa, stepper được inline trong _buildCartItem

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
                  Text(
                    _selectedItems.length == _cart.items.length
                        ? 'Tổng tiền'
                        : 'Tổng tiền (${_selectedItems.length} đã chọn)',
                    style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                  ),
                  Text(
                    formatCurrency(_selectedTotalPrice) + ' đ',
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
              onPressed: _updating || _selectedItems.isEmpty
                  ? null
                  : () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => CheckoutScreen(
                            selectedItems: _selectedItems,
                          ),
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
              child: Text(
                Trans.checkoutButton,
                style: TextStyle(fontWeight: FontWeight.w800),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
