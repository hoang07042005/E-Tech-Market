import 'package:flutter/material.dart';

import '../../services/cart_service.dart';
import '../../utils/translation.dart';
import '../products/product_detail_screen.dart';
import '../checkout/checkout_screen.dart';
import '../../services/products_service.dart';
import '../home_sections/product_section.dart';

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
  
  List<dynamic> _suggestedProducts = [];
  bool _suggestedLoading = true;

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
          
      // Fetch suggested products
      final productsRes = await ProductsService.fetchProducts(limit: 50, sort: 'newest');
      var prods = productsRes['data'] as List<dynamic>? ?? [];
      prods.shuffle();
      if (prods.length > 10) prods = prods.sublist(0, 10);

      if (!mounted) return;
      setState(() {
        _cart = cart;
        _selectedProductIds = selectedIds;
        _suggestedProducts = prods;
        _loading = false;
        _suggestedLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _suggestedLoading = false;
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
    return RefreshIndicator(
      onRefresh: _loadCart,
      color: const Color(0xFFF26522),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 118),
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
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
          if (!_suggestedLoading) _buildSuggestedProducts(),
        ],
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
          
          if (!_suggestedLoading) _buildSuggestedProducts(),
        ],
      ),
    );
  }

  Widget _buildSuggestedProducts() {
    if (_suggestedProducts.isEmpty) {
      return const SizedBox.shrink();
    }

    final leftItems = <dynamic>[];
    final rightItems = <dynamic>[];
    for (int i = 0; i < _suggestedProducts.length; i++) {
      if (i % 2 == 0) {
        leftItems.add(_suggestedProducts[i]);
      } else {
        rightItems.add(_suggestedProducts[i]);
      }
    }

    Widget buildCard(dynamic product) {
      return ProductCardWidget(
        product: product,
        isWished: false, 
        onTap: (variantId) {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => ProductDetailScreen(
                slug: product['slug'],
                variantId: variantId,
              ),
            ),
          );
        },
        onToggleWishlist: () {},
        onAddToCart: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => ProductDetailScreen(slug: product['slug']),
            ),
          );
        },
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 24),
          child: Row(
            children: [
              Expanded(
                child: Divider(
                  color: Theme.of(context).colorScheme.outline.withOpacity(0.4),
                  thickness: 1,
                  endIndent: 16,
                ),
              ),
              Text(
                'Có thể bạn sẽ thích',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.onSurface,
                  letterSpacing: 0.5,
                ),
              ),
              Expanded(
                child: Divider(
                  color: Theme.of(context).colorScheme.outline.withOpacity(0.4),
                  thickness: 1,
                  indent: 16,
                ),
              ),
            ],
          ),
        ),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                children: leftItems
                    .map((p) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: buildCard(p),
                        ))
                    .toList(),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                children: rightItems
                    .map((p) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: buildCard(p),
                        ))
                    .toList(),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildCartItem(CartItem item) {
    final selected = _selectedProductIds.contains(item.productId);
    
    // Nút Checkbox
    final Widget checkbox = GestureDetector(
      onTap: _updating
          ? null
          : () => _toggleItemSelection(item.productId, !selected),
      child: Container(
        width: 20,
        height: 20,
        decoration: BoxDecoration(
          color: selected ? const Color(0xFFEE4D2D) : Colors.white,
          borderRadius: BorderRadius.circular(4),
          border: Border.all(
            color: selected ? const Color(0xFFEE4D2D) : Colors.grey.shade400,
            width: 1.5,
          ),
        ),
        child: selected
            ? const Icon(Icons.check, size: 14, color: Colors.white)
            : const SizedBox.shrink(),
      ),
    );

    // Hình ảnh
    final Widget productImage = GestureDetector(
      onTap: () => _openProduct(item),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(4),
        child: Container(
          width: 86,
          height: 86,
          color: const Color(0xFFF1F5F9),
          child: item.imageUrl == null
              ? const Icon(Icons.devices_other, color: Color(0xFF94A3B8), size: 30)
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
    );

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(8),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Checkbox (canh giữa theo chiều cao của ảnh)
          Container(
            height: 86,
            alignment: Alignment.center,
            child: checkbox,
          ),
          const SizedBox(width: 8),
          productImage,
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 14,
                    color: Theme.of(context).colorScheme.onSurface,
                    height: 1.3,
                  ),
                ),
                const SizedBox(height: 3),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    if (item.variantColor != null || item.variantConfig != null || (item.variantLabel ?? '').isNotEmpty)
                      Flexible(child: _buildVariantRow(item))
                    else
                      const SizedBox(),
                    
                    // Stepper
                    Container(
                      height: 24,
                      decoration: BoxDecoration(
                        color: Colors.transparent,
                        border: Border.all(color: Theme.of(context).colorScheme.onSurface, width: 0.5),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          GestureDetector(
                            onTap: item.quantity > 1 && !_updating
                                ? () => _runCartAction(() => CartService.updateItemQuantity(
                                      productId: item.productId,
                                      quantity: item.quantity - 1,
                                    ))
                                : null,
                            child: Container(
                              width: 24,
                              height: 24,
                              color: Colors.transparent, // Trong suốt để ăn theo nền trắng của Container ngoài
                              alignment: Alignment.center,
                              child: Icon(Icons.remove, size: 14, color: item.quantity > 1 ? Theme.of(context).colorScheme.onSurface : Colors.grey[300]),
                            ),
                          ),
                          Container(width: 1, color: Colors.grey.shade300),
                          SizedBox(
                            width: 32,
                            child: Center(
                              child: Text(
                                '${item.quantity}',
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                              ),
                            ),
                          ),
                          Container(width: 1, color: Colors.grey.shade300),
                          GestureDetector(
                            onTap: !_updating
                                ? () => _runCartAction(() => CartService.updateItemQuantity(
                                      productId: item.productId,
                                      quantity: item.quantity + 1,
                                    ))
                                : null,
                            child: Container(
                              width: 24,
                              height: 24,
                              color: Colors.transparent, // Trong suốt để ăn theo nền trắng của Container ngoài
                              alignment: Alignment.center,
                              child: Icon(Icons.add, size: 14, color: Theme.of(context).colorScheme.onSurface),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '${formatCurrency(item.unitPrice)} đ',
                      style: const TextStyle(
                        color: Color(0xFFEE4D2D),
                        fontWeight: FontWeight.w500,
                        fontSize: 15,
                      ),
                    ),
                    GestureDetector(
                      onTap: _updating
                          ? null
                          : () => _runCartAction(
                                () => CartService.removeItem(productId: item.productId),
                              ),
                      child: const Icon(
                        Icons.delete_outline,
                        size: 20,
                        color: Colors.grey,
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

  Widget _buildVariantRow(CartItem item) {
    final parts = <String>[
      if (item.variantColor != null) item.variantColor!,
      if (item.variantConfig != null) item.variantConfig!,
    ];

    final label = parts.isNotEmpty
        ? parts.join(', ')
        : (item.variantLabel ?? '');

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(2),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Flexible(
            child: Text(
              label,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 10, color: Theme.of(context).colorScheme.onSurface),
            ),
          ),
        ],
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
