import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../services/wishlist_service.dart';
import '../../utils/network_utils.dart';
import '../../utils/app_snackbar.dart';
import '../../utils/translation.dart';
import '../products/product_detail_screen.dart';
import '../home_screen.dart';
import '../blogs/blog_detail_screen.dart';
import '../videos/video_detail_screen.dart';
import '../../widgets/product_badges.dart';

class WishlistScreen extends StatefulWidget {
  const WishlistScreen({super.key});

  @override
  State<WishlistScreen> createState() => _WishlistScreenState();
}

class _WishlistScreenState extends State<WishlistScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final List<String> _tabs = const ['product', 'blog', 'video', 'news'];
  final Map<String, int> _counts = {
    'product': 0,
    'blog': 0,
    'video': 0,
    'news': 0
  };

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        setState(() {}); // trigger rebuild for count subtitle
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _updateCount(String type, int count) {
    if (_counts[type] != count) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) setState(() => _counts[type] = count);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final activeTab = _tabs[_tabController.index];
    final currentCount = _counts[activeTab] ?? 0;

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.surface,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back,
              color: Theme.of(context).colorScheme.onSurface),
          onPressed: () => Navigator.maybePop(context),
        ),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Danh sách yêu thích',
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                ),
                const SizedBox(height: 8),
                RichText(
                  text: TextSpan(
                    style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface,
                        fontSize: 14),
                    children: [
                      const TextSpan(text: 'Bạn có '),
                      TextSpan(
                        text: '$currentCount',
                        style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context).colorScheme.onSurface),
                      ),
                      const TextSpan(
                          text: ' mục được lưu trong danh sách này.'),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          TabBar(
            controller: _tabController,
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            labelPadding: const EdgeInsets.only(right: 24.0),
            dividerColor: Colors.transparent,
            labelColor: const Color(0xFFEF4444),
            unselectedLabelColor: Theme.of(context).colorScheme.onSurface,
            indicatorColor: const Color(0xFFEF4444),
            indicatorWeight: 2,
            labelStyle:
                const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
            tabs: const [
              Tab(text: 'Sản phẩm'),
              Tab(text: 'Bài viết'),
              Tab(text: 'Video'),
              Tab(text: 'Tin sản phẩm'),
            ],
          ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: _tabs
                  .map((type) => WishlistTabView(
                        type: type,
                        onCountChanged: (count) => _updateCount(type, count),
                      ))
                  .toList(),
            ),
          ),
        ],
      ),
    );
  }
}

class WishlistTabView extends StatefulWidget {
  final String type;
  final Function(int) onCountChanged;
  const WishlistTabView(
      {super.key, required this.type, required this.onCountChanged});

  @override
  State<WishlistTabView> createState() => _WishlistTabViewState();
}

class _WishlistTabViewState extends State<WishlistTabView> {
  List<dynamic> _wishlistItems = [];
  bool _isLoading = true;
  String _selectedCatId = 'all';

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    try {
      final items = await WishlistService.fetchWishlist(type: widget.type);
      if (mounted) {
        setState(() {
          _wishlistItems = items;
          _isLoading = false;
        });
        widget.onCountChanged(_wishlistItems.length);
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _removeWishlist(int id) async {
    final originalIndex = _wishlistItems.indexWhere((item) {
      if (widget.type == 'product') return item['product']?['id'] == id;
      if (widget.type == 'blog')
        return (item['blog_post'] ?? item['blogPost'])?['id'] == id;
      if (widget.type == 'video') return item['video']?['id'] == id;
      if (widget.type == 'news')
        return (item['product_news'] ?? item['productNews'])?['id'] == id;
      return false;
    });

    if (originalIndex == -1) return;
    final backupItem = _wishlistItems[originalIndex];

    setState(() {
      _wishlistItems.removeAt(originalIndex);
    });
    widget.onCountChanged(_wishlistItems.length);

    final status = await WishlistService.toggleWishlist(id, type: widget.type);
    if (status == null && mounted) {
      setState(() {
        _wishlistItems.insert(originalIndex, backupItem);
      });
      widget.onCountChanged(_wishlistItems.length);
      AppSnackBar.showError(context, Trans.removeFromWishlistError);
    }
  }

  Future<void> _clearAll() async {
    final ids = _wishlistItems
        .map((item) {
          if (widget.type == 'product') return item['product']?['id'] as int?;
          if (widget.type == 'blog')
            return (item['blog_post'] ?? item['blogPost'])?['id'] as int?;
          if (widget.type == 'video') return item['video']?['id'] as int?;
          if (widget.type == 'news')
            return (item['product_news'] ?? item['productNews'])?['id'] as int?;
          return null;
        })
        .where((id) => id != null)
        .cast<int>()
        .toList();

    setState(() => _wishlistItems.clear());
    widget.onCountChanged(0);

    for (final id in ids) {
      await WishlistService.toggleWishlist(id, type: widget.type);
    }
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
              child: Text(Trans.cancel)),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _clearAll();
            },
            style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFEF4444)),
            child:
                Text(Trans.delete, style: const TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  List<dynamic> get _filteredItems {
    if (widget.type != 'product' || _selectedCatId == 'all')
      return _wishlistItems;
    if (_selectedCatId == 'other') {
      return _wishlistItems
          .where((i) => i['product']?['category']?['id'] == null)
          .toList();
    }
    final catId = int.tryParse(_selectedCatId);
    if (catId == null) return _wishlistItems;
    return _wishlistItems
        .where((i) => i['product']?['category']?['id'] == catId)
        .toList();
  }

  List<Map<String, dynamic>> get _categoryFacets {
    if (widget.type != 'product') return [];
    final map = <String, Map<String, dynamic>>{};
    for (var item in _wishlistItems) {
      final p = item['product'];
      if (p == null) continue;
      final catId = p['category']?['id']?.toString() ?? 'other';
      final name = p['category']?['name']?.toString() ?? 'Khác';
      if (map.containsKey(catId)) {
        map[catId]!['count'] = (map[catId]!['count'] as int) + 1;
      } else {
        map[catId] = {'id': catId, 'name': name, 'count': 1};
      }
    }
    final facets = map.values.toList()
      ..sort((a, b) => (a['name'] as String).compareTo(b['name'] as String));
    return [
      {'id': 'all', 'name': 'Tất cả', 'count': _wishlistItems.length},
      ...facets
    ];
  }

  void _showFilterSheet() {
    showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (context) {
          return Container(
            padding: const EdgeInsets.only(top: 16, bottom: 24),
            height: MediaQuery.of(context).size.height * 0.7,
            decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(16))),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('PHÂN LOẠI',
                          style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                              color: Colors.grey)),
                      GestureDetector(
                          onTap: () => Navigator.pop(context),
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                                color: Theme.of(context)
                                    .colorScheme
                                    .surfaceVariant,
                                shape: BoxShape.circle),
                            child: Icon(Icons.close,
                                size: 20,
                                color: Theme.of(context).colorScheme.onSurface),
                          ))
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Expanded(
                  child: ListView.separated(
                    itemCount: _categoryFacets.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemBuilder: (context, index) {
                      final facet = _categoryFacets[index];
                      final isSelected = _selectedCatId == facet['id'];
                      return InkWell(
                        onTap: () {
                          setState(() => _selectedCatId = facet['id']);
                          Navigator.pop(context);
                        },
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 12),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? const Color(0xFFEA580C).withOpacity(0.1)
                                : Colors.transparent,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                facet['name'],
                                style: TextStyle(
                                  color: isSelected
                                      ? const Color(0xFFEA580C)
                                      : Theme.of(context).colorScheme.onSurface,
                                  fontWeight: isSelected
                                      ? FontWeight.bold
                                      : FontWeight.w500,
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: isSelected
                                      ? Theme.of(context).colorScheme.surface
                                      : Theme.of(context)
                                          .colorScheme
                                          .surfaceVariant,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  '${facet['count']}',
                                  style: TextStyle(
                                    color: isSelected
                                        ? const Color(0xFFEA580C)
                                        : Theme.of(context)
                                            .colorScheme
                                            .onSurfaceVariant,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                    margin: const EdgeInsets.symmetric(horizontal: 16),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                        color: Theme.of(context).brightness == Brightness.dark
                            ? const Color(0xFF334155)
                            : const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(12)),
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Ưu đãi hôm nay',
                              style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16)),
                          const SizedBox(height: 4),
                          const Text(
                              'Giảm thêm 500k khi mua từ 2 sản phẩm yêu thích.',
                              style: TextStyle(
                                  color: Colors.white70, fontSize: 13)),
                          const SizedBox(height: 12),
                          ElevatedButton(
                            onPressed: () => Navigator.pop(context),
                            style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.white,
                                foregroundColor: const Color(0xFF1E293B),
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(20)),
                                minimumSize: const Size(120, 36)),
                            child: const Text('Xem chi tiết',
                                style: TextStyle(
                                    fontWeight: FontWeight.bold, fontSize: 13)),
                          )
                        ]))
              ],
            ),
          );
        });
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(
          child: CircularProgressIndicator(color: Color(0xFFEA580C)));
    }
    if (_wishlistItems.isEmpty) {
      return _buildEmptyState();
    }

    final items = _filteredItems;

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                if (widget.type == 'product')
                  OutlinedButton.icon(
                    onPressed: _showFilterSheet,
                    style: OutlinedButton.styleFrom(
                        foregroundColor:
                            Theme.of(context).colorScheme.onSurface,
                        side: BorderSide(
                            color:
                                Theme.of(context).colorScheme.outlineVariant),
                        backgroundColor: Theme.of(context).colorScheme.surface,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8)),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 8)),
                    icon: const Icon(Icons.filter_alt_outlined,
                        size: 18, color: Color(0xFFEA580C)),
                    label: const Text('Bộ lọc danh mục',
                        style: TextStyle(
                            fontSize: 13, fontWeight: FontWeight.w600)),
                  )
                else
                  const SizedBox.shrink(),
                IconButton(
                  onPressed: _showClearAllConfirm,
                  icon: const Icon(Icons.delete_outline,
                      color: Color(0xFFEF4444)),
                  tooltip: 'Xóa tất cả',
                )
              ],
            ),
          ),
        ),
        if (items.isEmpty)
          SliverFillRemaining(
            hasScrollBody: false,
            child: Center(
              child: Text(
                'Không có mục nào trong danh mục này.',
                style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurfaceVariant),
              ),
            ),
          )
        else
          _buildListOrGrid(items),
        const SliverPadding(padding: EdgeInsets.only(bottom: 40)),
      ],
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.favorite_border,
              size: 80, color: Theme.of(context).colorScheme.surfaceVariant),
          const SizedBox(height: 16),
          Text(
            Trans.noProductsWishlist,
            textAlign: TextAlign.center,
            style: TextStyle(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
                fontSize: 15),
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
              backgroundColor: const Color(0xFFEA580C),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8)),
            ),
            child: Text(Trans.continueShoppingButton,
                style: const TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildListOrGrid(List<dynamic> items) {
    if (widget.type == 'product') {
      final leftItems = <dynamic>[];
      final rightItems = <dynamic>[];
      for (int i = 0; i < items.length; i++) {
        if (i % 2 == 0) {
          leftItems.add(items[i]);
        } else {
          rightItems.add(items[i]);
        }
      }

      return SliverToBoxAdapter(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  children: leftItems.map((item) {
                    final product = item['product'];
                    if (product == null) return const SizedBox.shrink();
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: _buildProductCard(product),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  children: rightItems.map((item) {
                    final product = item['product'];
                    if (product == null) return const SizedBox.shrink();
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: _buildProductCard(product),
                    );
                  }).toList(),
                ),
              ),
            ],
          ),
        ),
      );
    } else if (widget.type == 'blog' || widget.type == 'news') {
      return SliverPadding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        sliver: SliverGrid(
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisSpacing: 16,
            crossAxisSpacing: 16,
            childAspectRatio: 0.65,
          ),
          delegate: SliverChildBuilderDelegate(
            (context, index) {
              final post = widget.type == 'blog'
                  ? (items[index]['blog_post'] ?? items[index]['blogPost'])
                  : (items[index]['product_news'] ??
                      items[index]['productNews']);
              if (post == null) return const SizedBox.shrink();
              return _buildBlogCard(post);
            },
            childCount: items.length,
          ),
        ),
      );
    } else {
      // video
      return SliverPadding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        sliver: SliverGrid(
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisSpacing: 16,
            crossAxisSpacing: 16,
            childAspectRatio: 0.65,
          ),
          delegate: SliverChildBuilderDelegate(
            (context, index) {
              final video = items[index]['video'];
              if (video == null) return const SizedBox.shrink();
              return _buildVideoCard(video);
            },
            childCount: items.length,
          ),
        ),
      );
    }
  }

  Widget _buildProductCard(Map<String, dynamic> product) {
    final int productId = product['id'] as int;
    final name = product['name']?.toString() ?? '';
    final brand = product['brand']?.toString().trim();
    final description = product['description']?.toString().trim();
    final shortDescription = product['short_description']?.toString().trim();
    final excerpt = description != null && description.isNotEmpty
        ? description
        : (shortDescription != null && shortDescription.isNotEmpty
            ? shortDescription
            : Trans.defaultProductExcerpt);
    final rating =
        double.tryParse(product['avg_rating']?.toString() ?? '0') ?? 0;
    final isNew = product['is_new'] == true;

    Map<String, dynamic>? flashSaleItem;
    final flashSaleItems =
        product['flash_sale_items'] ?? product['flashSaleItems'];
    if (flashSaleItems != null && (flashSaleItems as List).isNotEmpty) {
      final now = DateTime.now();
      for (var item in flashSaleItems) {
        if (item['flash_sale'] != null) {
          final start = DateTime.tryParse(
              item['flash_sale']['start_at']?.toString().replaceAll(' ', 'T') ??
                  '');
          final end = DateTime.tryParse(
              item['flash_sale']['end_at']?.toString().replaceAll(' ', 'T') ??
                  '');
          if (start != null &&
              end != null &&
              now.isAfter(start) &&
              now.isBefore(end)) {
            final quantityLimit = (item['quantity_limit'] as num?)?.toInt();
            final soldQuantity = (item['sold_quantity'] as num?)?.toInt() ?? 0;
            final isSoldOut = quantityLimit != null &&
                quantityLimit > 0 &&
                soldQuantity >= quantityLimit;
            if (!isSoldOut) {
              flashSaleItem = item as Map<String, dynamic>?;
              break;
            }
          }
        }
      }
    }
    final isFlashSale = flashSaleItem != null;

    double displayPrice = 0;
    double? displayPriceMax;
    double? displayOldPrice;
    bool showDiscountBadge = false;
    int discountPercent = 0;

    final variants = product['variants'] as List<dynamic>? ?? [];
    final activeVariants =
        variants.where((v) => v['is_active'] != false).toList();
    final isSingleVariant = activeVariants.length == 1;

    Map<String, dynamic>? selectedVariant;

    if (activeVariants.isNotEmpty) {
      final sorted = List.from(activeVariants);
      sorted.sort((a, b) {
        final aPrice =
            double.tryParse(a['effective_price']?.toString() ?? '0') ?? 0;
        final bPrice =
            double.tryParse(b['effective_price']?.toString() ?? '0') ?? 0;
        return aPrice.compareTo(bPrice);
      });

      final lowest = sorted.first;
      final highest = sorted.last;
      selectedVariant = lowest;

      displayPrice =
          double.tryParse(lowest['effective_price']?.toString() ?? '0') ?? 0;
      final priceMax =
          double.tryParse(highest['effective_price']?.toString() ?? '0') ?? 0;
      double originalPrice =
          double.tryParse(lowest['price']?.toString() ?? '0') ?? 0;

      bool hasMultiplePrices = displayPrice != priceMax;
      showDiscountBadge = isSingleVariant;

      if (isFlashSale) {
        if (flashSaleItem!['variant_id'] != null) {
          final int flashVariantId =
              int.tryParse(flashSaleItem['variant_id'].toString()) ?? 0;
          if (flashVariantId > 0) {
            final flashVariant = activeVariants.firstWhere(
                (v) => v['id'] == flashVariantId,
                orElse: () => lowest);
            if (flashVariant != lowest) {
              selectedVariant = flashVariant;
              originalPrice =
                  double.tryParse(flashVariant['price']?.toString() ?? '0') ??
                      0;
            }
          }
        }
        displayPrice = double.tryParse(
                flashSaleItem['flash_sale_price']?.toString() ?? '0') ??
            0;
        hasMultiplePrices = false;
        showDiscountBadge = true;
      }

      final hasDiscount = displayPrice < originalPrice && showDiscountBadge;
      displayPriceMax = hasMultiplePrices ? priceMax : null;
      displayOldPrice = hasDiscount ? originalPrice : null;
      discountPercent =
          hasDiscount ? ((1 - displayPrice / originalPrice) * 100).round() : 0;
    } else {
      final originalPrice =
          double.tryParse(product['price']?.toString() ?? '0') ?? 0;
      displayPrice = originalPrice;
      if (product['discount_price'] != null) {
        displayPrice =
            double.tryParse(product['discount_price']?.toString() ?? '0') ??
                originalPrice;
      }
      showDiscountBadge = true;

      if (isFlashSale) {
        displayPrice = double.tryParse(
                flashSaleItem!['flash_sale_price']?.toString() ?? '0') ??
            0;
      }

      final hasDiscount = displayPrice < originalPrice && showDiscountBadge;
      displayOldPrice = hasDiscount ? originalPrice : null;
      discountPercent =
          hasDiscount ? ((1 - displayPrice / originalPrice) * 100).round() : 0;
    }

    final imageUrl =
        _resolveProductImageUrl(product, selectedVariant: selectedVariant);

    int? totalStock;
    if (variants.isNotEmpty) {
      totalStock = variants.fold<int>(
          0, (sum, v) => sum + ((v['stock_quantity'] as num?)?.toInt() ?? 0));
    } else {
      totalStock = (product['stock_quantity'] as num?)?.toInt();
    }

    final formatter = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ');

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
              builder: (context) => ProductDetailScreen(
                  slug: product['slug'] ?? '',
                  variantId: selectedVariant?['id']?.toString())),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
              color: Theme.of(context).colorScheme.outlineVariant, width: 1.5),
        ),
        clipBehavior: Clip.hardEdge,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            AspectRatio(
              aspectRatio: 1,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Container(
                    color: Theme.of(context).colorScheme.surface,
                    child: imageUrl.isEmpty
                        ? Center(
                            child: Icon(Icons.image,
                                color: Theme.of(context)
                                    .colorScheme
                                    .outlineVariant,
                                size: 40))
                        : Image.network(
                            imageUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Center(
                                child: Icon(Icons.image,
                                    color: Theme.of(context)
                                        .colorScheme
                                        .outlineVariant,
                                    size: 40)),
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
                          boxShadow: [
                            BoxShadow(
                                color: Colors.black.withOpacity(0.05),
                                blurRadius: 4)
                          ],
                        ),
                        child: Icon(Icons.delete_outline,
                            color:
                                Theme.of(context).colorScheme.onSurfaceVariant,
                            size: 16),
                      ),
                    ),
                  ),
                  if (discountPercent > 0 || isNew)
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: (showDiscountBadge && discountPercent > 0)
                              ? Colors.red
                              : const Color(0xFFF26522),
                          borderRadius: BorderRadius.circular(3),
                        ),
                        child: Text(
                          (showDiscountBadge && discountPercent > 0)
                              ? '-$discountPercent%'
                              : Trans.newBadge,
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.w800),
                        ),
                      ),
                    ),
                  if (isFlashSale && flashSaleItem!['flash_sale'] != null)
                    Positioned(
                      bottom: 0,
                      left: 0,
                      right: 0,
                      child: FlashSaleBanner(
                        endAt: flashSaleItem['flash_sale']['end_at'] ?? '',
                        discountPercent: discountPercent,
                      ),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(10.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          (brand == null || brand.isEmpty
                                  ? Trans.brandDefault
                                  : brand)
                              .toUpperCase(),
                          style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurfaceVariant,
                              letterSpacing: 0.5),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Row(
                        children: List.generate(
                            5,
                            (i) => Icon(Icons.star,
                                size: 8,
                                color: i < rating
                                    ? const Color(0xFFFACC15)
                                    : Theme.of(context)
                                        .colorScheme
                                        .surfaceVariant)),
                      )
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: Theme.of(context).colorScheme.onSurface,
                        height: 1.25),
                  ),
                  const SizedBox(height: 2),
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.centerLeft,
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (showDiscountBadge)
                          Text(
                            '${formatter.format(displayPrice)}',
                            style: const TextStyle(
                                color: Color(0xFFF26522),
                                fontWeight: FontWeight.w800,
                                fontSize: 11),
                          )
                        else if (displayPriceMax != null)
                          Text(
                            '${formatter.format(displayPrice)} - ${formatter.format(displayPriceMax)}',
                            style: const TextStyle(
                                color: Color(0xFFF26522),
                                fontWeight: FontWeight.w800,
                                fontSize: 11),
                          )
                        else
                          Text(
                            '${formatter.format(displayPrice)}',
                            style: const TextStyle(
                                color: Color(0xFFF26522),
                                fontWeight: FontWeight.w800,
                                fontSize: 11),
                          ),
                        if (displayOldPrice != null &&
                            displayOldPrice > displayPrice &&
                            showDiscountBadge)
                          Padding(
                            padding: const EdgeInsets.only(left: 6, bottom: 1),
                            child: Text(
                              '${formatter.format(displayOldPrice)}',
                              style: TextStyle(
                                  color: Theme.of(context)
                                      .colorScheme
                                      .onSurfaceVariant,
                                  fontSize: 9,
                                  decoration: TextDecoration.lineThrough),
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 4),
                  if (isFlashSale && flashSaleItem!['flash_sale'] != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: StockBar(
                        isFlashSale: true,
                        flashSaleSold:
                            (flashSaleItem['sold_quantity'] as num?)?.toInt(),
                        flashSaleLimit:
                            (flashSaleItem['quantity_limit'] as num?)?.toInt(),
                      ),
                    )
                  else if (totalStock != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: StockBar(
                        isFlashSale: false,
                        normalStock: totalStock,
                      ),
                    ),
                  const SizedBox(height: 2),
                  Text(
                    excerpt,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                        fontSize: 10,
                        height: 1.4),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBlogCard(Map<String, dynamic> post) {
    final imageUrl =
        NetworkUtils.fixDeviceUrl(post['thumbnail_url'] ?? post['image'] ?? '');
    final title = post['title'] ?? '';
    final createdAt = post['published_at'] ?? post['created_at'] ?? '';
    final excerpt = post['excerpt'] ?? 'Khám phá bài viết mới...';

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => BlogDetailScreen(post: post)),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
              color: Theme.of(context).colorScheme.outlineVariant, width: 1.5),
        ),
        clipBehavior: Clip.hardEdge,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                Image.network(
                  imageUrl,
                  height: 120,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    height: 120,
                    color: Theme.of(context).colorScheme.surfaceVariant,
                    child: const Icon(Icons.image_not_supported,
                        color: Colors.grey),
                  ),
                ),
                Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                          color: widget.type == 'news'
                              ? const Color(0xFFEF4444)
                              : const Color(0xFF3B82F6),
                          borderRadius: BorderRadius.circular(6)),
                      child: Text(
                          widget.type == 'news' ? 'TIN SẢN PHẨM' : 'BÀI VIẾT',
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 9,
                              fontWeight: FontWeight.bold)),
                    )),
                Positioned(
                  top: 8,
                  right: 8,
                  child: GestureDetector(
                    onTap: () => _removeWishlist(post['id']),
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.surface,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                              color: Colors.black.withOpacity(0.05),
                              blurRadius: 4)
                        ],
                      ),
                      child: Icon(Icons.delete_outline,
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                          size: 16),
                    ),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    createdAt.split('T').isNotEmpty
                        ? createdAt.split('T')[0]
                        : '',
                    style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                        fontSize: 10,
                        fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.onSurface,
                        height: 1.3),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    excerpt,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                        fontSize: 11,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                        height: 1.4),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Text('Đọc thêm',
                          style: TextStyle(
                              color: Theme.of(context).colorScheme.onSurface,
                              fontSize: 11,
                              fontWeight: FontWeight.bold)),
                      const SizedBox(width: 4),
                      Icon(Icons.arrow_forward_outlined,
                          size: 12,
                          color: Theme.of(context).colorScheme.onSurface)
                    ],
                  )
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVideoCard(Map<String, dynamic> video) {
    final title = video['title'] ?? '';
    final description = video['description']?.toString().trim();
    final shortDescription = video['short_description']?.toString().trim();
    final excerpt = description != null && description.isNotEmpty
        ? description
        : (shortDescription != null && shortDescription.isNotEmpty
            ? shortDescription
            : Trans.defaultProductExcerpt);
    final imageUrl = NetworkUtils.fixDeviceUrl(
        video['thumbnail_url'] ?? video['thumbnail'] ?? '');

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
              builder: (context) => VideoDetailScreen(videoId: video['id'])),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
              color: Theme.of(context).colorScheme.outlineVariant, width: 1.5),
        ),
        clipBehavior: Clip.hardEdge,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                Image.network(
                  imageUrl,
                  height: 120,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    height: 120,
                    color: Theme.of(context).colorScheme.surfaceVariant,
                    child: const Icon(Icons.video_library, color: Colors.grey),
                  ),
                ),
                Container(
                  height: 120,
                  width: double.infinity,
                  color: Colors.black.withOpacity(0.2),
                ),
                const Positioned.fill(
                  child: Center(
                    child: Icon(Icons.play_circle_fill,
                        color: Color(0xFFEA580C), size: 40),
                  ),
                ),
                Positioned(
                  top: 8,
                  right: 8,
                  child: GestureDetector(
                    onTap: () => _removeWishlist(video['id']),
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.surface,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                              color: Colors.black.withOpacity(0.05),
                              blurRadius: 4)
                        ],
                      ),
                      child: Icon(Icons.delete_outline,
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                          size: 16),
                    ),
                  ),
                ),
              ],
            ),
            Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                          height: 1.3,
                          color: Theme.of(context).colorScheme.onSurface),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      excerpt,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          fontSize: 11,
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                          height: 1.4),
                    ),
                    const SizedBox(height: 12),
                    Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.surface,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(
                                color: Theme.of(context)
                                    .colorScheme
                                    .outlineVariant)),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.link,
                                size: 12,
                                color: Theme.of(context)
                                    .colorScheme
                                    .onSurfaceVariant),
                            const SizedBox(width: 4),
                            Text('Video',
                                style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurfaceVariant))
                          ],
                        ))
                  ],
                )),
          ],
        ),
      ),
    );
  }

  String _resolveProductImageUrl(Map<String, dynamic> product,
      {Map<String, dynamic>? selectedVariant}) {
    if (selectedVariant != null) {
      final vImg = selectedVariant['image_url']?.toString().trim();
      if (vImg != null && vImg.isNotEmpty)
        return NetworkUtils.fixDeviceUrl(vImg);
    }
    final rawMainImage = product['main_image_url']?.toString().trim();
    if (rawMainImage != null && rawMainImage.isNotEmpty) {
      return NetworkUtils.fixDeviceUrl(rawMainImage);
    }
    final images = product['images'] as List<dynamic>?;
    if (images != null && images.isNotEmpty) {
      for (var image in images) {
        final url = image['url']?.toString().trim() ??
            image['image_url']?.toString().trim();
        if (url != null && url.isNotEmpty) {
          return NetworkUtils.fixDeviceUrl(url);
        }
      }
    }
    return '';
  }
}
