import 'dart:async';
import 'package:flutter/material.dart';
import '../../services/products_service.dart';
import '../../services/wishlist_service.dart';
import '../../utils/network_utils.dart';
import '../../utils/translation.dart';
import 'product_detail_screen.dart';


class ProductsScreen extends StatefulWidget {
  final int? initialCategoryId;

  const ProductsScreen({super.key, this.initialCategoryId});

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _PriceInfo {
  final double displayPrice;
  final double? displayPriceMax;
  final double? displayOldPrice;
  final bool hasMultiplePrices;
  final bool showDiscountBadge;
  final int discountPercent;
  final Map<String, dynamic>? flashSaleItem;

  _PriceInfo({
    required this.displayPrice,
    this.displayPriceMax,
    this.displayOldPrice,
    required this.hasMultiplePrices,
    required this.showDiscountBadge,
    required this.discountPercent,
    this.flashSaleItem,
  });
}

class _ProductsScreenState extends State<ProductsScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  String _sortValue = 'default';
  bool _showSearch = false; // toggle ô tìm kiếm
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
          final price = _getPriceInfo(p).displayPrice;
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
      final lastPage = meta != null
          ? (meta['last_page'] as int?)
          : (response['last_page'] as int?);

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
                                  inactiveTrackColor:
                                      Theme.of(context).colorScheme.outline,
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
                                          color: Theme.of(context)
                                              .colorScheme
                                              .onSurfaceVariant,
                                          fontSize: 12)),
                                  Text('Tối đa ${_formatPrice(_maxPrice)} đ',
                                      style: TextStyle(
                                          color: Theme.of(context)
                                              .colorScheme
                                              .onSurfaceVariant,
                                          fontSize: 12)),
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
                                        color: Theme.of(context)
                                            .colorScheme
                                            .onSurfaceVariant,
                                        fontSize: 12))
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
                                                        : Theme.of(context)
                                                            .colorScheme
                                                            .outline,
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
                                                        : Theme.of(context)
                                                            .colorScheme
                                                            .onSurface,
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
              color: isSelected
                  ? Color(0xFFF26522)
                  : Theme.of(context).colorScheme.onSurfaceVariant,
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                Trans.allProducts,
                style: TextStyle(
                  fontSize: 14,
                  color: isSelected
                      ? Color(0xFFF26522)
                      : Theme.of(context).colorScheme.onSurface,
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
                      color: isSelected
                          ? Color(0xFFF26522)
                          : Theme.of(context).colorScheme.onSurface,
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

  // ── PHÂN TRANG ── //

  Widget _buildPageChip(String label, VoidCallback? onTap,
      {bool isActive = false, bool isEllipsis = false}) {
    if (isEllipsis) {
      return Container(
        width: 36,
        alignment: Alignment.center,
        child: Text('•••',
            style: TextStyle(
                color: Colors.grey.shade400, fontSize: 11, letterSpacing: 1)),
      );
    }
    final disabled = onTap == null;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        width: 38,
        height: 38,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: isActive
              ? const Color(0xFFF26522)
              : disabled
                  ? Colors.transparent
                  : Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isActive
                ? const Color(0xFFF26522)
                : disabled
                    ? Colors.transparent
                    : Theme.of(context).colorScheme.outline.withOpacity(0.4),
            width: 1,
          ),
          boxShadow: isActive
              ? [
                  BoxShadow(
                      color: const Color(0xFFF26522).withOpacity(0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 2))
                ]
              : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
            color: isActive
                ? Colors.white
                : disabled
                    ? Colors.grey.shade400
                    : Theme.of(context).colorScheme.onSurface,
          ),
        ),
      ),
    );
  }

  Widget _buildNavArrow(IconData icon, VoidCallback? onTap) {
    final disabled = onTap == null;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        width: 40,
        height: 38,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: disabled
              ? Colors.transparent
              : Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: disabled
                ? Colors.transparent
                : Theme.of(context).colorScheme.outline.withOpacity(0.4),
          ),
        ),
        child: Icon(icon,
            size: 18,
            color: disabled
                ? Colors.grey.shade300
                : Theme.of(context).colorScheme.onSurface),
      ),
    );
  }

  List<Widget> _buildPagButtons() {
    final btns = <Widget>[];
    const maxNums = 5; // số trang hiển thị giữa
    final half = maxNums ~/ 2;
    int start = (_currentPage - half).clamp(1, _lastPage);
    int end = (start + maxNums - 1).clamp(1, _lastPage);
    start = (end - maxNums + 1).clamp(1, _lastPage);

    // ◀ Prev
    btns.add(_buildNavArrow(
      Icons.chevron_left_rounded,
      _currentPage > 1
          ? () {
              setState(() => _currentPage--);
              _fetchProducts();
            }
          : null,
    ));
    btns.add(const SizedBox(width: 4));

    // Trang 1 + ellipsis trái
    if (start > 1) {
      btns.add(_buildPageChip('1', () {
        setState(() => _currentPage = 1);
        _fetchProducts();
      }));
      if (start > 2) btns.add(_buildPageChip('', null, isEllipsis: true));
    }

    // Các trang giữa
    for (int i = start; i <= end; i++) {
      btns.add(_buildPageChip(
        i.toString(),
        () {
          setState(() => _currentPage = i);
          _fetchProducts();
        },
        isActive: i == _currentPage,
      ));
      if (i < end) btns.add(const SizedBox(width: 4));
    }

    // Ellipsis phải + trang cuối
    if (end < _lastPage) {
      if (end < _lastPage - 1)
        btns.add(_buildPageChip('', null, isEllipsis: true));
      btns.add(_buildPageChip(
        _lastPage.toString(),
        () {
          setState(() => _currentPage = _lastPage);
          _fetchProducts();
        },
      ));
    }

    btns.add(const SizedBox(width: 4));
    // ▶ Next
    btns.add(_buildNavArrow(
      Icons.chevron_right_rounded,
      _currentPage < _lastPage
          ? () {
              setState(() => _currentPage++);
              _fetchProducts();
            }
          : null,
    ));

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

  _PriceInfo _getPriceInfo(Map<String, dynamic> product) {
    final flashSaleItems = product['flash_sale_items'] as List<dynamic>?;
    Map<String, dynamic>? activeFlashSaleItem;
    if (flashSaleItems != null && flashSaleItems.isNotEmpty) {
      for (var item in flashSaleItems) {
        if (item['flash_sale'] != null) {
          activeFlashSaleItem = item as Map<String, dynamic>?;
          break;
        }
      }
    }
    final isFlashSale = activeFlashSaleItem != null;

    final variants = product['variants'] as List<dynamic>? ?? [];
    final activeVariants =
        variants.where((v) => v['is_active'] != false).toList();
    final isSingleVariant = activeVariants.length == 1;

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

      double finalPrice =
          double.tryParse(lowest['effective_price']?.toString() ?? '0') ?? 0;
      double? priceMax =
          double.tryParse(highest['effective_price']?.toString() ?? '0') ?? 0;
      double originalPrice =
          double.tryParse(lowest['price']?.toString() ?? '0') ?? 0;

      bool hasMultiplePrices = finalPrice != priceMax;
      bool showDiscountBadge = isSingleVariant;

      if (isFlashSale) {
        finalPrice = double.tryParse(
                activeFlashSaleItem['flash_sale_price']?.toString() ?? '0') ??
            0;
        hasMultiplePrices = false;
        showDiscountBadge = true;
      }

      final hasDiscount = finalPrice < originalPrice && showDiscountBadge;

      return _PriceInfo(
        displayPrice: finalPrice,
        displayPriceMax: hasMultiplePrices ? priceMax : null,
        displayOldPrice: hasDiscount ? originalPrice : null,
        hasMultiplePrices: hasMultiplePrices,
        showDiscountBadge: showDiscountBadge,
        discountPercent:
            hasDiscount ? ((1 - finalPrice / originalPrice) * 100).round() : 0,
        flashSaleItem: activeFlashSaleItem,
      );
    }

    final basePrice =
        double.tryParse(product['price']?.toString() ?? '0') ?? 0.0;
    return _PriceInfo(
      displayPrice: basePrice,
      hasMultiplePrices: false,
      showDiscountBadge: false,
      discountPercent: 0,
    );
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
    final info = _getPriceInfo(product);
    final displayPrice = info.displayPrice;
    final displayPriceMax = info.displayPriceMax;
    final displayOldPrice = info.displayOldPrice;
    final showDiscountBadge = info.showDiscountBadge;
    final discountPercent = info.discountPercent;
    final flashSaleItem = info.flashSaleItem;
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
          border: Border.all(
              color: Theme.of(context).colorScheme.outline, width: 0.15),
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
                                size: 48,
                                color: Theme.of(context).colorScheme.outline))
                        : Image.network(
                            imageUrl,
                            width: double.infinity,
                            height: 180,
                            fit: BoxFit.contain,
                            alignment: Alignment.center,
                            loadingBuilder: (context, child, loadingProgress) {
                              if (loadingProgress == null) return child;
                              return Center(
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2));
                            },
                            errorBuilder: (_, __, ___) => Center(
                              child: Icon(Icons.computer,
                                  size: 48,
                                  color: Theme.of(context).colorScheme.outline),
                            ),
                          ),
                  ),
                ),
                // Flash Sale Banner Overlay
                if (flashSaleItem != null &&
                    flashSaleItem['flash_sale'] != null)
                  Positioned(
                    bottom: 0,
                    left: 0,
                    right: 0,
                    child: _FlashSaleBanner(
                      endAt: flashSaleItem['flash_sale']['end_at'] ?? '',
                      discountPercent: discountPercent,
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
                        color: isLiked
                            ? Colors.red
                            : Theme.of(context).colorScheme.onSurfaceVariant,
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
                          padding: const EdgeInsets.symmetric(
                              horizontal: 5, vertical: 2),
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
                          padding: const EdgeInsets.symmetric(
                              horizontal: 5, vertical: 2),
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
                          padding: const EdgeInsets.symmetric(
                              horizontal: 5, vertical: 2),
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
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurfaceVariant,
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
                                  size: 10,
                                  color: Theme.of(context).colorScheme.outline);
                            }
                          }),
                          const SizedBox(width: 2),
                          Text(
                            '(${product['reviews_count'] ?? 0})',
                            style: TextStyle(
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurfaceVariant,
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
                  Wrap(
                    crossAxisAlignment: WrapCrossAlignment.end,
                    children: [
                      if (showDiscountBadge)
                        Text(
                          '${_formatPrice(displayPrice)}đ',
                          style: const TextStyle(
                              color: Color(0xFFF26522),
                              fontSize: 12,
                              fontWeight: FontWeight.bold),
                        )
                      else if (displayPriceMax != null)
                        Text(
                          '${_formatPrice(displayPrice)} - ${_formatPrice(displayPriceMax)}đ',
                          style: const TextStyle(
                              color: Color(0xFFF26522),
                              fontSize: 12,
                              fontWeight: FontWeight.bold),
                        )
                      else
                        Text(
                          '${_formatPrice(displayPrice)}đ',
                          style: const TextStyle(
                              color: Color(0xFFF26522),
                              fontSize: 12,
                              fontWeight: FontWeight.bold),
                        ),
                      if (displayOldPrice != null &&
                          displayOldPrice > displayPrice &&
                          showDiscountBadge)
                        Padding(
                          padding: const EdgeInsets.only(left: 4, bottom: 1),
                          child: Text(
                            '${_formatPrice(displayOldPrice)}đ',
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                              fontSize: 10,
                              decoration: TextDecoration.lineThrough,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  
                  // Stock bar
                  Builder(
                    builder: (context) {
                      if (flashSaleItem != null && flashSaleItem['flash_sale'] != null) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: _StockBar(
                            isFlashSale: true,
                            flashSaleSold: flashSaleItem['sold_quantity'],
                            flashSaleLimit: flashSaleItem['quantity_limit'],
                          ),
                        );
                      } else {
                        final variants = product['variants'] as List<dynamic>? ?? [];
                        int? totalStock;
                        if (variants.isNotEmpty) {
                          totalStock = variants.fold<int>(0, (sum, v) => sum + ((v['stock_quantity'] as num?)?.toInt() ?? 0));
                        } else {
                          totalStock = (product['stock_quantity'] as num?)?.toInt();
                        }
                        if (totalStock != null) {
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 4),
                            child: _StockBar(
                              isFlashSale: false,
                              normalStock: totalStock,
                            ),
                          );
                        }
                        return const SizedBox();
                      }
                    },
                  ),

                  // Description (3 lines) with Add button at bottom right
                  LayoutBuilder(
                    builder: (context, constraints) {
                      final fullText = product['short_description'] ??
                          product['description'] ??
                          '';
                      final textStyle = TextStyle(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                        fontSize: 11,
                        height: 1.3,
                      );

                      // 1. Đo kích thước để kiểm tra xem chữ có dài quá 1 dòng không
                      final textPainter = TextPainter(
                        text: TextSpan(text: fullText, style: textStyle),
                        maxLines: 1,
                        textDirection: TextDirection.ltr,
                      )..layout(maxWidth: constraints.maxWidth);

                      // Kiểm tra trạng thái vượt quá 1 dòng
                      final isMultiLine = textPainter.didExceedMaxLines;

                      // Định nghĩa nhanh cấu trúc Nút Bấm Giỏ Hàng để dùng chung cho cả 2 trường hợp
                      final cartButton = GestureDetector(
                        onTap: () => _navigateToProductDetail(product),
                        child: Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            color: const Color(0xFFF26522),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: const Icon(
                            Icons.arrow_forward_rounded,
                            size: 18,
                            color: Colors.white,
                          ),
                        ),
                      );

                      // TRƯỜNG HỢP A: Văn bản ngắn (Chỉ có 1 dòng)
                      if (!isMultiLine) {
                        return Row(
                          children: [
                            Expanded(
                              child: Text(
                                fullText,
                                style: textStyle,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 8),
                            cartButton,
                          ],
                        );
                      }

                      // TRƯỜNG HỢP B: Văn bản dài nhiều dòng (Dòng 1 full width, dòng 2-3 né nút bấm)
                      final firstLineEndIndex = textPainter
                          .getPositionForOffset(Offset(constraints.maxWidth, 0))
                          .offset;
                      final firstLineText =
                          fullText.substring(0, firstLineEndIndex);
                      final remainingText =
                          fullText.substring(firstLineEndIndex);

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Dòng 1: Luôn hiển thị Full Width tuyệt đối
                          Text(
                            firstLineText,
                            style: textStyle,
                            maxLines: 1,
                          ),
                          // Dòng 2 & 3: Tự động chừa 40px bên phải để né nút bấm giỏ hàng
                          Stack(
                            children: [
                              Padding(
                                padding: const EdgeInsets.only(
                                    right:
                                        40), // 32px nút + 8px khoảng cách an toàn
                                child: Text(
                                  remainingText,
                                  style: textStyle,
                                  maxLines:
                                      2, // Giới hạn đúng 3 dòng tổng cộng (1 dòng trên + 2 dòng dưới)
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              Positioned(
                                right: 0,
                                bottom: 0,
                                child: cartButton,
                              ),
                            ],
                          ),
                        ],
                      );
                    },
                  )
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

        // ── TOOLBAR: Sort + Filter + Search toggle ──
        Row(
          children: [
            // Sắp xếp
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
                  border: Border.all(
                      color: Theme.of(context).colorScheme.outline,
                      width: 0.15),
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
            const SizedBox(width: 8),
            // Bộ lọc
            SizedBox(
              height: 40,
              child: OutlinedButton.icon(
                onPressed: _showFilterDrawer,
                icon: Icon(Icons.tune,
                    size: 18, color: Theme.of(context).colorScheme.onSurface),
                label: Text(Trans.filterLabel,
                    style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface,
                        fontWeight: FontWeight.bold,
                        fontSize: 13)),
                style: OutlinedButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.surface,
                  side: BorderSide(
                      color: Theme.of(context).colorScheme.outline,
                      width: 0.15),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                ),
              ),
            ),
            const SizedBox(width: 8),
            // Icon toggle tìm kiếm
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              height: 40,
              width: 40,
              decoration: BoxDecoration(
                color: _showSearch
                    ? const Color(0xFFF26522)
                    : Theme.of(context).colorScheme.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: _showSearch
                      ? const Color(0xFFF26522)
                      : Theme.of(context).colorScheme.outline.withOpacity(0.4),
                  width: 1,
                ),
              ),
              child: IconButton(
                padding: EdgeInsets.zero,
                onPressed: () {
                  setState(() {
                    _showSearch = !_showSearch;
                    if (!_showSearch) {
                      _searchController.clear();
                      _onSearchChanged('');
                    }
                  });
                },
                icon: Icon(
                  Icons.search_rounded,
                  size: 20,
                  color: _showSearch
                      ? Colors.white
                      : Theme.of(context).colorScheme.onSurface,
                ),
              ),
            ),
          ],
        ),

        // ── Ô tìm kiếm (hiện/ẩn) ──
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 250),
          transitionBuilder: (child, anim) => FadeTransition(
            opacity: anim,
            child: SizeTransition(
                sizeFactor: anim, axisAlignment: -1, child: child),
          ),
          child: _showSearch
              ? Padding(
                  key: const ValueKey('search_bar'),
                  padding: const EdgeInsets.only(top: 10),
                  child: Container(
                    height: 48,
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.surface,
                      border: Border.all(
                          color: const Color(0xFFF26522), width: 1.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _searchController,
                            autofocus: true,
                            decoration: InputDecoration(
                              hintText: Trans.searchProductsPlaceholder,
                              hintStyle: TextStyle(
                                  color: Theme.of(context)
                                      .colorScheme
                                      .onSurfaceVariant),
                              border: InputBorder.none,
                              contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 16, vertical: 12),
                            ),
                            textInputAction: TextInputAction.search,
                            onChanged: _onSearchChanged,
                            onSubmitted: (val) => _fetchProducts(),
                          ),
                        ),
                        // Nút X để đóng ô tìm kiếm
                        IconButton(
                          onPressed: () {
                            setState(() {
                              _showSearch = false;
                              _searchController.clear();
                              _onSearchChanged('');
                            });
                          },
                          icon: const Icon(Icons.close_rounded,
                              size: 20, color: Color(0xFFF26522)),
                        ),
                      ],
                    ),
                  ),
                )
              : const SizedBox.shrink(key: ValueKey('search_hidden')),
        ),

        const SizedBox(height: 16),

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
            child: Center(child: Text(Trans.noProductsMatchFilter)),
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
            margin: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                  color:
                      Theme.of(context).colorScheme.outline.withOpacity(0.2)),
            ),
            child: Column(
              children: [
                // Thanh tiến trình
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: _lastPage > 0 ? _currentPage / _lastPage : 0,
                    minHeight: 3,
                    backgroundColor: Colors.grey.shade200,
                    valueColor:
                        const AlwaysStoppedAnimation<Color>(Color(0xFFF26522)),
                  ),
                ),
                const SizedBox(height: 14),
                // Nhãn trang
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Trang $_currentPage / $_lastPage',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade500,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    Text(
                      '${_products.length} sản phẩm',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade500,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                // Các nút phân trang
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: _buildPagButtons(),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _FlashSaleBanner extends StatefulWidget {
  final String endAt;
  final int discountPercent;

  const _FlashSaleBanner({required this.endAt, required this.discountPercent});

  @override
  State<_FlashSaleBanner> createState() => _FlashSaleBannerState();
}

class _FlashSaleBannerState extends State<_FlashSaleBanner> {
  late Timer _timer;
  String _hours = "00";
  String _minutes = "00";
  String _seconds = "00";

  @override
  void initState() {
    super.initState();
    _computeTime();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      _computeTime();
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  void _computeTime() {
    final endDate = DateTime.tryParse(widget.endAt);
    if (endDate == null) return;
    final distance = endDate.difference(DateTime.now());
    if (distance.isNegative) {
      if (mounted) {
        setState(() {
          _hours = "00";
          _minutes = "00";
          _seconds = "00";
        });
      }
      return;
    }

    final h = distance.inHours.toString().padLeft(2, '0');
    final m = (distance.inMinutes % 60).toString().padLeft(2, '0');
    final s = (distance.inSeconds % 60).toString().padLeft(2, '0');

    if (mounted) {
      setState(() {
        _hours = h;
        _minutes = m;
        _seconds = s;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 36,
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFFED1C24), Color(0xFFFA4B2A)],
        ),
        boxShadow: [
          BoxShadow(
              color: Colors.black12, offset: Offset(0, -2), blurRadius: 4),
        ],
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final width = constraints.maxWidth;
          return Stack(
            clipBehavior: Clip.none,
            children: [
              // Middle Block: Timer
              Positioned(
                left: width * 0.36,
                right: width * 0.24,
                top: 0,
                bottom: 0,
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text("KẾT THÚC SAU:",
                          style: TextStyle(
                              fontSize: 7.5,
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.2)),
                      const SizedBox(height: 1),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          _buildTimeBox(_hours),
                          const SizedBox(width: 1),
                          const Text(":",
                              style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 8,
                                  fontWeight: FontWeight.bold)),
                          const SizedBox(width: 1),
                          _buildTimeBox(_minutes),
                          const SizedBox(width: 1),
                          const Text(":",
                              style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 8,
                                  fontWeight: FontWeight.bold)),
                          const SizedBox(width: 1),
                          _buildTimeBox(_seconds),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              // Left Block (Flash Sale) - 38% width, slanted right
              Positioned(
                left: -2,
                top: -3,
                bottom: 1,
                width: width * 0.38,
                child: CustomPaint(
                  painter: _SlantLeftPainter(),
                  child: Container(
                    padding: const EdgeInsets.only(left: 3, top: 4),
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          const Icon(Icons.flash_on,
                              color: Color(0xFFFFEB3B), size: 14),
                          const SizedBox(width: 1),
                          const Text(
                            "FLASH\nSALE",
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w900,
                              fontSize: 10,
                              height: 1.05,
                              fontStyle: FontStyle.italic,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),

              // Right Block (Discount) - 26% width, slanted left
              Positioned(
                right: 0,
                top: -3,
                bottom: 1,
                width: width * 0.26,
                child: CustomPaint(
                  painter: _SlantRightPainter(),
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.only(left: 4.0),
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Text(
                          "-${widget.discountPercent}%",
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildTimeBox(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 1),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(2),
      ),
      child: Text(
        text,
        style: const TextStyle(
          color: Color(0xFFCC0000),
          fontSize: 9,
          fontWeight: FontWeight.bold,
          height: 1.1,
        ),
      ),
    );
  }
}

class _SlantLeftPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // shadow
    final shadowPaint = Paint()..color = const Color(0xFFFFEB3B);
    final shadowPath = Path()
      ..moveTo(2, 2)
      ..lineTo(size.width + 2, 2)
      ..lineTo(size.width * 0.85 + 2, size.height + 2)
      ..lineTo(2, size.height + 2)
      ..close();
    canvas.drawPath(shadowPath, shadowPaint);

    // main
    final paint = Paint()
      ..shader = const LinearGradient(
        colors: [Color(0xFFFF1A1A), Color(0xFFCC0000)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));

    final path = Path()
      ..lineTo(size.width, 0)
      ..lineTo(size.width * 0.85, size.height)
      ..lineTo(0, size.height)
      ..close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _SlantRightPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // shadow
    final shadowPaint = Paint()..color = const Color(0xFFFFEB3B);
    final shadowPath = Path()
      ..moveTo(size.width * 0.25 - 2, 2)
      ..lineTo(size.width - 2, 2)
      ..lineTo(size.width - 2, size.height + 2)
      ..lineTo(-2, size.height + 2)
      ..close();
    canvas.drawPath(shadowPath, shadowPaint);

    // main
    final paint = Paint()
      ..shader = const LinearGradient(
        colors: [Color(0xFFFFB800), Color(0xFFFF8800)],
        begin: Alignment.centerLeft,
        end: Alignment.centerRight,
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));

    final path = Path()
      ..moveTo(size.width * 0.25, 0)
      ..lineTo(size.width, 0)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _StockBar extends StatelessWidget {
  final bool isFlashSale;
  final int? flashSaleSold;
  final int? flashSaleLimit;
  final int? normalStock;

  const _StockBar({
    required this.isFlashSale,
    this.flashSaleSold,
    this.flashSaleLimit,
    this.normalStock,
  });

  @override
  Widget build(BuildContext context) {
    if (isFlashSale) {
      if (flashSaleLimit == null || flashSaleLimit == 0) return const SizedBox();
      final sold = flashSaleSold ?? 0;
      final limit = flashSaleLimit!;
      final pct = (sold / limit * 100).clamp(0, 100).toDouble();

      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "Đã bán $sold/$limit",
                style: const TextStyle(
                  color: Color(0xFFFF4B2B),
                  fontWeight: FontWeight.w600,
                  fontSize: 10,
                ),
              ),
              Text(
                "${pct.round()}%",
                style: const TextStyle(
                  color: Color(0xFF999999),
                  fontSize: 10,
                ),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Container(
            height: 4,
            decoration: BoxDecoration(
              color: const Color(0xFFF0F0F0),
              borderRadius: BorderRadius.circular(99),
            ),
            alignment: Alignment.centerLeft,
            child: LayoutBuilder(
              builder: (context, constraints) {
                return Container(
                  width: constraints.maxWidth * (pct / 100),
                  height: 4,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFFF4B2B), Color(0xFFF21B24)],
                    ),
                    borderRadius: BorderRadius.circular(99),
                  ),
                );
              },
            ),
          ),
        ],
      );
    } else {
      if (normalStock == null) return const SizedBox();
      final stock = normalStock!;
      final pct = (stock / 100 * 100).clamp(0, 100).toDouble(); // STOCK_MAX = 100
      final isLow = stock <= 10;

      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                isLow ? "⚠️ Sắp hết hàng (còn $stock)" : "Còn $stock sản phẩm",
                style: TextStyle(
                  color: isLow ? const Color(0xFFE53E3E) : const Color(0xFFFF4B2B),
                  fontWeight: isLow ? FontWeight.w700 : FontWeight.w600,
                  fontSize: 10,
                ),
              ),
              Text(
                "${pct.round()}%",
                style: const TextStyle(
                  color: Color(0xFF999999),
                  fontSize: 10,
                ),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Container(
            height: 4,
            decoration: BoxDecoration(
              color: const Color(0xFFF0F0F0),
              borderRadius: BorderRadius.circular(99),
            ),
            alignment: Alignment.centerLeft,
            child: LayoutBuilder(
              builder: (context, constraints) {
                return Container(
                  width: constraints.maxWidth * (pct / 100),
                  height: 4,
                  decoration: BoxDecoration(
                    gradient: isLow
                        ? const LinearGradient(
                            colors: [Color(0xFFF59E0B), Color(0xFFE53E3E)],
                          )
                        : const LinearGradient(
                            colors: [Color(0xFF34D399), Color(0xFF059669)],
                          ),
                    borderRadius: BorderRadius.circular(99),
                  ),
                );
              },
            ),
          ),
        ],
      );
    }
  }
}
