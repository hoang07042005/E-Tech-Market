import 'package:flutter/material.dart';

import '../../utils/network_utils.dart';
import '../../utils/translation.dart';

class ProductSection extends StatelessWidget {
  final List<dynamic> products;
  final Set<int> wishedProductIds;
  final bool isLoading;
  final VoidCallback onViewAll;
  final ValueChanged<Map<String, dynamic>> onProductSelected;
  final ValueChanged<int> onToggleWishlist;
  final ValueChanged<Map<String, dynamic>> onAddToCart;

  const ProductSection({
    super.key,
    
    required this.products,
    required this.wishedProductIds,
    required this.isLoading,
    required this.onViewAll,
    required this.onProductSelected,
    required this.onToggleWishlist,
    required this.onAddToCart,
  });

  static const _brandColor = Color(0xFFF26522);

  @override
  Widget build(BuildContext context) {
    final visibleProducts =
        products.take(10).cast<Map<String, dynamic>>().toList();

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
                  Trans.featuredProductsHome,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 22,
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
          const SizedBox(height: 18),
          if (isLoading)
            _buildSkeletonGrid()
          else if (visibleProducts.isEmpty)
            Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Text(
                Trans.noFeaturedProducts,
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
                childAspectRatio: 0.52,
              ),
              itemBuilder: (context, index) {
                final product = visibleProducts[index];
                final productId = (product['id'] as num?)?.toInt() ?? 0;
                return _ProductCard(
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
      itemCount: 6,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 0.52,
      ),
      itemBuilder: (_, __) => const _ProductSkeleton(),
    );
  }
}

class _ProductCard extends StatelessWidget {
  final Map<String, dynamic> product;
  final bool isWished;
  final VoidCallback onTap;
  final VoidCallback onToggleWishlist;
  final VoidCallback onAddToCart;

  const _ProductCard({
    required this.product,
    required this.isWished,
    required this.onTap,
    required this.onToggleWishlist,
    required this.onAddToCart,
  });

  static const _brandColor = Color(0xFFF26522);

  @override
  Widget build(BuildContext context) {
    final name = product['name']?.toString() ?? '';
    final brand = product['brand']?.toString().trim();
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
    final oldPrice = _getDisplayOldPrice(product);
    final discountPercent = _getDiscountPercent(displayPrice, oldPrice);
    final rating =
        double.tryParse(product['avg_rating']?.toString() ?? '0') ?? 0;
    final ratingCount = (product['reviews_count'] as num?)?.toInt() ?? 0;
    final isNew = product['is_new'] == true;

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
            mainAxisSize: MainAxisSize.min, // <-- Giúp viền Container co khít theo nội dung bên trong
            children: [
              // --- PHẦN 1: CỐ ĐỊNH TỈ LỆ ẢNH ĐỂ ĐỀU NHAU ---
              AspectRatio(
                aspectRatio: 1, // Ảnh vuông tỉ lệ 1:1, giúp các sản phẩm thẳng hàng phần ảnh
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: Container(
                        decoration: BoxDecoration(
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                        ),
                        clipBehavior: Clip.antiAlias, 
                        child: imageUrl.isEmpty
                            ? _buildImageFallback()
                            : Image.network(
                                imageUrl,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => _buildImageFallback(),
                              ),
                      ),
                    ),
                    Positioned(
                      top: 8,
                      left: 8,
                      child: _CircleActionButton(
                        icon: isWished ? Icons.favorite : Icons.favorite_border,
                        color: isWished ? _brandColor : const Color(0xFF94A3B8),
                        onTap: onToggleWishlist,
                      ),
                    ),
                    if (discountPercent > 0 || isNew)
                      Positioned(
                        top: 8,
                        right: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: discountPercent > 0 ? Colors.red : _brandColor,
                            borderRadius: BorderRadius.circular(3),
                          ),
                          child: Text(
                            discountPercent > 0 ? '-$discountPercent%' : Trans.newBadge,
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.w800),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              
              // --- PHẦN 2: THÔNG TIN TỰ CO GIÃN THEO CHỮ (BỎ EXPANDED) ---
              Padding(
                padding: const EdgeInsets.all(10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            (brand == null || brand.isEmpty ? Trans.brandDefault : brand)
                                .toUpperCase(),
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.5,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        _RatingStars(rating: rating, count: ratingCount),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      name,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface,
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        height: 1.25,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height:2),
                    Wrap(
                      spacing: 6,
                      runSpacing: 2,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text(
                          '${_formatPrice(displayPrice)} đ',
                          style: const TextStyle(
                              color: _brandColor,
                              fontSize: 13,
                              fontWeight: FontWeight.w800),
                        ),
                        if (oldPrice != null && oldPrice > displayPrice)
                          Text(
                            '${_formatPrice(oldPrice)} đ',
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                              fontSize: 10,
                              decoration: TextDecoration.lineThrough,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    
                    // Phần mô tả ngắn và Nút giỏ hàng tự động co giãn ngang hàng
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Expanded(
                          child: Text(
                            excerpt,
                            style: TextStyle(
                                color: Theme.of(context).colorScheme.onSurfaceVariant,
                                fontSize: 11,
                                height: 1.35),
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 6),
                        _CircleActionButton(
                          icon: Icons.add_shopping_cart_outlined,
                          color: Colors.white,
                          backgroundColor: _brandColor,
                          onTap: onAddToCart,
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

  // Các hàm hỗ trợ bên dưới giữ nguyên...
  
 

  Widget _buildImageFallback() {
    return Center(
        child: Icon(Icons.devices_other_outlined,
            size: 48, color: Colors.grey.shade300));
  }

  String _resolveProductImageUrl(Map<String, dynamic> product) {
    final mainImage = product['main_image_url']?.toString().trim();
    if (mainImage != null && mainImage.isNotEmpty) {
      return NetworkUtils.fixDeviceUrl(mainImage);
    }

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

    return double.tryParse(product['price']?.toString() ?? '0') ?? 0;
  }

  double? _getDisplayOldPrice(Map<String, dynamic> product) {
    final variants = product['variants'] as List<dynamic>?;
    if (variants != null && variants.isNotEmpty) {
      final sortedVariants = List<dynamic>.from(variants);
      sortedVariants.sort((a, b) {
        final aPrice =
            double.tryParse(a['effective_price']?.toString() ?? '0') ?? 0;
        final bPrice =
            double.tryParse(b['effective_price']?.toString() ?? '0') ?? 0;
        return aPrice.compareTo(bPrice);
      });

      final originalPrice =
          double.tryParse(sortedVariants.first['price']?.toString() ?? '0') ??
              0;
      final finalPrice = double.tryParse(
              sortedVariants.first['effective_price']?.toString() ?? '0') ??
          0;
      return originalPrice > finalPrice ? originalPrice : null;
    }

    return null;
  }

  int _getDiscountPercent(double price, double? oldPrice) {
    if (oldPrice == null || oldPrice <= price || oldPrice <= 0) return 0;
    return ((1 - price / oldPrice) * 100).round();
  }

  String _formatPrice(double price) {
    return price.toStringAsFixed(0).replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (match) => '${match[1]}.',
        );
  }
}

class _CircleActionButton extends StatelessWidget {
  final IconData icon;
  final Color color;
  final Color? backgroundColor; // Thêm dòng này
  final VoidCallback onTap;

  const _CircleActionButton({
    required this.icon,
    required this.color,
    this.backgroundColor, // Thêm dòng này
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
          width: 30, // Kích thước vừa vặn cho góc chữ
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

class _RatingStars extends StatelessWidget {
  final double rating;
  final int count;

  const _RatingStars({required this.rating, required this.count});

  @override
  Widget build(BuildContext context) {
    final rounded = rating.clamp(0, 5);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        ...List.generate(5, (index) {
          return Icon(
            index < rounded.floor() ? Icons.star : Icons.star_border,
            size: 10,
            color: index < rounded.floor()
                ? Colors.amber
                : const Color(0xFFCBD5E1),
          );
        }),
        const SizedBox(width: 2),
        Text(
          rating > 0 ? rating.toStringAsFixed(1) : '($count)',
            style: TextStyle(
              fontSize: 9,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
              fontWeight: FontWeight.w700),
        ),
      ],
    );
  }
}

class _ProductSkeleton extends StatelessWidget {
  const _ProductSkeleton();

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Theme.of(context).colorScheme.outline),
      ),
      child: Column(
        children: [
            Expanded(flex: 8, child: Container(color: Theme.of(context).colorScheme.surfaceContainerHighest)),
          Expanded(
            flex: 9,
            child: Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  _SkeletonLine(widthFactor: 0.45),
                  SizedBox(height: 10),
                  _SkeletonLine(widthFactor: 0.9),
                  SizedBox(height: 6),
                  _SkeletonLine(widthFactor: 0.7),
                  Spacer(),
                  _SkeletonLine(widthFactor: 1, height: 28),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SkeletonLine extends StatelessWidget {
  final double widthFactor;
  final double height;

  const _SkeletonLine({required this.widthFactor, this.height = 12});

  @override
  Widget build(BuildContext context) {
    return FractionallySizedBox(
      widthFactor: widthFactor,
      child: Container(
        height: height,
        decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerLow,
          borderRadius: BorderRadius.circular(4),
        ),
      ),
    );
  }
}
