import 'dart:async';
import 'package:flutter/material.dart';

import '../../services/products_service.dart';
import '../../services/wishlist_service.dart';
import '../../services/cart_service.dart';
import '../../utils/network_utils.dart';
import '../../utils/app_snackbar.dart';
import '../../utils/translation.dart';
import '../../utils/app_dialogs.dart';
import '../../services/auth_service.dart';
import 'product_detail_screen.dart';
import '../cart/cart_screen.dart';

class ProductsScreen extends StatefulWidget {
  final int? initialCategoryId;

  const ProductsScreen({super.key, this.initialCategoryId});

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  final TextEditingController _searchController = TextEditingController();
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
  int _currentPage = 1;
  int _lastPage = 1;

  Timer? _debounce;

  final List<String> _sortOptions = [
    Trans.defaultSort,
    Trans.newest,
    Trans.oldest,
    Trans.priceAscending,
    Trans.priceDescending,
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
    _searchController.dispose();
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
    if (_sortValue == Trans.newest) {
      sortParams = 'created_at';
      orderParams = 'desc';
    } else if (_sortValue == Trans.oldest) {
      sortParams = 'created_at';
      orderParams = 'asc';
    } else if (_sortValue == Trans.priceAscending) {
      sortParams = 'price';
      orderParams = 'asc';
    } else if (_sortValue == Trans.priceDescending) {
      sortParams = 'price';
      orderParams = 'desc';
    }

    try {
      final response = await ProductsService.fetchProducts(
        page: _currentPage,
        search: _searchQuery,
        sort: sortParams,
        order: orderParams,
        minPrice: (_priceTouched && _useCustomPrice) ? _minPrice : null,
        maxPrice: _priceTouched ? _maxPrice : null,
        categoryId: _selectedCategoryId?.toString(),
        brand: _selectedBrand,
      );

      final data = response['data'] as List<dynamic>? ?? [];
      final meta = response['meta'] as Map<String, dynamic>?;
      final lastPage = meta != null ? (meta['last_page'] as int?) : (response['last_page'] as int?);

      if (mounted) {
        setState(() {
          _products = data;
          _lastPage = lastPage ?? 1;
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
    setState(() {
      _searchQuery = val;
      _currentPage = 1;
    });
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
              color: Theme.of(context).colorScheme.surface,
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
                          Text(
                            Trans.filterLabel,
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
                            Text(Trans.categories,
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
                                Text(Trans.priceRange,
                                    style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14)),
                                Row(
                                  children: [
                                    Text(Trans.enterPriceRange,
                                        style: TextStyle(fontSize: 12)),
                                    Checkbox(
                                      value: _useCustomPrice,
                                      activeColor: Color(0xFFF26522),
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
                                  activeTrackColor: Color(0xFFF26522),
                                  inactiveTrackColor: Theme.of(context).colorScheme.outline,
                                  thumbColor: Color(0xFFF26522),
                                  overlayColor:
                                      Color(0xFFF26522).withOpacity(0.2),
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
                                  Text('0 đ',
                                      style: TextStyle(
                                          color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 12)),
                                  Text('Tối đa ${_formatPrice(_maxPrice)} đ',
                                      style: TextStyle(
                                          color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 12)),
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
                            Text(Trans.brand,
                                style: TextStyle(
                                    fontWeight: FontWeight.bold, fontSize: 14)),
                            const SizedBox(height: 12),
                            _brands.isEmpty
                                ? Text('Chưa có dữ liệu hãng.',
                                    style: TextStyle(
                                        color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 12))
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
                                                        : Theme.of(context).colorScheme.outline,
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
                                                        : Theme.of(context).colorScheme.onSurface,
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
                  isSelected ? Color(0xFFF26522) : Theme.of(context).colorScheme.onSurfaceVariant,
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                Trans.allProducts,
                style: TextStyle(
                  fontSize: 14,
                  color: isSelected ? Color(0xFFF26522) : Theme.of(context).colorScheme.onSurface,
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
                        ? Color(0xFFF26522)
                        : Theme.of(context).colorScheme.onSurfaceVariant,
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
                          isSelected ? Color(0xFFF26522) : Theme.of(context).colorScheme.onSurface,
                      fontWeight:
                          hasChildren ? FontWeight.bold : FontWeight.normal,
                    ),
                  ),
                ),
                if (hasChildren)
                  Icon(isExpanded ? Icons.arrow_drop_up : Icons.arrow_drop_down,
                      color: Theme.of(context).colorScheme.onSurfaceVariant),
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

  Widget _buildPagBtn(String label, VoidCallback? onPressed, {bool isActive = false}) {
    final isDisabled = onPressed == null;
    return GestureDetector(
      onTap: onPressed,
      child: Container(
        constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        margin: const EdgeInsets.only(left: 6),
        decoration: BoxDecoration(
          color: isActive ? const Color(0xFFF26522) : (isDisabled ? Colors.grey.shade100 : Theme.of(context).colorScheme.surface),
          border: Border.all(color: isActive ? const Color(0xFFF26522) : Colors.grey.shade300),
          borderRadius: BorderRadius.circular(12),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: isActive ? Colors.white : (isDisabled ? Colors.grey : Theme.of(context).colorScheme.onSurface),
          ),
        ),
      ),
    );
  }

  List<Widget> _buildPagButtons() {
    final btns = <Widget>[];
    final maxBtns = 7;
    final half = maxBtns ~/ 2;
    int start = _currentPage - half;
    if (start < 1) start = 1;
    int end = start + maxBtns - 1;
    if (end > _lastPage) end = _lastPage;
    start = end - maxBtns + 1;
    if (start < 1) start = 1;

    // Prev button
    btns.add(_buildPagBtn('<', _currentPage > 1 ? () { setState(() => _currentPage--); _fetchProducts(); } : null));

    // First page if needed
    if (start > 1) {
      btns.add(_buildPagBtn('1', () { setState(() => _currentPage = 1); _fetchProducts(); }));
      if (start > 2) {
        btns.add(Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8),
          child: Text('…', style: TextStyle(color: Colors.grey)),
        ));
      }
    }

    // Page numbers
    for (int i = start; i <= end; i++) {
      btns.add(_buildPagBtn(i.toString(), () { setState(() => _currentPage = i); _fetchProducts(); }, isActive: i == _currentPage));
    }

    // Last page if needed
    if (end < _lastPage) {
      if (end < _lastPage - 1) {
        btns.add(Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8),
          child: Text('…', style: TextStyle(color: Colors.grey)),
        ));
      }
      btns.add(_buildPagBtn(_lastPage.toString(), () { setState(() => _currentPage = _lastPage); _fetchProducts(); }));
    }

    // Next button
    btns.add(_buildPagBtn('>', _currentPage < _lastPage ? () { setState(() => _currentPage++); _fetchProducts(); } : null));

    return btns;
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

  bool _hasMultiplePrices(Map<String, dynamic> product) {
    final variants = product['variants'] as List<dynamic>?;
    if (variants != null && variants.length > 1) {
      final sortedVariants = List.from(variants);
      sortedVariants.sort((a, b) {
        final aPrice =
            double.tryParse(a['effective_price']?.toString() ?? '0') ?? 0;
        final bPrice =
            double.tryParse(b['effective_price']?.toString() ?? '0') ?? 0;
        return aPrice.compareTo(bPrice);
      });
      final lowest = double.tryParse(
              sortedVariants[0]['effective_price']?.toString() ?? '0') ??
          0.0;
      final highest = double.tryParse(
              sortedVariants[sortedVariants.length - 1]['effective_price']
                  ?.toString() ??
                  '0') ??
          0.0;
      return lowest != highest;
    }
    return false;
  }

  double? _getMaxDisplayPrice(Map<String, dynamic> product) {
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
              sortedVariants[sortedVariants.length - 1]['effective_price']
                  ?.toString() ??
                  '0') ??
          0.0;
    }
    return null;
  }

  bool _showDiscountBadge(Map<String, dynamic> product) {
    // Only show discount badge when there's exactly 1 variant
    final variants = product['variants'] as List<dynamic>?;
    if (variants == null || variants.length != 1) return false;

    final originalPrice =
        double.tryParse(variants[0]['price']?.toString() ?? '0') ?? 0.0;
    final finalPrice =
        double.tryParse(variants[0]['effective_price']?.toString() ?? '0') ?? 0.0;
    return finalPrice < originalPrice;
  }

  bool _isNewWithinTenDays(String? createdAtStr) {
    if (createdAtStr == null) return false;
    final createdAt = DateTime.tryParse(createdAtStr);
    if (createdAt == null) return false;
    return DateTime.now().difference(createdAt).inDays <= 10;
  }

  void _navigateToProductDetail(Map<String, dynamic> product) {
    final slug = product['slug']?.toString() ?? '';
    if (slug.isEmpty) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ProductDetailScreen(
          slug: slug,
          variantId: null,
        ),
      ),
    );
  }

  Widget _buildProductCard(Map<String, dynamic> product) {
    final displayPrice = _getDisplayPrice(product);
    final displayPriceMax = _hasMultiplePrices(product) ? _getMaxDisplayPrice(product) : null;
    final displayOldPrice = _hasMultiplePrices(product) ? null : _getDisplayOldPrice(product);
    final showDiscountBadge = _showDiscountBadge(product);
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

    return GestureDetector(
      onTap: () => _navigateToProductDetail(product),
      child: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
          border: Border.all(color: Theme.of(context).colorScheme.outline, width: 0.15),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Image and badges
            Stack(
              children: [
                ClipRRect(
                  borderRadius:
                      const BorderRadius.vertical(top: Radius.circular(12)),
                  child: Container(
                    width: double.infinity,
                    height: 180,
                    color: Theme.of(context).colorScheme.surface,
                    child: imageUrl.isEmpty
                        ? Center(
                            child: Icon(Icons.computer,
                                size: 48, color: Theme.of(context).colorScheme.outline))
                        : Image.network(
                            imageUrl,
                            width: double.infinity,
                            height: 180,
                            fit: BoxFit.contain,
                            alignment: Alignment.center,
                            loadingBuilder: (context, child, loadingProgress) {
                              if (loadingProgress == null) return child;
                              return Center(
                                  child:
                                      CircularProgressIndicator(strokeWidth: 2));
                            },
                            errorBuilder: (_, __, ___) => Center(
                              child: Icon(Icons.computer,
                                  size: 48, color: Theme.of(context).colorScheme.outline),
                            ),
                          ),
                  ),
                ),
                // Wishlist button
                Positioned(
                  top: 6,
                  left: 6,
                  child: GestureDetector(
                    onTap: () => _toggleWishlist(productId),
                    child: CircleAvatar(
                      backgroundColor: Theme.of(context).colorScheme.surface,
                      radius: 14,
                      child: Icon(
                        isLiked ? Icons.favorite : Icons.favorite_border,
                        size: 15,
                        color: isLiked ? Colors.red : Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                ),
                // Top-right badges
                Positioned(
                  top: 6,
                  right: 6,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Badge GIẢM GIÁ (first)
                      if (showDiscountBadge && discountPercent > 0)
                        Container(
                          margin: const EdgeInsets.only(right: 3),
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.red,
                            borderRadius: BorderRadius.circular(3),
                          ),
                          child: Text(
                            '-$discountPercent%',
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.surface,
                              fontSize: 8,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),

                      // Badge MỚI (second)
                      if (isNew)
                        Container(
                          margin: const EdgeInsets.only(right: 3),
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.green,
                            borderRadius: BorderRadius.circular(3),
                          ),
                          child: Text(
                            'MỚI',
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.surface,
                              fontSize: 8,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),

                      // Badge NỔI BẬT (last)
                      if (isFeatured)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.amber.shade700,
                            borderRadius: BorderRadius.circular(3),
                          ),
                          child: Text(
                            'NỔI BẬT',
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.surface,
                              fontSize: 8,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),

            // Content
            Padding(
              padding: const EdgeInsets.all(6),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Brand + Rating on same row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Flexible(
                        child: Text(
                          brand.toString().toUpperCase(),
                          style: TextStyle(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          ...List.generate(5, (index) {
                            if (index < rating.floor()) {
                              return const Icon(Icons.star,
                                  size: 10, color: Colors.amber);
                            } else if (index < rating) {
                              return const Icon(Icons.star_half,
                                  size: 10, color: Colors.amber);
                            } else {
                              return Icon(Icons.star,
                                  size: 10, color: Theme.of(context).colorScheme.outline);
                            }
                          }),
                          const SizedBox(width: 2),
                          Text(
                            '(${product['reviews_count'] ?? 0})',
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                              fontSize: 9,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  // Product name
                  Text(
                    product['name'] ?? '',
                    style: TextStyle(
                        fontSize: 13, fontWeight: FontWeight.bold, height: 1.3),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  // Price
                  if (showDiscountBadge)
                    Text(
                      '${_formatPrice(displayPrice)}đ',
                      style: TextStyle(
                          color: Color(0xFFF26522),
                          fontSize: 12,
                          fontWeight: FontWeight.bold),
                    )
                  else if (displayPriceMax != null)
                    Text(
                      '${_formatPrice(displayPrice)} - ${_formatPrice(displayPriceMax!)}đ',
                      style: TextStyle(
                          color: Color(0xFFF26522),
                          fontSize: 12,
                          fontWeight: FontWeight.bold),
                    )
                  else
                    Text(
                      '${_formatPrice(displayPrice)}đ',
                      style: TextStyle(
                          color: Color(0xFFF26522),
                          fontSize: 12,
                          fontWeight: FontWeight.bold),
                    ),
                  if (displayOldPrice != null &&
                      displayOldPrice > displayPrice &&
                      showDiscountBadge) ...[
                    const SizedBox(height: 2),
                    Text(
                      '${_formatPrice(displayOldPrice)}đ',
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                        fontSize: 11,
                        decoration: TextDecoration.lineThrough,
                      ),
                    ),
                  ],
                  const SizedBox(height: 4),
                  // Description + Cart button on same row
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: Text(
                          product['short_description'] ??
                              product['description'] ??
                              '',
                          style: TextStyle(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                              fontSize: 11,
                              height: 1.3),
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 6),
                      GestureDetector(
                        onTap: () async {
                          final hasSession = await AuthService.hasSession();
                          if (!hasSession) {
                            if (!mounted) return;
                            AppDialogs.showLoginRequiredDialog(context);
                            return;
                          }
                          try {
                            await CartService.addToCart(productId, 1);
                            if (!mounted) return;
                            AppSnackBar.showSuccess(context, Trans.addedToCart);
                          } catch (e) {
                            if (!mounted) return;
                            AppSnackBar.showError(context, Trans.errorLabel + e.toString().replaceFirst('Exception: ', ''));
                          }
                        },
                        child: Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            color: const Color(0xFFF26522),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: const Icon(
                            Icons.add_shopping_cart,
                            size: 16,
                            color: Colors.white,
                          ),
                        ),
                      ),
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

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        // Header Texts
        Text(
          _selectedCategoryId != null
              ? Trans.productsByCategory
              : Trans.allProducts,
          style: TextStyle(
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
            color: Theme.of(context).colorScheme.onSurfaceVariant,
            height: 1.5,
          ),
        ),
        const SizedBox(height: 20),

        // Search
        Container(
          height: 48,
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            border: Border.all(color: Theme.of(context).colorScheme.outline, width: 0.15),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: Trans.searchProductsPlaceholder,
                    hintStyle: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: Icon(Icons.clear, color: Theme.of(context).colorScheme.onSurfaceVariant, size: 18),
                            onPressed: () {
                              _searchController.clear();
                              _onSearchChanged('');
                            },
                          )
                        : null,
                  ),
                  textInputAction: TextInputAction.search,
                  onChanged: _onSearchChanged,
                  onSubmitted: (val) => _fetchProducts(),
                ),
              ),
              Padding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                child: Icon(Icons.search, color: Theme.of(context).colorScheme.onSurfaceVariant),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Sort and Filter Row
        Row(
          children: [
            Text(
              Trans.sort,
              style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                  fontSize: 13),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Container(
                height: 40,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  border: Border.all(color: Theme.of(context).colorScheme.outline, width: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _sortValue,
                    isExpanded: true,
                    icon: const Icon(Icons.keyboard_arrow_down, size: 20),
                    items: _sortOptions.map((String value) {
                      return DropdownMenuItem<String>(
                        value: value == Trans.defaultSort ? 'default' : value,
                        child: Text(value,
                            style: TextStyle(
                                fontSize: 13, fontWeight: FontWeight.w600)),
                      );
                    }).toList(),
                    onChanged: (String? newValue) {
                      if (newValue != null) {
                        setState(() {
                          _sortValue = newValue;
                          _currentPage = 1;
                        });
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
                icon: Icon(Icons.tune, size: 18, color: Theme.of(context).colorScheme.onSurface),
                label: Text(Trans.filterLabel,
                    style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface,
                        fontWeight: FontWeight.bold,
                        fontSize: 13)),
                style: OutlinedButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.surface,
                  side: BorderSide(color: Theme.of(context).colorScheme.outline, width: 0.15),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
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
          Padding(
            padding: EdgeInsets.all(40.0),
            child: Center(
                child: CircularProgressIndicator(color: Color(0xFFF26522))),
          )
        else if (_products.isEmpty)
          Padding(
            padding: EdgeInsets.all(40.0),
            child: Center(
                child: Text(Trans.noProductsMatchFilter)),
          )
        else
          Builder(
            builder: (context) {
              // Split products into 2 columns
              final leftItems = <dynamic>[];
              final rightItems = <dynamic>[];
              for (int i = 0; i < _products.length; i++) {
                if (i % 2 == 0) {
                  leftItems.add(_products[i]);
                } else {
                  rightItems.add(_products[i]);
                }
              }
              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      children: leftItems
                          .map((p) => Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: _buildProductCard(p),
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
                                child: _buildProductCard(p),
                              ))
                          .toList(),
                    ),
                  ),
                ],
              );
            },
          ),
          
        if (_lastPage > 1)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 24),
            child: Column(
              children: [
                // Page info: "Trang X / Y"
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Text(
                    'Trang $_currentPage / $_lastPage',
                    style: TextStyle(
                      color: Colors.grey.shade600,
                      fontSize: 14,
                    ),
                  ),
                ),
                // Pagination buttons
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: _buildPagButtons(),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}
