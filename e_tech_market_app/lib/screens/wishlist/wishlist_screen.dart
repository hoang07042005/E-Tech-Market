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
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.surface,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back, color: Theme.of(context).colorScheme.onSurface),
          onPressed: () {
            Navigator.maybePop(context);
          },
        ),
        title: Text(
          'Sản phẩm yêu thích',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Theme.of(context).colorScheme.onSurface),
        ),
        centerTitle: true,
        actions: _wishlistItems.isNotEmpty
            ? [
                TextButton(
                  onPressed: () => _showClearAllConfirm(),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                  ),
                  child: const Text(
                    'Xóa tất cả',
                    style: TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.w500, fontSize: 14),
                  ),
                )
              ]
            : null,
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
        // Phần Tiêu đề Header "Chào bạn! Bạn đang có X sản phẩm..." theo đúng ảnh image_f32a81.png
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.only(left: 16, right: 16, top: 24, bottom: 4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Chào bạn!',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 24, color: Theme.of(context).colorScheme.onSurface),
                ),
                const SizedBox(height: 6),
                RichText(
                  text: TextSpan(
                    style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontSize: 14),
                    children: [
                      const TextSpan(text: 'Bạn đang có '),
                      TextSpan(
                        text: '${_wishlistItems.length} sản phẩm',
                        style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFC2410C)),
                      ),
                      const TextSpan(text: ' trong danh sách lưu trữ.'),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),

        // Banner Ưu Đãi Độc Quyền
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.only(left: 16, right: 16, top: 16),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Theme.of(context).colorScheme.outline, width: 0.15),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4))
                ],
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFEFE7),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(Icons.local_offer, color: Color(0xFFF26522), size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'ưu đãi độc quyền',
                          style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFF26522), fontSize: 12),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Giảm ngay 500.000đ khi đặt mua 2 sản phẩm từ danh sách.',
                          style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurface, height: 1.3),
                        ),
                      ],
                    ),
                  ),
                  Icon(Icons.chevron_right, color: Theme.of(context).colorScheme.onSurface, size: 18),
                ],
              ),
            ),
          ),
        ),

        // Danh sách chip phân loại danh mục động theo chiều ngang
        SliverToBoxAdapter(
          child: Container(
            height: 36,
            margin: const EdgeInsets.only(top: 20, bottom: 12),
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              scrollDirection: Axis.horizontal,
              itemCount: _categoryFacets.length,
              itemBuilder: (context, index) {
                final facet = _categoryFacets[index];
                final isSelected = _selectedCatId == facet['id'];
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: GestureDetector(
                    onTap: () {
                      setState(() => _selectedCatId = facet['id'] as String);
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: isSelected ? Colors.orange : Theme.of(context).colorScheme.surface,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(
                          color: isSelected ? Colors.transparent : Theme.of(context).colorScheme.outline,width: 0.15
                        ),
                      ),
                      child: Text(
                        '${facet['name']} (${facet['count']})',
                        style: TextStyle(
                          color: isSelected ? Colors.white : Theme.of(context).colorScheme.onSurface,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ),

        // Lưới sản phẩm GridView
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
                    childAspectRatio: 0.64,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final item = filtered[index];
                      final product = item['product'] as Map<String, dynamic>?;
                      if (product == null) return const SizedBox.shrink();

                      final productId = product['id'] as int;
                      final imageUrl = _resolveProductImageUrl(product);

                      return _buildGridCard(context, product, productId, imageUrl);
                    },
                    childCount: filtered.length,
                  ),
                ),
              ),

        // Thẻ Footer "Bộ sưu tập tuyệt vời" ở cuối trang
        SliverToBoxAdapter(
          child: Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Theme.of(context).colorScheme.outline,width: 0.15),
            ),
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: const BoxDecoration(color: Color(0xFF334155), shape: BoxShape.circle),
                  child: const Icon(Icons.star_rounded, color: Color(0xFF94A3B8), size: 24),
                ),
                const SizedBox(height: 12),
                Text(
                  Trans.wishlistGreatCollection,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 6),
                Text(
                  Trans.wishlistAutoUpdateNote,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11, height: 1.4),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  height: 44,
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
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(Trans.continueShoppingButton, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                        const SizedBox(width: 8),
                        const Icon(Icons.arrow_forward, color: Colors.white, size: 16),
                      ],
                    ),
                  ),
                )
              ],
            ),
          ),
        ),
      ],
    );
  }

  // Thẻ sản phẩm truyền dữ liệu thực
  Widget _buildGridCard(BuildContext context, Map<String, dynamic> product, int productId, String imageUrl) {
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
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Theme.of(context).colorScheme.outline, width: 0.15),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Stack(
                children: [
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
                    child: Container(
                      width: double.infinity,
                      color: Theme.of(context).colorScheme.surface,
                      padding: const EdgeInsets.all(12),
                      child: Center(
                        child: imageUrl.isEmpty
                            ? const Icon(Icons.image, color: Color(0xFFE2E8F0), size: 40)
                            : Image.network(imageUrl, fit: BoxFit.contain),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: GestureDetector(
                      onTap: () => _removeWishlist(productId),
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.surface,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.close, color: Color(0xFF64748B), size: 14),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(10.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    (product['brand'] ?? 'TECH').toString().toUpperCase(),
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    product['name'] ?? '',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Theme.of(context).colorScheme.onSurface, height: 1.3),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    height: 32,
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
                        foregroundColor: const Color(0xFFF26522),
                        side: BorderSide(color: Theme.of(context).colorScheme.surface,width: 0.15),
                        backgroundColor: const Color(0xFFFFEFE7).withOpacity(0.3),
                        padding: EdgeInsets.zero,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                      ),
                      icon: const Icon(Icons.shopping_cart_outlined, size: 14, color: Color(0xFFF26522)),
                      label: Text(Trans.addToCartWishlistShort, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFFF26522))),
                    ),
                  )
                ],
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