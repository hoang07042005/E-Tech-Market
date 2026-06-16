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
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 30),
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
                        color: selected ? _brandColor : Theme.of(context).colorScheme.outline, width:0.15,
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
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Text(
                'Chưa có sản phẩm nổi bật.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: Theme.of(context).colorScheme.onSurfaceVariant),
              ),
            )
          else
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: visibleProducts.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 0.54,
              ),
              itemBuilder: (context, index) {
                final product = visibleProducts[index];
                final productId = (product['id'] as num?)?.toInt() ?? 0;
                return _TabbedProductCard(
                  product: product,
                  isWished: wishedProductIds.contains(productId),
                  onTap: () => onProductSelected(product),
                  onToggleWishlist: () => onToggleWishlist(productId),
                  onAddToCart: () => onAddToCart(product),
                );
              },
            ),
        ],
      ),
    );
  }

  Widget _buildSkeletonGrid() {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: 4,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 0.54,
      ),
      itemBuilder: (_, __) => const _TabbedProductSkeleton(),
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
    final imageUrl = _resolveProductImageUrl(product);
    final displayPrice = _getDisplayPrice(product);
    final oldPrice = _getDisplayOldPrice(product);

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
            children: [
              Expanded(
                flex: 7,
                child: Container(
                  child: Stack(
                    children: [
                      Positioned.fill(
                        child: Padding(
                          padding: const EdgeInsets.all(0),
                          child: imageUrl.isEmpty
                              ? _buildFallback(context)
                              : Image.network(
                                  imageUrl,
                                  fit: BoxFit.contain,
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
              ),
              Expanded(
                flex: 6,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onSurface,
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      // Hiển thị giá gốc ở trên (bị gạch ngang), giá giảm ở dưới
                      if (oldPrice != null && oldPrice > displayPrice) ...[
                        Text(
                          '${_formatPrice(oldPrice)} đ',
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                            fontSize: 10,
                            decoration: TextDecoration.lineThrough,
                            decorationColor: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                        ),
                        const SizedBox(height: 4),
                      ],
                      Text(
                        '${_formatPrice(displayPrice)} đ',
                        style: TextStyle(
                          color: Color(0xFFEF7A45),
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      
                      Expanded(
                        child: Text(
                          product['short_description']?.toString() ?? '',
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                            fontSize: 11,
                            height: 1.3,
                          ),
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(height: 8),
                      SizedBox(
                          width: double.infinity,
                          height: 30,
                          child: ElevatedButton(
                            onPressed: onAddToCart, 
                            style: ElevatedButton.styleFrom(
                              backgroundColor: _brandColor,
                              foregroundColor: Theme.of(context).colorScheme.surface,
                              elevation: 0,
                              padding: EdgeInsets.zero,
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(4)),
                            ),
                            child: Text(
                              Trans.addToCartBtn,
                              style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.4),
                            ),
                          ),
                        ),
                    ],
                  ),
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

class _TabbedProductSkeleton extends StatelessWidget {
  const _TabbedProductSkeleton();

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Theme.of(context).colorScheme.outline, width: 0.15),
      ),
      child: Column(
        children: [
          Expanded(flex: 7, child: Container(color: Theme.of(context).colorScheme.surfaceContainerLow)),
          Expanded(
            flex: 6,
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  _TabbedSkeletonLine(widthFactor: 0.7),
                  SizedBox(height: 10),
                  _TabbedSkeletonLine(widthFactor: 0.9),
                  SizedBox(height: 10),
                  _TabbedSkeletonLine(widthFactor: 0.5),
                  Spacer(),
                  _TabbedSkeletonLine(widthFactor: 1, height: 32),
                ],
              ),
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
