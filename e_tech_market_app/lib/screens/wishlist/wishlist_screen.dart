import 'package:flutter/material.dart';
import '../../services/wishlist_service.dart';
import '../../services/cart_service.dart';
import '../../utils/network_utils.dart';
import '../../utils/app_snackbar.dart';
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

  @override
  void initState() {
    super.initState();
    _fetchWishlist();
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
        AppSnackBar.showError(context, 'Lỗi tải danh sách yêu thích');
      }
    }
  }

  Future<void> _removeWishlist(int productId, int index) async {
    // Determine actual index in the original list
    final actualIndex = _wishlistItems.indexWhere((item) => item['product_id'] == productId);
    if (actualIndex == -1) return;

    final item = _wishlistItems[actualIndex];
    setState(() {
      _wishlistItems.removeAt(actualIndex);
    });

    final status = await WishlistService.toggleWishlist(productId);
    if (status == null && mounted) {
      setState(() {
        _wishlistItems.insert(actualIndex, item);
      });
      AppSnackBar.showError(context, 'Lỗi khi xóa khỏi danh sách');
    }
  }

  Future<void> _clearAll() async {
    final ids = _wishlistItems.map((item) => item['product_id'] as int).toList();
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

  // Generate category facets for filtering
  List<Map<String, dynamic>> get _categoryFacets {
    final products = _wishlistItems.map((item) => item['product'] as Map<String, dynamic>?).where((p) => p != null).toList();
    final Map<String, Map<String, dynamic>> map = {};
    
    for (final p in products) {
      final category = p!['category'] as Map<String, dynamic>?;
      final catId = category?['id']?.toString() ?? 'other';
      final catName = (category?['name']?.toString() ?? 'Khác').trim();
      final finalName = catName.isEmpty ? 'Khác' : catName;

      if (map.containsKey(catId)) {
        map[catId]!['count'] = (map[catId]!['count'] as int) + 1;
      } else {
        map[catId] = {'id': catId, 'name': finalName, 'count': 1};
      }
    }

    final facets = map.values.toList()..sort((a, b) => (a['name'] as String).compareTo(b['name'] as String));
    return [
      {'id': 'all', 'name': 'Tất cả', 'count': products.length},
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
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Sản phẩm yêu thích', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 1,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFF26522)))
          : _wishlistItems.isEmpty
              ? _buildEmptyState()
              : _buildContent(),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.favorite_border, size: 80, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            const Text(
              'Chưa có sản phẩm yêu thích.\nHãy bấm tim ở danh sách sản phẩm để lưu lại.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Color(0xFF64748B), fontSize: 15, height: 1.5),
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
              child: const Text('Tiếp tục mua sắm', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent() {
    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Danh sách yêu thích', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                          const SizedBox(height: 4),
                          RichText(
                            text: TextSpan(
                              style: const TextStyle(color: Color(0xFF64748B), fontSize: 14),
                              children: [
                                const TextSpan(text: 'Bạn có '),
                                TextSpan(text: '${_wishlistItems.length}', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                                const TextSpan(text: ' sản phẩm được lưu trong danh sách.'),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    OutlinedButton.icon(
                      onPressed: _wishlistItems.isEmpty ? null : () => _showClearAllConfirm(),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFFEF4444),
                        side: const BorderSide(color: Color(0xFFEF4444)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      icon: const Icon(Icons.delete_outline, size: 18),
                      label: const Text('Xóa tất cả'),
                    )
                  ],
                ),
                const SizedBox(height: 16),
                
                // Promo Banner
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [Color(0xFFFFF7ED), Color(0xFFFFEDD5)]),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFFDBA74).withOpacity(0.5)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.local_offer, color: Color(0xFFEA580C)),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: const [
                            Text('Ưu đãi hôm nay', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF9A3412))),
                            SizedBox(height: 4),
                            Text('Giảm thêm 500k khi mua từ 2 sản phẩm yêu thích.', style: TextStyle(fontSize: 13, color: Color(0xFFC2410C))),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Category Chips
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: _categoryFacets.map((facet) {
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
                          labelStyle: TextStyle(color: isSelected ? Colors.white : const Color(0xFF64748B), fontWeight: FontWeight.bold),
                          backgroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                            side: BorderSide(color: isSelected ? const Color(0xFFF26522) : const Color(0xFFE2E8F0)),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ),
        ),

        // Grid of Cards
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          sliver: SliverGrid(
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: 16,
              crossAxisSpacing: 16,
              childAspectRatio: 0.65, // Adjust for mobile card height
            ),
            delegate: SliverChildBuilderDelegate(
              (context, index) {
                final filtered = _filteredItems;
                final item = filtered[index];
                final product = item['product'] as Map<String, dynamic>?;
                if (product == null) return const SizedBox.shrink();

                final productId = product['id'] as int;
                final imageUrl = _resolveProductImageUrl(product);
                final displayPrice = _getDisplayPrice(product);

                return _buildGridCard(product, productId, imageUrl, displayPrice, index);
              },
              childCount: _filteredItems.length,
            ),
          ),
        ),

        // Bottom Banner
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
                const Text(
                  'Bạn đang có một bộ sưu tập tuyệt vời!',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Các sản phẩm trong danh sách này được cập nhật giá tự động khi có chương trình giảm giá.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13, height: 1.5),
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
                    child: const Text('Tiếp tục mua sắm', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                )
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildGridCard(Map<String, dynamic> product, int productId, String imageUrl, double price, int index) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ProductDetailScreen(
              slug: product['slug'] ?? '',
              variantId: null,
            ),
          ),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFF1F5F9)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image Stack
            Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                  child: Container(
                    height: 140,
                    width: double.infinity,
                    color: Colors.white,
                    child: imageUrl.isEmpty
                        ? const Icon(Icons.image, color: Color(0xFFE2E8F0), size: 40)
                        : Image.network(imageUrl, fit: BoxFit.contain),
                  ),
                ),
                Positioned(
                  top: 8,
                  right: 8,
                  child: GestureDetector(
                    onTap: () => _removeWishlist(productId, index),
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 4)],
                      ),
                      child: const Icon(Icons.delete_outline, color: Color(0xFFEF4444), size: 18),
                    ),
                  ),
                ),
              ],
            ),
            
            // Content
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(10.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      (product['brand'] ?? 'TECH').toString().toUpperCase(),
                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF64748B)),
                    ),
                    const SizedBox(height: 4),
                    Expanded(
                      child: Text(
                        product['name'] ?? '',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF0F172A), height: 1.3),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${_formatPrice(price)} đ',
                      style: const TextStyle(color: Color(0xFFF26522), fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: () async {
                          try {
                            await CartService.addToCart(productId, 1);
                            if (!mounted) return;
                            AppSnackBar.showSuccess(context, 'Đã thêm vào giỏ hàng');
                          } catch (e) {
                            if (!mounted) return;
                            AppSnackBar.showError(context, 'Thêm vào giỏ hàng thất bại');
                          }
                        },
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFFF26522),
                          side: const BorderSide(color: Color(0xFFF26522)),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        icon: const Icon(Icons.shopping_cart_outlined, size: 16),
                        label: const Text('Thêm giỏ', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
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
        title: const Text('Xóa tất cả?'),
        content: const Text('Bạn có chắc chắn muốn xóa toàn bộ sản phẩm khỏi danh sách yêu thích?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Hủy'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _clearAll();
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Xóa tất cả'),
          ),
        ],
      ),
    );
  }
}
