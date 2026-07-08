import 'dart:async';

import 'package:flutter/material.dart';

import '../../services/products_service.dart';
import '../../utils/network_utils.dart';
import '../../utils/translation.dart';
import '../products/product_detail_screen.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _focusNode = FocusNode();
  Timer? _debounceTimer;

  List<dynamic> _searchResults = [];
  bool _isLoading = false;
  String _searchQuery = '';
  bool _showSuggestions = false;

  @override
  void initState() {
    super.initState();
    // Tự động focus vào ô tìm kiếm khi mở màn hình
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _focusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _searchController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  // Hàm xử lý logic tìm kiếm
  Future<void> _performSearch(String query, {bool isTyping = false}) async {
    if (!mounted) return;
    setState(() {
      _searchQuery = query;
      _isLoading = true;
      if (!isTyping) {
        _showSuggestions = false;
      }
    });
    if (query.trim().isEmpty) {
      setState(() {
        _searchResults = [];
        _isLoading = false;
      });
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final res = await ProductsService.fetchProducts(
        search: query,
        limit: 20,
      );
      if (mounted) {
        setState(() {
          _searchResults = res['data'] ?? [];
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

  // Hàm định dạng giá tiền (VD: 1000000 -> 1.000.000)
  String _formatPrice(double price) {
    return price.toStringAsFixed(0).replaceAllMapped(
        RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]}.');
  }

  // Hàm xử lý lấy URL ảnh sản phẩm
  String _resolveProductImageUrl(Map<String, dynamic> product) {
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

  // Hàm lấy giá hiển thị (thường là giá thấp nhất của các biến thể)
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
              sortedVariants.first['effective_price']?.toString() ?? '0') ??
          0;
    }
    return double.tryParse(product['effective_price']?.toString() ?? '0') ?? 0;
  }

  // Điều hướng đến trang chi tiết sản phẩm
  void _navigateToProduct(Map<String, dynamic> product) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ProductDetailScreen(
          slug: product['slug'] ?? '',
          variantId: null,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      appBar: AppBar(
        backgroundColor: colorScheme.surface,
        elevation: 0,
        leading: BackButton(
          color: colorScheme.onSurface,
        ),
        title: SizedBox(
          height: 40,
          child: TextField(
            controller: _searchController,
            focusNode: _focusNode,
            textAlignVertical: TextAlignVertical.center,
            style: const TextStyle(fontSize: 15),
            decoration: InputDecoration(
              hintText: 'Tìm kiếm .....',
              hintStyle: TextStyle(
                color: Colors.grey.shade500,
                fontSize: 15,
              ),
              filled: true,
              fillColor: Theme.of(context).brightness == Brightness.dark 
                  ? Colors.grey.shade800 
                  : Colors.grey.shade200,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide.none,
              ),
              suffixIcon: Padding(
                padding: const EdgeInsets.only(right: 8.0),
                child: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: Icon(
                          Icons.clear_rounded,
                          color: Theme.of(context).colorScheme.onSurface,
                          size: 23,
                        ),
                        onPressed: () {
                          _searchController.clear();
                          _performSearch('');
                        },
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      )
                    : Icon(
                        Icons.search_rounded,
                        color: Theme.of(context).colorScheme.onSurface,
                        size: 23,
                      ),
              ),
            ),
            textInputAction: TextInputAction.search,
            onSubmitted: _performSearch,
            onChanged: (val) {
              setState(() {
                _showSuggestions = true;
              }); // Cập nhật để hiển thị/ẩn nút xóa
              _debounceTimer?.cancel();
              if (val.trim().isEmpty) {
                setState(() {
                  _searchResults = [];
                  _isLoading = false;
                });
                return;
              }
              _debounceTimer = Timer(const Duration(milliseconds: 300), () {
                _performSearch(val, isTyping: true);
              });
            },
          ),
        ),
      ),
      body: _buildBody(),
    );
  }


  Widget _buildBody() {
    // Trạng thái 1: Chưa nhập từ khóa tìm kiếm
    if (_searchQuery.trim().isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.search_rounded, size: 100, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text(
              Trans.whatAreYouLookingFor,
              style: TextStyle(
                  color: Colors.grey.shade600,
                  fontSize: 16,
                  fontWeight: FontWeight.w500),
            ),
          ],
        ),
      );
    }

    if (_showSuggestions) {
      final uniqueNames = _searchResults.map((p) => p['name']?.toString() ?? '').where((n) => n.isNotEmpty).toSet().toList();
      
      if (_isLoading && uniqueNames.isEmpty) {
        return const Center(child: CircularProgressIndicator());
      }
      
      return ListView.builder(
        itemCount: uniqueNames.length,
        itemBuilder: (context, index) {
          final name = uniqueNames[index];
          return ListTile(
            leading: Icon(Icons.history, color: Colors.grey.shade500),
            title: Text(name),
            onTap: () {
              _searchController.text = name;
              FocusScope.of(context).unfocus();
              _performSearch(name, isTyping: false);
            },
          );
        },
      );
    }

    // Trạng thái 2: Đang tải dữ liệu
    if (_isLoading) {
      return _buildSkeletonLoader();
    }

    // Trạng thái 3: Không tìm thấy kết quả
    if (_searchResults.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.search_off_rounded,
                  size: 100, color: Colors.grey.shade300),
              const SizedBox(height: 16),
              Text(
                'Không tìm thấy kết quả phù hợp',
                style: TextStyle(
                    color: Colors.grey.shade800,
                    fontSize: 18,
                    fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                'Thử lại với từ khóa khác hoặc kiểm tra xem có lỗi chính tả không nhé.',
                style: TextStyle(color: Colors.grey.shade500, fontSize: 14),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    // Trạng thái 4: Hiển thị danh sách kết quả (Bố cục 2 cột giống products_screen)
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Builder(
        builder: (context) {
          final flattenedResults = <Map<String, dynamic>>[];
          for (var p in _searchResults) {
            final variants = p['variants'] as List<dynamic>?;
            if (variants != null && variants.isNotEmpty) {
              for (var v in variants) {
                final Map<String, dynamic> virtualProduct = Map<String, dynamic>.from(p);
                final color = v['color'];
                final config = v['configuration'];
                
                String colorName = '';
                if (color is Map) {
                  colorName = color['name']?.toString() ?? '';
                } else if (color != null) {
                  colorName = color.toString();
                } else {
                  colorName = v['color_name']?.toString() ?? '';
                }
                
                String configName = '';
                if (config is Map) {
                  configName = config['name']?.toString() ?? '';
                } else if (config != null) {
                  configName = config.toString();
                } else {
                  configName = v['configuration_name']?.toString() ?? '';
                }
                
                virtualProduct['name'] = p['name'] ?? '';
                final parts = <String>[];
                if (colorName != null && colorName.toString().isNotEmpty) {
                  parts.add(colorName.toString());
                }
                if (configName != null && configName.toString().isNotEmpty) {
                  parts.add(configName.toString());
                }
                if (parts.isNotEmpty) {
                  virtualProduct['variant_label'] = parts.join(' - ');
                }
                
                final imageUrl = v['image_url']?.toString();
                if (imageUrl != null && imageUrl.isNotEmpty) {
                  virtualProduct['main_image_url'] = imageUrl;
                }
                
                virtualProduct['variants'] = [v];
                flattenedResults.add(virtualProduct);
              }
            } else {
              flattenedResults.add(p);
            }
          }

          final leftItems = <dynamic>[];
          final rightItems = <dynamic>[];
          for (int i = 0; i < flattenedResults.length; i++) {
            if (i % 2 == 0) {
              leftItems.add(flattenedResults[i]);
            } else {
              rightItems.add(flattenedResults[i]);
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
    );
  }

  Widget _buildSkeletonLoader() {
    return ListView.builder(
      itemCount: 5, // Hiển thị 5 khung xám mờ
      padding: const EdgeInsets.all(16),
      itemBuilder: (context, index) {
        return Container(
          margin: const EdgeInsets.only(bottom: 14),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            children: [
              // Khung ảnh skeleton
              Container(
                width: 95,
                height: 95,
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              const SizedBox(width: 14),
              // Khung văn bản skeleton
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                        width: double.infinity,
                        height: 16,
                        color: Colors.grey.shade100),
                    const SizedBox(height: 8),
                    Container(
                        width: 150, height: 14, color: Colors.grey.shade100),
                    const SizedBox(height: 20),
                    Container(
                        width: 80, height: 18, color: Colors.grey.shade100),
                  ],
                ),
              )
            ],
          ),
        );
      },
    );
  }



  final Set<int> _wishSet = {};

  void _toggleWishlist(int productId) async {
    setState(() {
      if (_wishSet.contains(productId)) {
        _wishSet.remove(productId);
      } else {
        _wishSet.add(productId);
      }
    });
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
      onTap: () => _navigateToProduct(product),
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
                  if (product['variant_label'] != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      product['variant_label'],
                      style: TextStyle(
                        fontSize: 11,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                        height: 1.3,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
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
                  // Description (3 lines) with Add button at bottom right
LayoutBuilder(
  builder: (context, constraints) {
    final fullText = product['short_description'] ?? product['description'] ?? '';
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
      onTap: () => _navigateToProduct(product),
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
    final firstLineEndIndex = textPainter.getPositionForOffset(Offset(constraints.maxWidth, 0)).offset;
    final firstLineText = fullText.substring(0, firstLineEndIndex);
    final remainingText = fullText.substring(firstLineEndIndex);

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
              padding: const EdgeInsets.only(right: 40), // 32px nút + 8px khoảng cách an toàn
              child: Text(
                remainingText,
                style: textStyle,
                maxLines: 2, // Giới hạn đúng 3 dòng tổng cộng (1 dòng trên + 2 dòng dưới)
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
}