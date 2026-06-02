import 'dart:async';
import 'package:flutter/material.dart';

import '../../services/products_service.dart';
import '../../services/wishlist_service.dart';
import '../../utils/network_utils.dart';

class ProductsScreen extends StatefulWidget {
  final int? initialCategoryId;

  const ProductsScreen({super.key, this.initialCategoryId});

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  String _searchQuery = '';
  String _sortValue = 'default';
  bool _useCustomPrice = false;
  bool _priceTouched = false;
  double _maxPrice = 100000000;
  double _absoluteMaxPrice = 100000000;
  double _minPrice = 0;

  // IDs or names
  int? _selectedCategoryId;
  String? _selectedBrand;

  List<dynamic> _products = [];
  List<dynamic> _categories = [];
  List<String> _brands = [];
  Set<int> _expandedCategories = {};
  Set<int> _wishSet = {};
  bool _isLoading = true;

  Timer? _debounce;

  final List<String> _sortOptions = [
    'Mặc định',
    'Mới nhất',
    'Cũ nhất',
    'Giá: Thấp -> Cao',
    'Giá: Cao -> Thấp',
  ];

  @override
  void initState() {
    super.initState();
    _selectedCategoryId = widget.initialCategoryId;
    _fetchCategories();
    _fetchAbsoluteMaxPrice();
    _fetchProducts();
    _fetchWishlist();
  }

  Future<void> _fetchWishlist() async {
    final items = await WishlistService.fetchWishlist();
    if (mounted) {
      setState(() {
        _wishSet =
            items.map<int>((i) => (i['product_id'] as num).toInt()).toSet();
      });
    }
  }

  Future<void> _toggleWishlist(int productId) async {
    // Optimistic UI
    setState(() {
      if (_wishSet.contains(productId)) {
        _wishSet.remove(productId);
      } else {
        _wishSet.add(productId);
      }
    });

    final status = await WishlistService.toggleWishlist(productId);
    if (status == null && mounted) {
      // Rollback on failure
      setState(() {
        if (_wishSet.contains(productId)) {
          _wishSet.remove(productId);
        } else {
          _wishSet.add(productId);
        }
      });
    } else if (mounted) {
      setState(() {
        if (status == 'added')
          _wishSet.add(productId);
        else if (status == 'removed') _wishSet.remove(productId);
      });
    }
  }

  Future<void> _fetchAbsoluteMaxPrice() async {
    try {
      final response = await ProductsService.fetchProducts(
        page: 1,
        limit: 1,
        sort: 'price',
        order: 'desc',
      );
      final data = response['data'] as List<dynamic>? ?? [];
      if (data.isNotEmpty) {
        final p = data.first;
        if (p is Map<String, dynamic>) {
          final price = _getDisplayPrice(p);
          if (price > 0 && mounted) {
            setState(() {
              _absoluteMaxPrice = price + 1000000;
              if (!_priceTouched) {
                _maxPrice = _absoluteMaxPrice;
              }
            });
          }
        }
      }
    } catch (e) {
      // ignore and keep default
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  Future<void> _fetchCategories() async {
    try {
      final categories = await ProductsService.fetchCategories();
      if (mounted) {
        setState(() {
          _categories = categories;
        });
      }
    } catch (e) {
      // ignore
    }
  }

  Future<void> _fetchProducts() async {
    setState(() {
      _isLoading = true;
    });

    String? sortParams;
    String? orderParams;
    if (_sortValue == 'Mới nhất') {
      sortParams = 'created_at';
      orderParams = 'desc';
    } else if (_sortValue == 'Cũ nhất') {
      sortParams = 'created_at';
      orderParams = 'asc';
    } else if (_sortValue == 'Giá: Thấp -> Cao') {
      sortParams = 'price';
      orderParams = 'asc';
    } else if (_sortValue == 'Giá: Cao -> Thấp') {
      sortParams = 'price';
      orderParams = 'desc';
    }

    try {
      final response = await ProductsService.fetchProducts(
        page: 1,
        limit: 50, // Load more for now instead of pagination
        search: _searchQuery,
        sort: sortParams,
        order: orderParams,
        minPrice: (_priceTouched && _useCustomPrice) ? _minPrice : null,
        maxPrice: _priceTouched ? _maxPrice : null,
        categoryId: _selectedCategoryId?.toString(),
        brand: _selectedBrand,
      );

      final data = response['data'] as List<dynamic>? ?? [];

      if (mounted) {
        setState(() {
          _products = data;
          _extractBrands(data);
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _extractBrands(List<dynamic> productList) {
    final Set<String> brandSet = {};
    for (var p in productList) {
      final brand = p['brand']?.toString().trim();
      if (brand != null && brand.isNotEmpty) {
        brandSet.add(brand);
      }
    }
    final sortedBrands = brandSet.toList()..sort((a, b) => a.compareTo(b));
    setState(() {
      _brands = sortedBrands;
    });
  }

  void _onSearchChanged(String val) {
    setState(() => _searchQuery = val);
    if (_debounce?.isActive ?? false) _debounce!.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), () {
      _fetchProducts();
    });
  }

  void _showFilterDrawer() {
    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'Dismiss',
      transitionDuration: const Duration(milliseconds: 300),
      pageBuilder: (context, animation, secondaryAnimation) {
        return Align(
          alignment: Alignment.centerLeft,
          child: Material(
            child: Container(
              width: MediaQuery.of(context).size.width * 0.85,
              height: double.infinity,
              color: Colors.white,
              child: SafeArea(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Header
                    Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 12),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'BỘ LỌC',
                            style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 1),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close),
                            onPressed: () => Navigator.of(context).pop(),
                          ),
                        ],
                      ),
                    ),
                    const Divider(height: 1),
                    Expanded(
                      child: StatefulBuilder(builder:
                          (BuildContext context, StateSetter setModalState) {
                        return ListView(
                          padding: const EdgeInsets.all(16),
                          children: [
                            // DANH MỤC
                            const Text('DANH MỤC',
                                style: TextStyle(
                                    fontWeight: FontWeight.bold, fontSize: 14)),
                            const SizedBox(height: 12),
                            _buildAllProductsNode(setModalState),
                            ..._categories.map(
                                (c) => _buildCategoryNode(c, 0, setModalState)),

                            const SizedBox(height: 24),
                            // MỨC GIÁ
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('MỨC GIÁ',
                                    style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14)),
                                Row(
                                  children: [
                                    const Text('Nhập khoảng giá',
                                        style: TextStyle(fontSize: 12)),
                                    Checkbox(
                                      value: _useCustomPrice,
                                      activeColor: const Color(0xFFF26522),
                                      onChanged: (val) {
                                        setModalState(() {
                                          _useCustomPrice = val ?? false;
                                        });
                                        setState(() {
                                          _useCustomPrice = val ?? false;
                                        });
                                        _fetchProducts();
                                      },
                                    )
                                  ],
                                )
                              ],
                            ),
                            if (!_useCustomPrice) ...[
                              SliderTheme(
                                data: SliderTheme.of(context).copyWith(
                                  activeTrackColor: const Color(0xFFF26522),
                                  inactiveTrackColor: Colors.grey.shade300,
                                  thumbColor: const Color(0xFFF26522),
                                  overlayColor:
                                      const Color(0xFFF26522).withOpacity(0.2),
                                  trackHeight: 4.0,
                                ),
                                child: Slider(
                                  min: 0,
                                  max: _absoluteMaxPrice,
                                  value:
                                      _maxPrice.clamp(0.0, _absoluteMaxPrice),
                                  onChangeEnd: (val) => _fetchProducts(),
                                  onChanged: (val) {
                                    setModalState(() {
                                      _maxPrice = val;
                                      _priceTouched = true;
                                    });
                                    setState(() {
                                      _maxPrice = val;
                                      _priceTouched = true;
                                    });
                                  },
                                ),
                              ),
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text('0 đ',
                                      style: TextStyle(
                                          color: Colors.grey, fontSize: 12)),
                                  Text('Tối đa ${_formatPrice(_maxPrice)} đ',
                                      style: TextStyle(
                                          color: Colors.grey, fontSize: 12)),
                                ],
                              ),
                            ] else ...[
                              Row(
                                children: [
                                  Expanded(
                                    child: TextField(
                                      keyboardType: TextInputType.number,
                                      decoration: const InputDecoration(
                                        labelText: 'Từ (đ)',
                                        border: OutlineInputBorder(),
                                        contentPadding: EdgeInsets.symmetric(
                                            horizontal: 12, vertical: 8),
                                      ),
                                      onChanged: (val) {
                                        double v = double.tryParse(val) ?? 0;
                                        setModalState(() {
                                          _minPrice = v;
                                          _priceTouched = true;
                                        });
                                        setState(() {
                                          _minPrice = v;
                                          _priceTouched = true;
                                        });

                                        if (_debounce?.isActive ?? false)
                                          _debounce!.cancel();
                                        _debounce = Timer(
                                            const Duration(milliseconds: 1000),
                                            () => _fetchProducts());
                                      },
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: TextField(
                                      keyboardType: TextInputType.number,
                                      decoration: const InputDecoration(
                                        labelText: 'Đến (đ)',
                                        border: OutlineInputBorder(),
                                        contentPadding: EdgeInsets.symmetric(
                                            horizontal: 12, vertical: 8),
                                      ),
                                      onChanged: (val) {
                                        double v = double.tryParse(val) ?? 0;
                                        setModalState(() {
                                          _maxPrice = v;
                                          _priceTouched = true;
                                        });
                                        setState(() {
                                          _maxPrice = v;
                                          _priceTouched = true;
                                        });

                                        if (_debounce?.isActive ?? false)
                                          _debounce!.cancel();
                                        _debounce = Timer(
                                            const Duration(milliseconds: 1000),
                                            () => _fetchProducts());
                                      },
                                    ),
                                  ),
                                ],
                              ),
                            ],

                            const SizedBox(height: 24),
                            // HÃNG
                            const Text('HÃNG',
                                style: TextStyle(
                                    fontWeight: FontWeight.bold, fontSize: 14)),
                            const SizedBox(height: 12),
                            _brands.isEmpty
                                ? const Text('Chưa có dữ liệu hãng.',
                                    style: TextStyle(
                                        color: Colors.grey, fontSize: 12))
                                : Wrap(
                                    spacing: 8,
                                    runSpacing: 8,
                                    children: _brands
                                        .map((b) => InkWell(
                                              onTap: () {
                                                setModalState(() {
                                                  _selectedBrand =
                                                      _selectedBrand == b
                                                          ? null
                                                          : b;
                                                });
                                                setState(() {
                                                  _selectedBrand =
                                                      _selectedBrand == b
                                                          ? null
                                                          : b;
                                                });
                                                _fetchProducts();
                                              },
                                              child: Container(
                                                width: (MediaQuery.of(context)
                                                                .size
                                                                .width *
                                                            0.85 -
                                                        40) /
                                                    2, // 2 columns
                                                padding:
                                                    const EdgeInsets.symmetric(
                                                        vertical: 10),
                                                decoration: BoxDecoration(
                                                  border: Border.all(
                                                    color: _selectedBrand == b
                                                        ? const Color(
                                                            0xFFF26522)
                                                        : Colors.grey.shade300,
                                                    width: 1,
                                                  ),
                                                  borderRadius:
                                                      BorderRadius.circular(4),
                                                ),
                                                alignment: Alignment.center,
                                                child: Text(
                                                  b.toUpperCase(),
                                                  style: TextStyle(
                                                    fontSize: 12,
                                                    fontWeight: FontWeight.bold,
                                                    color: _selectedBrand == b
                                                        ? const Color(
                                                            0xFFF26522)
                                                        : Colors.black87,
                                                  ),
                                                ),
                                              ),
                                            ))
                                        .toList(),
                                  ),
                            const SizedBox(height: 20),
                          ],
                        );
                      }),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
      transitionBuilder: (context, animation, secondaryAnimation, child) {
        return SlideTransition(
          position: Tween<Offset>(
            begin: const Offset(-1, 0),
            end: Offset.zero,
          ).animate(animation),
          child: child,
        );
      },
    );
  }

  Widget _buildAllProductsNode(StateSetter setModalState) {
    final isSelected = _selectedCategoryId == null;
    return InkWell(
      onTap: () {
        setModalState(() => _selectedCategoryId = null);
        setState(() => _selectedCategoryId = null);
        _fetchProducts();
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8.0),
        child: Row(
          children: [
            Icon(
              isSelected ? Icons.check_box : Icons.check_box_outline_blank,
              color:
                  isSelected ? const Color(0xFFF26522) : Colors.grey.shade400,
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Tất cả sản phẩm',
                style: TextStyle(
                  fontSize: 14,
                  color: isSelected ? const Color(0xFFF26522) : Colors.black87,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryNode(
      Map<String, dynamic> c, int level, StateSetter setModalState) {
    final hasChildren =
        c['children'] != null && (c['children'] as List).isNotEmpty;
    final isExpanded = _expandedCategories.contains(c['id']);
    final isSelected = _selectedCategoryId == c['id'];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        InkWell(
          onTap: () {
            if (hasChildren) {
              setModalState(() {
                if (isExpanded)
                  _expandedCategories.remove(c['id']);
                else
                  _expandedCategories.add(c['id']);
              });
              setState(() {});
            } else {
              setModalState(
                  () => _selectedCategoryId = isSelected ? null : c['id']);
              setState(() => _selectedCategoryId = isSelected ? null : c['id']);
              _fetchProducts();
            }
          },
          child: Padding(
            padding: EdgeInsets.only(left: level * 16.0, top: 8, bottom: 8),
            child: Row(
              children: [
                if (!hasChildren)
                  Icon(
                    isSelected
                        ? Icons.check_box
                        : Icons.check_box_outline_blank,
                    color: isSelected
                        ? const Color(0xFFF26522)
                        : Colors.grey.shade400,
                    size: 20,
                  )
                else
                  Icon(
                    isExpanded ? Icons.folder_open : Icons.folder,
                    color: Colors.amber.shade400,
                    size: 20,
                  ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    c['name'] ?? '',
                    style: TextStyle(
                      fontSize: 14,
                      color:
                          isSelected ? const Color(0xFFF26522) : Colors.black87,
                      fontWeight:
                          hasChildren ? FontWeight.bold : FontWeight.normal,
                    ),
                  ),
                ),
                if (hasChildren)
                  Icon(isExpanded ? Icons.arrow_drop_up : Icons.arrow_drop_down,
                      color: Colors.black54),
              ],
            ),
          ),
        ),
        if (hasChildren && isExpanded)
          ...(c['children'] as List).map(
              (child) => _buildCategoryNode(child, level + 1, setModalState)),
      ],
    );
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

    final variants = product['variants'] as List<dynamic>?;
    if (variants != null && variants.isNotEmpty) {
      for (var variant in variants) {
        final url = variant['image_url']?.toString().trim();
        if (url != null && url.isNotEmpty) {
          return NetworkUtils.fixDeviceUrl(url);
        }
      }
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

  double _getDisplayPrice(Map<String, dynamic> product) {
    final variants = product['variants'] as List<dynamic>?;
    if (variants != null && variants.isNotEmpty) {
      final sortedVariants = List.from(variants);
      sortedVariants.sort((a, b) {
        final aPrice =
            double.tryParse(a['effective_price']?.toString() ?? '0') ?? 0;
        final bPrice =
            double.tryParse(b['effective_price']?.toString() ?? '0') ?? 0;
        return aPrice.compareTo(bPrice);
      });
      return double.tryParse(
              sortedVariants[0]['effective_price']?.toString() ?? '0') ??
          0.0;
    }
    return double.tryParse(product['price']?.toString() ?? '0') ?? 0.0;
  }

  double? _getDisplayOldPrice(Map<String, dynamic> product) {
    final variants = product['variants'] as List<dynamic>?;
    if (variants != null && variants.isNotEmpty) {
      final sortedVariants = List.from(variants);
      sortedVariants.sort((a, b) {
        final aPrice =
            double.tryParse(a['effective_price']?.toString() ?? '0') ?? 0;
        final bPrice =
            double.tryParse(b['effective_price']?.toString() ?? '0') ?? 0;
        return aPrice.compareTo(bPrice);
      });
      final originalPrice =
          double.tryParse(sortedVariants[0]['price']?.toString() ?? '0') ?? 0.0;
      final finalPrice = double.tryParse(
              sortedVariants[0]['effective_price']?.toString() ?? '0') ??
          0.0;
      return originalPrice > finalPrice ? originalPrice : null;
    }
    return null;
  }

  int _getDiscountPercent(Map<String, dynamic> product) {
    final oldP = _getDisplayOldPrice(product);
    if (oldP == null) return 0;
    final newP = _getDisplayPrice(product);
    return ((1 - newP / oldP) * 100).round();
  }

  bool _isNewWithinTenDays(String? createdAtStr) {
    if (createdAtStr == null) return false;
    final createdAt = DateTime.tryParse(createdAtStr);
    if (createdAt == null) return false;
    return DateTime.now().difference(createdAt).inDays <= 10;
  }

  Widget _buildProductCard(Map<String, dynamic> product) {
    final displayPrice = _getDisplayPrice(product);
    final displayOldPrice = _getDisplayOldPrice(product);
    final discountPercent = _getDiscountPercent(product);
    final isNew = _isNewWithinTenDays(product['created_at']);
    final isFeatured = product['is_featured'] == true;
    final brand = product['brand'] ?? 'TECH';
    final int productId = product['id'] ?? 0;
    final bool isLiked = _wishSet.contains(productId);

    double rating = 0;
    if (product['avg_rating'] != null) {
      rating = double.tryParse(product['avg_rating'].toString()) ?? 0;
    }

    final imageUrl = _resolveProductImageUrl(product);

    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Image and badges
          Stack(
            children: [
              ClipRRect(
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(5)),
                child: Container(
                  width: double.infinity,
                  height: 350,
                  color: Colors.white,
                  child: imageUrl.isEmpty
                      ? Center(
                          child: Icon(Icons.computer,
                              size: 80, color: Colors.grey.shade300))
                      : Image.network(
                          imageUrl,
                          width: double.infinity,
                          height: 220,
                          fit: BoxFit.contain,
                          alignment: Alignment.center,
                          loadingBuilder: (context, child, loadingProgress) {
                            if (loadingProgress == null) return child;
                            return const Center(
                                child:
                                    CircularProgressIndicator(strokeWidth: 2));
                          },
                          errorBuilder: (_, __, ___) => Center(
                            child: Icon(Icons.computer,
                                size: 80, color: Colors.grey.shade300),
                          ),
                        ),
                ),
              ),
              // Wishlist button
              Positioned(
                top: 10,
                left: 10,
                child: GestureDetector(
                  onTap: () => _toggleWishlist(productId),
                  child: CircleAvatar(
                    backgroundColor: Colors.white,
                    radius: 16,
                    child: Icon(
                      isLiked ? Icons.favorite : Icons.favorite_border,
                      size: 18,
                      color: isLiked ? Colors.red : Colors.grey.shade600,
                    ),
                  ),
                ),
              ),
              // New Badge Top Right
              if (isNew)
                Positioned(
                  top: 10,
                  right: 10,
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.green,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text('MỚI',
                        style: TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.bold)),
                  ),
                ),
              // Bottom Badges
              Positioned(
                bottom: 10,
                left: 10,
                child: Row(
                  children: [
                    if (isFeatured)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        margin: const EdgeInsets.only(right: 4),
                        decoration: BoxDecoration(
                          color: Colors.amber.shade700,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text('NỔI BẬT',
                            style: TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.bold)),
                      ),
                    if (discountPercent > 0)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.red,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text('-$discountPercent%',
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.bold)),
                      ),
                  ],
                ),
              ),
            ],
          ),

          // Content
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      brand.toString().toUpperCase(),
                      style: TextStyle(
                          color: Colors.grey.shade600,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1),
                    ),
                    Row(
                      children: List.generate(5, (index) {
                        if (index < rating.floor()) {
                          return const Icon(Icons.star,
                              size: 14, color: Colors.amber);
                        } else if (index < rating) {
                          return const Icon(Icons.star_half,
                              size: 14, color: Colors.amber);
                        } else {
                          return Icon(Icons.star,
                              size: 14, color: Colors.grey.shade300);
                        }
                      }),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  product['name'] ?? '',
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.bold, height: 1.3),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 12),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '${_formatPrice(displayPrice)} đ',
                      style: const TextStyle(
                          color: Color(0xFFF26522),
                          fontSize: 18,
                          fontWeight: FontWeight.bold),
                    ),
                    if (displayOldPrice != null &&
                        displayOldPrice > displayPrice) ...[
                      const SizedBox(width: 8),
                      Text(
                        '${_formatPrice(displayOldPrice)} đ',
                        style: const TextStyle(
                          color: Colors.grey,
                          fontSize: 14,
                          decoration: TextDecoration.lineThrough,
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  product['short_description'] ??
                      product['description'] ??
                      'Chưa có mô tả.',
                  style: TextStyle(
                      color: Colors.grey.shade600, fontSize: 13, height: 1.4),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  height: 40,
                  child: ElevatedButton(
                    onPressed: () {},
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFF26522),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    child: const Text('THÊM VÀO GIỎ',
                        style: TextStyle(
                            fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        // Header Texts
        Text(
          _selectedCategoryId != null
              ? 'SẢN PHẨM THEO DANH MỤC'
              : 'TẤT CẢ SẢN PHẨM',
          style: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.5,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Thiết bị công nghệ tuyển chọn với chất lượng chính hãng, hiệu năng ổn định và thiết kế hiện đại. Đáp ứng tốt nhu cầu học tập, làm việc, giải trí và gaming hằng ngày.',
          style: TextStyle(
            fontSize: 14,
            color: Colors.grey.shade700,
            height: 1.5,
          ),
        ),
        const SizedBox(height: 20),

        // Search
        Container(
          height: 48,
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: Colors.grey.shade300),
            borderRadius: BorderRadius.circular(4),
          ),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  decoration: const InputDecoration(
                    hintText: 'Tìm kiếm...',
                    hintStyle: TextStyle(color: Colors.grey),
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(horizontal: 16),
                  ),
                  onChanged: _onSearchChanged,
                ),
              ),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                child: Icon(Icons.search, color: Colors.grey),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Sort and Filter Row
        Row(
          children: [
            const Text(
              'SẮP XẾP:',
              style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Colors.black54,
                  fontSize: 13),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Container(
                height: 40,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border.all(color: Colors.grey.shade300),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _sortValue,
                    isExpanded: true,
                    icon: const Icon(Icons.keyboard_arrow_down, size: 20),
                    items: _sortOptions.map((String value) {
                      return DropdownMenuItem<String>(
                        value: value == 'Mặc định' ? 'default' : value,
                        child: Text(value,
                            style: const TextStyle(
                                fontSize: 13, fontWeight: FontWeight.w600)),
                      );
                    }).toList(),
                    onChanged: (String? newValue) {
                      if (newValue != null) {
                        setState(() => _sortValue = newValue);
                        _fetchProducts();
                      }
                    },
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            SizedBox(
              height: 40,
              child: OutlinedButton.icon(
                onPressed: _showFilterDrawer,
                icon: const Icon(Icons.tune, size: 18, color: Colors.black87),
                label: const Text('BỘ LỌC',
                    style: TextStyle(
                        color: Colors.black87,
                        fontWeight: FontWeight.bold,
                        fontSize: 13)),
                style: OutlinedButton.styleFrom(
                  backgroundColor: Colors.white,
                  side: BorderSide(color: Colors.grey.shade300),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(4),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),

        // Products List
        if (_isLoading)
          const Padding(
            padding: EdgeInsets.all(40.0),
            child: Center(
                child: CircularProgressIndicator(color: Color(0xFFF26522))),
          )
        else if (_products.isEmpty)
          const Padding(
            padding: EdgeInsets.all(40.0),
            child: Center(
                child: Text('Không có sản phẩm phù hợp bộ lọc của bạn.')),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _products.length,
            itemBuilder: (context, index) {
              return _buildProductCard(_products[index]);
            },
          ),
      ],
    );
  }
}
