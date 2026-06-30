import 'package:flutter/material.dart';

import '../../utils/network_utils.dart';
import '../../utils/translation.dart';

const _brandColor = Color(0xFFEF7A45);

class TabbedProductSection extends StatelessWidget {
  final List<dynamic> categories;
  final int selectedTabIndex;
  final ValueChanged<int>? onTabSelected;
  final List<dynamic> products;
  final Set<int> wishedProductIds;
  final bool isLoading;
  final VoidCallback onViewAll;
  final ValueChanged<Map<String, dynamic>> onProductSelected;
  final ValueChanged<int> onToggleWishlist;
  final ValueChanged<Map<String, dynamic>> onAddToCart;

  const TabbedProductSection({
    super.key,
    required this.categories,
    required this.products,
    required this.wishedProductIds,
    required this.isLoading,
    required this.onViewAll,
    required this.onProductSelected,
    required this.onToggleWishlist,
    required this.onAddToCart,
    this.selectedTabIndex = 0,
    this.onTabSelected,
  });

  @override
  Widget build(BuildContext context) {
    final visibleCategories =
        categories.take(5).cast<Map<String, dynamic>>().toList();
    final visibleProducts =
        products.take(4).cast<Map<String, dynamic>>().toList();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
      color: Theme.of(context).colorScheme.surface,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: Text(
                  Trans.productsByCategory,
                  textAlign: TextAlign.left,
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: Theme.of(context).colorScheme.onSurface,
                    height: 1.15,
                  ),
                ),
              ),
              IconButton(
                onPressed: onViewAll,
                icon: const Icon(Icons.arrow_forward_outlined),
                color: _brandColor,
                tooltip: Trans.viewAllProducts,
              ),
            ],
          ),
          if (visibleCategories.isNotEmpty) ...[
            const SizedBox(height: 18),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: List.generate(visibleCategories.length, (index) {
                  final category = visibleCategories[index];
                  final name = category['name']?.toString() ?? 'Danh mục';
                  final selected = index == selectedTabIndex;
                  return Padding(
                    padding: const EdgeInsets.only(right: 10),
                    child: ChoiceChip(
                      label: Text(
                        name,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: selected ? Colors.white : _brandColor,
                        ),
                      ),
                      selected: selected,
                      selectedColor: _brandColor,
                      backgroundColor: Theme.of(context).colorScheme.surface,
                      side: BorderSide(
                        color: selected ? _brandColor : Theme.of(context).colorScheme.outline, width: 0.15,
                      ),
                      onSelected: onTabSelected == null
                          ? null
                          : (_) => onTabSelected!(index),
                    ),
                  );
                }),
              ),
            ),
          ],
          const SizedBox(height: 18),
          if (isLoading)
            _buildSkeletonGrid()
          else if (visibleProducts.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Text(
                'Chưa có sản phẩm nổi bật.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: Theme.of(context).colorScheme.onSurfaceVariant),
              ),
            )
          else
            LayoutBuilder(
              builder: (context, constraints) {
                final itemWidth = (constraints.maxWidth - 12) / 2;
                return Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: List.generate(visibleProducts.length, (index) {
                    final product = visibleProducts[index];
                    final productId = (product['id'] as num?)?.toInt() ?? 0;
                    return SizedBox(
                      width: itemWidth,
                      child: _TabbedProductCard(
                        product: product,
                        isWished: wishedProductIds.contains(productId),
                        onTap: () => onProductSelected(product),
                        onToggleWishlist: () => onToggleWishlist(productId),
                        onAddToCart: () => onAddToCart(product),
                      ),
                    );
                  }),
                );
              },
            ),
        ],
      ),
    );
  }

  Widget _buildSkeletonGrid() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final itemWidth = (constraints.maxWidth - 12) / 2;
        return Wrap(
          spacing: 12,
          runSpacing: 12,
          children: List.generate(4, (_) => SizedBox(
            width: itemWidth,
            child: const _TabbedProductSkeleton(),
          )),
        );
      },
    );
  }
}

class _TabbedProductCard extends StatelessWidget {
  final Map<String, dynamic> product;
  final bool isWished;
  final VoidCallback onTap;
  final VoidCallback onToggleWishlist;
  final VoidCallback onAddToCart;

  const _TabbedProductCard({
    required this.product,
    required this.isWished,
    required this.onTap,
    required this.onToggleWishlist,
    required this.onAddToCart,
  });

  @override
  Widget build(BuildContext context) {
    final name = product['name']?.toString() ?? '';
    // Đồng bộ cách lấy trường mô tả giống như product_section
    final description = product['description']?.toString().trim();
    final shortDescription = product['short_description']?.toString().trim();
    final excerpt =
        description != null && description.isNotEmpty
            ? description
            : shortDescription != null && shortDescription.isNotEmpty
                ? shortDescription
                : Trans.defaultProductExcerpt;
    final imageUrl = _resolveProductImageUrl(product);
    final displayPrice = _getDisplayPrice(product);
    final displayPriceMax = _hasMultiplePrices(product) ? _getMaxDisplayPrice(product) : null;
    final displayOldPrice = _hasMultiplePrices(product) ? null : _getDisplayOldPrice(product);
    final showDiscountBadge = _showDiscountBadge(product);

    return Material(
      color: Theme.of(context).colorScheme.surface,
      borderRadius: BorderRadius.circular(12),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            border: Border.all(color: Theme.of(context).colorScheme.outline, width: 0.15),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              // 1. Phần Ảnh (giữ tỉ lệ aspect ratio 1.1 của tabbed_product_section)
              AspectRatio(
                aspectRatio: 1.1,
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: Container(
                        decoration: BoxDecoration(
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                        ),
                        clipBehavior: Clip.antiAlias, 
                        child: imageUrl.isEmpty
                            ? _buildFallback(context)
                            : Image.network(
                                imageUrl,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => _buildFallback(context),
                              ),
                      ),
                    ),
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Material(
                        color: Theme.of(context).colorScheme.surface,
                        shape: const CircleBorder(),
                        child: InkWell(
                          onTap: onToggleWishlist,
                          customBorder: const CircleBorder(),
                          child: Padding(
                            padding: const EdgeInsets.all(6),
                            child: Icon(
                              isWished ? Icons.favorite : Icons.favorite_border,
                              color: isWished ? _brandColor : Theme.of(context).colorScheme.onSurfaceVariant,
                              size: 16,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              
              // 2. Phần thông tin sản phẩm: Cập nhật theo giao diện product_section
              Padding(
                padding: const EdgeInsets.all(10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      name,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface,
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        height: 1.25,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Wrap(
                      spacing: 6,
                      runSpacing: 2,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        if (showDiscountBadge)
                          Text(
                            '${_formatPrice(displayPrice)} đ',
                            style: const TextStyle(
                              color: _brandColor,
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                            ),
                          )
                        else if (displayPriceMax != null)
                          Text(
                            '${_formatPrice(displayPrice)} - ${_formatPrice(displayPriceMax)} đ',
                            style: const TextStyle(
                              color: _brandColor,
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                            ),
                          )
                        else
                          Text(
                            '${_formatPrice(displayPrice)} đ',
                            style: const TextStyle(
                              color: _brandColor,
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        if (displayOldPrice != null && displayOldPrice > displayPrice && showDiscountBadge)
                          Text(
                            '${_formatPrice(displayOldPrice)} đ',
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                              fontSize: 10,
                              decoration: TextDecoration.lineThrough,
                              decorationColor: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    
                    // Phần mô tả ngắn và Nút giỏ hàng hình tròn (Copy từ product_section)
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Expanded(
                          child: Text(
                            excerpt,
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                              fontSize: 10,
                              height: 1.35,
                            ),
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 6),
                        _CircleActionButton(
                          icon: Icons.arrow_forward_rounded,
                          color: Colors.white,
                          backgroundColor: _brandColor,
                          onTap: onTap,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFallback(BuildContext context) {
    return Center(
      child: Icon(Icons.devices_other_outlined,
          size: 40, color: Theme.of(context).colorScheme.outline),
    );
  }

  String _resolveProductImageUrl(Map<String, dynamic> product) {
    final mainImage = product['main_image_url']?.toString().trim();
    if (mainImage != null && mainImage.isNotEmpty) return NetworkUtils.fixDeviceUrl(mainImage);

    final variants = product['variants'] as List<dynamic>?;
    if (variants != null) {
      for (final variant in variants) {
        final image = variant['image_url']?.toString().trim();
        if (image != null && image.isNotEmpty) return NetworkUtils.fixDeviceUrl(image);
      }
    }

    final images = product['images'] as List<dynamic>?;
    if (images != null) {
      for (final image in images) {
        final url = image['image_url']?.toString().trim() ??
            image['url']?.toString().trim();
        if (url != null && url.isNotEmpty) return NetworkUtils.fixDeviceUrl(url);
      }
    }

    return '';
  }

  double _getDisplayPrice(Map<String, dynamic> product) {
    final variants = product['variants'] as List<dynamic>?;
    if (variants != null && variants.isNotEmpty) {
      final sortedVariants = List<dynamic>.from(variants);
      sortedVariants.sort((a, b) {
        final aPrice = double.tryParse(a['effective_price']?.toString() ?? '0') ?? 0;
        final bPrice = double.tryParse(b['effective_price']?.toString() ?? '0') ?? 0;
        return aPrice.compareTo(bPrice);
      });
      return double.tryParse(
              sortedVariants.first['effective_price']?.toString() ?? '0') ??
          0;
    }
    return double.tryParse(product['price']?.toString() ?? '0') ?? 0;
  }

  bool _hasMultiplePrices(Map<String, dynamic> product) {
    final variants = product['variants'] as List<dynamic>?;
    if (variants != null && variants.length > 1) {
      final sortedVariants = List.from(variants);
      sortedVariants.sort((a, b) {
        final aPrice = double.tryParse(a['effective_price']?.toString() ?? '0') ?? 0;
        final bPrice = double.tryParse(b['effective_price']?.toString() ?? '0') ?? 0;
        return aPrice.compareTo(bPrice);
      });
      final lowest = double.tryParse(sortedVariants.first['effective_price']?.toString() ?? '0') ?? 0.0;
      final highest = double.tryParse(sortedVariants.last['effective_price']?.toString() ?? '0') ?? 0.0;
      return lowest != highest;
    }
    return false;
  }

  double? _getMaxDisplayPrice(Map<String, dynamic> product) {
    final variants = product['variants'] as List<dynamic>?;
    if (variants != null && variants.isNotEmpty) {
      final sortedVariants = List.from(variants);
      sortedVariants.sort((a, b) {
        final aPrice = double.tryParse(a['effective_price']?.toString() ?? '0') ?? 0;
        final bPrice = double.tryParse(b['effective_price']?.toString() ?? '0') ?? 0;
        return aPrice.compareTo(bPrice);
      });
      return double.tryParse(sortedVariants.last['effective_price']?.toString() ?? '0') ?? 0.0;
    }
    return null;
  }

  bool _showDiscountBadge(Map<String, dynamic> product) {
    final variants = product['variants'] as List<dynamic>?;
    if (variants == null || variants.length != 1) return false;
    final originalPrice = double.tryParse(variants[0]['price']?.toString() ?? '0') ?? 0.0;
    final finalPrice = double.tryParse(variants[0]['effective_price']?.toString() ?? '0') ?? 0.0;
    return finalPrice < originalPrice;
  }

  double? _getDisplayOldPrice(Map<String, dynamic> product) {
    final variants = product['variants'] as List<dynamic>?;
    if (variants != null && variants.isNotEmpty) {
      final sortedVariants = List<dynamic>.from(variants);
      sortedVariants.sort((a, b) {
        final aPrice = double.tryParse(a['effective_price']?.toString() ?? '0') ?? 0;
        final bPrice = double.tryParse(b['effective_price']?.toString() ?? '0') ?? 0;
        return aPrice.compareTo(bPrice);
      });
      final originalPrice = double.tryParse(sortedVariants.first['price']?.toString() ?? '0') ?? 0;
      final finalPrice = double.tryParse(sortedVariants.first['effective_price']?.toString() ?? '0') ?? 0;
      return originalPrice > finalPrice ? originalPrice : null;
    }
    return null;
  }

  String _formatPrice(double price) {
    return price.toStringAsFixed(0).replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (match) => '${match[1]}.',
        );
  }
}

// Thêm Widget nút bấm hình tròn từ product_section sang để sử dụng
class _CircleActionButton extends StatelessWidget {
  final IconData icon;
  final Color color;
  final Color? backgroundColor;
  final VoidCallback onTap;

  const _CircleActionButton({
    required this.icon,
    required this.color,
    this.backgroundColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final bgColor = backgroundColor ?? Theme.of(context).colorScheme.surface;

    return Material(
      color: bgColor,
      shape: const CircleBorder(),
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: Container(
          width: 30,
          height: 30,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: backgroundColor == null 
                ? Border.all(color: Theme.of(context).colorScheme.outline, width: 0.15)
                : null,
          ),
          child: Icon(icon, size: 15, color: color),
        ),
      ),
    );
  }
}

class _TabbedProductSkeleton extends StatelessWidget {
  const _TabbedProductSkeleton();

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Theme.of(context).colorScheme.outline, width: 0.15),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const AspectRatio(
            aspectRatio: 1.1,
            child: SizedBox(),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                const _TabbedSkeletonLine(widthFactor: 0.8),
                const SizedBox(height: 8),
                const _TabbedSkeletonLine(widthFactor: 0.4),
                const SizedBox(height: 12),
                Row(
                  children:  [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _TabbedSkeletonLine(widthFactor: 0.9, height: 8),
                          SizedBox(height: 4),
                          _TabbedSkeletonLine(widthFactor: 0.7, height: 8),
                        ],
                      ),
                    ),
                    SizedBox(width: 6),
                    Container(
                      width: 30,
                      height: 30,
                      decoration: BoxDecoration(
                        color: Colors.black12,
                        shape: BoxShape.circle,
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
}

class _TabbedSkeletonLine extends StatelessWidget {
  final double widthFactor;
  final double height;

  const _TabbedSkeletonLine({required this.widthFactor, this.height = 10});

  @override
  Widget build(BuildContext context) {
    return FractionallySizedBox(
      widthFactor: widthFactor,
      child: Container(
        height: height,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerLow,
          borderRadius: BorderRadius.circular(6),
        ),
      ),
    );
  }
}