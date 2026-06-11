import 'package:flutter/material.dart';
import '../../services/wishlist_service.dart';
import '../../services/cart_service.dart';
import '../../utils/network_utils.dart';
import '../../utils/app_snackbar.dart';
import '../../utils/translation.dart';
import '../products/product_detail_screen.dart';
import '../home_screen.dart';

class WishlistScreen extends StatefulWidget {
  const WishlistScreen({super.key});

  @override
  State<WishlistScreen> createState() => _WishlistScreenState();
}

class _WishlistScreenState extends State<WishlistScreen> {
  List<dynamic> _wishlistItems = [];
  bool _isLoading = true;
  String _selectedCatId = 'all';
  final ScrollController _scrollController = ScrollController();
  bool _showBackToTop = false;

  @override
  void initState() {
    super.initState();
    _fetchWishlist();
    _scrollController.addListener(() {
      setState(() {
        _showBackToTop = _scrollController.offset > 300;
      });
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _fetchWishlist() async {
    setState(() => _isLoading = true);
    try {
      final items = await WishlistService.fetchWishlist();
      if (mounted) {
        setState(() {
          _wishlistItems = items;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        AppSnackBar.showError(context, Trans.wishlistError);
      }
    }
  }

  Future<void> _removeWishlist(int productId) async {
    final originalIndex = _wishlistItems.indexWhere((item) => item['product']?['id'] == productId);
    if (originalIndex == -1) return;

    final backupItem = _wishlistItems[originalIndex];

    setState(() {
      _wishlistItems.removeAt(originalIndex);
    });

    final status = await WishlistService.toggleWishlist(productId);
    if (status == null && mounted) {
      setState(() {
        _wishlistItems.insert(originalIndex, backupItem);
      });
      AppSnackBar.showError(context, Trans.removeFromWishlistError);
    }
  }

  Future<void> _clearAll() async {
    final ids = _wishlistItems
        .map((item) => item['product']?['id'] as int?)
        .where((id) => id != null)
        .cast<int>()
        .toList();

    setState(() {
      _wishlistItems.clear();
    });

    for (final id in ids) {
      await WishlistService.toggleWishlist(id);
    }
  }

  String _formatPrice(double price) {
    return price.toStringAsFixed(0).replaceAllMapped(
        RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]}.');
  }

  String _resolveProductImageUrl(Map<String, dynamic> product) {
    final rawMainImage = product['main_image_url']?.toString().trim();
    if (rawMainImage != null && rawMainImage.isNotEmpty) {
      return NetworkUtils.fixDeviceUrl(rawMainImage);
    }
    final images = product['images'] as List<dynamic>?;
    if (images != null && images.isNotEmpty) {
      for (var image in images) {
        final url = image['url']?.toString().trim() ?? image['image_url']?.toString().trim();
        if (url != null && url.isNotEmpty) {
          return NetworkUtils.fixDeviceUrl(url);
        }
      }
    }
    return '';
  }

  double _getDisplayPrice(Map<String, dynamic> product) {
    final variants = product['variants'] as List<dynamic>?;
    if (variants != null && variants.isNotEmpty) {
      final sortedVariants = List.from(variants);
      sortedVariants.sort((a, b) {
        final aPrice = double.tryParse(a['effective_price']?.toString() ?? '0') ?? 0;
        final bPrice = double.tryParse(b['effective_price']?.toString() ?? '0') ?? 0;
        return aPrice.compareTo(bPrice);
      });
      return double.tryParse(sortedVariants.first['effective_price']?.toString() ?? '0') ?? 0;
    }
    return double.tryParse(product['effective_price']?.toString() ?? '0') ?? 0;
  }

  List<Map<String, dynamic>> get _categoryFacets {
    final products = _wishlistItems
        .map((item) => item['product'] as Map<String, dynamic>?)
        .where((p) => p != null)
        .toList();
    final Map<String, Map<String, dynamic>> map = {};

    for (final p in products) {
      final category = p!['category'] as Map<String, dynamic>?;
      final catId = category?['id']?.toString() ?? 'other';
      final catName = (category?['name']?.toString() ?? Trans.other).trim();
      final finalName = catName.isEmpty ? Trans.other : catName;

      if (map.containsKey(catId)) {
        map[catId]!['count'] = (map[catId]!['count'] as int) + 1;
      } else {
        map[catId] = {'id': catId, 'name': finalName, 'count': 1};
      }
    }

    final facets = map.values.toList()..sort((a, b) => (a['name'] as String).compareTo(b['name'] as String));
    return [
      {'id': 'all', 'name': Trans.all, 'count': products.length},
      ...facets,
    ];
  }

  List<dynamic> get _filteredItems {
    if (_selectedCatId == 'all') return _wishlistItems;
    return _wishlistItems.where((item) {
      final product = item['product'] as Map<String, dynamic>?;
      if (product == null) return false;
      final category = product['category'] as Map<String, dynamic>?;
      if (_selectedCatId == 'other') return category?['id'] == null;
      return category?['id']?.toString() == _selectedCatId;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface, // Khôi phục màu nền gốc
      appBar: AppBar(
        title: Text(Trans.myWishlist, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: Theme.of(context).colorScheme.surface,
        foregroundColor: Theme.of(context).colorScheme.onSurface,
        elevation: 1,
      ),
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 300),
        child: _isLoading
            ? const Center(child: CircularProgressIndicator(color: Color(0xFFF26522)))
            : _wishlistItems.isEmpty
                ? _buildEmptyState()
                : _buildContent(),
      ),
      floatingActionButton: _showBackToTop
          ? FloatingActionButton(
              onPressed: () => _scrollController.animateTo(0, duration: const Duration(milliseconds: 500), curve: Curves.easeInOut),
              backgroundColor: const Color(0xFFF26522),
              mini: true,
              child: const Icon(Icons.arrow_upward, color: Colors.white),
            )
          : null,
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.favorite_border, size: 80, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text(
              Trans.noProductsWishlist,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Color(0xFF64748B), fontSize: 15, height: 1.5),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () {
                Navigator.pushAndRemoveUntil(
                  context,
                  MaterialPageRoute(builder: (context) => const HomeScreen()),
                  (route) => false,
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFF26522),
                foregroundColor: Colors.white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: Text(Trans.continueShoppingButton, style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent() {
    final filtered = _filteredItems;

    return CustomScrollView(
      controller: _scrollController,
      physics: const AlwaysScrollableScrollPhysics(),
      slivers: [
        // Header Info + Clear Button
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // FIX LỖI OVERFLOW: Bọc cột chữ vào Expanded để tự co giãn diện tích khi nút bên cạnh chiếm không gian
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        Trans.wishlistTitle, 
                        style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)
                      ),
                      const SizedBox(height: 4),
                      RichText(
                        text: TextSpan(
                          style: const TextStyle(color: Color(0xFF64748B), fontSize: 14),
                          children: [
                            TextSpan(text: Trans.youHave),
                            TextSpan(text: ' ${_wishlistItems.length} ', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                            TextSpan(text: Trans.productsSavedCount(_wishlistItems.length)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8), // Khoảng cách nhỏ an toàn giữa chữ và nút
                OutlinedButton.icon(
                  onPressed: () => _showClearAllConfirm(),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFFEF4444),
                    side: const BorderSide(color: Color(0xFFEF4444)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4), // Thu nhỏ padding một chút để vừa máy nhỏ
                  ),
                  icon: const Icon(Icons.delete_outline, size: 18),
                  label: Text(Trans.deleteAllProducts, style: const TextStyle(fontSize: 12)),
                )
              ],
            ),
          ),
        ),

        // Promo Banner
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(colors: [Theme.of(context).colorScheme.onSurface.withOpacity(0.1), Theme.of(context).colorScheme.primary.withOpacity(0.05)]),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFFDBA74).withOpacity(0.5)),
              ),
              child: Row(
                children: [
                  Icon(Icons.local_offer, color: Theme.of(context).colorScheme.primary),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(Trans.todaysDeal, style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF9A3412))),
                        const SizedBox(height: 4),
                        Text(Trans.extraDiscountWishlist, style: const TextStyle(fontSize: 13, color: Color(0xFFC2410C))),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),

        // Filter Category Chips
        SliverToBoxAdapter(
          child: Container(
            height: 50,
            margin: const EdgeInsets.only(top: 16, bottom: 4),
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              scrollDirection: Axis.horizontal,
              itemCount: _categoryFacets.length,
              itemBuilder: (context, index) {
                final facet = _categoryFacets[index];
                final isSelected = _selectedCatId == facet['id'];
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text('${facet['name']} (${facet['count']})'),
                    selected: isSelected,
                    onSelected: (selected) {
                      if (selected) setState(() => _selectedCatId = facet['id'] as String);
                    },
                    selectedColor: const Color(0xFFF26522),
                    backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                    labelStyle: TextStyle(color: isSelected ? Colors.white : const Color(0xFF64748B), fontWeight: FontWeight.bold),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(5)),
                  ),
                );
              },
            ),
          ),
        ),

        // Products Grid
        filtered.isEmpty 
          ? const SliverFillRemaining(
              hasScrollBody: false,
              child: Center(
                child: Text("Không có sản phẩm nào thuộc danh mục này", style: TextStyle(color: Colors.grey)),
              ),
            )
          : SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  mainAxisSpacing: 16,
                  crossAxisSpacing: 16,
                  childAspectRatio: 0.65, // Giữ nguyên tỷ lệ card gốc của bạn
                ),
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final item = filtered[index];
                    final product = item['product'] as Map<String, dynamic>?;
                    if (product == null) return const SizedBox.shrink();

                    final productId = product['id'] as int;
                    final imageUrl = _resolveProductImageUrl(product);
                    final displayPrice = _getDisplayPrice(product);

                    return _buildGridCard(context, product, productId, imageUrl, displayPrice);
                  },
                  childCount: filtered.length,
                ),
              ),
            ),

        // Footer Card Auto Update
        SliverToBoxAdapter(
          child: Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                Text(
                  Trans.wishlistGreatCollection,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Text(
                  Trans.wishlistAutoUpdateNote,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13, height: 1.5),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pushAndRemoveUntil(
                        context,
                        MaterialPageRoute(builder: (context) => const HomeScreen()),
                        (route) => false,
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFF26522),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: Text(Trans.continueShoppingButton, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                )
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildGridCard(BuildContext context, Map<String, dynamic> product, int productId, String imageUrl, double price) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ProductDetailScreen(slug: product['slug'] ?? '', variantId: null),
          ),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface, // Khôi phục màu Card gốc
          borderRadius: BorderRadius.circular(5),
          border: Border.all(color: Theme.of(context).colorScheme.outline, width: 0.5),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image Stack
            Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(5)),
                  child: Container(
                    height: 140,
                    width: double.infinity,
                    color: Theme.of(context).colorScheme.surface,
                    child: imageUrl.isEmpty
                        ? const Icon(Icons.image, color: Color(0xFFE2E8F0), size: 40)
                        : Image.network(imageUrl, fit: BoxFit.contain),
                  ),
                ),
                Positioned(
                  top: 8,
                  right: 8,
                  child: GestureDetector(
                    onTap: () => _removeWishlist(productId),
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.surface,
                        shape: BoxShape.circle,
                        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4)],
                      ),
                      child: const Icon(Icons.delete_outline, color: Color(0xFFEF4444), size: 18),
                    ),
                  ),
                ),
              ],
            ),
            
            // Text Details & Button Content
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(10.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          (product['brand'] ?? 'TECH').toString().toUpperCase(),
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.outline),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          product['name'] ?? '',
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Theme.of(context).colorScheme.onSurface, height: 1.3),
                        ),
                      ],
                    ),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: () async {
                          try {
                            await CartService.addToCart(productId, 1);
                            if (!mounted) return;
                            AppSnackBar.showSuccess(context, Trans.addedToCartWishlist);
                          } catch (e) {
                            if (!mounted) return;
                            AppSnackBar.showError(context, Trans.addToCartErrorWishlist);
                          }
                        },
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Theme.of(context).colorScheme.primary,
                          side: BorderSide(color: Theme.of(context).colorScheme.primary),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        icon: Icon(Icons.shopping_cart_outlined, size: 16, color: Theme.of(context).colorScheme.primary),
                        label: Text(Trans.addToCartWishlistShort, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      ),
                    )
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showClearAllConfirm() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(Trans.deleteAllConfirmTitle),
        content: Text(Trans.deleteAllConfirmMessage),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(Trans.cancel),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _clearAll();
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: Text(Trans.deleteAllProducts),
          ),
        ],
      ),
    );
  }
}