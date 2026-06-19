import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../utils/network_utils.dart';

class ProductCardBubble extends StatelessWidget {
  final List<Map<String, dynamic>> products;
  final void Function(Map<String, dynamic> product) onProductTap;

  const ProductCardBubble({
    super.key,
    required this.products,
    required this.onProductTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.only(left: 56, right: 16, top: 4, bottom: 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section header
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFF26522), Color(0xFFFF8A50)],
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.shopping_bag_outlined,
                          color: Colors.white, size: 14),
                      SizedBox(width: 4),
                      Text(
                        'Sản phẩm gợi ý',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          // Product cards - horizontal scroll
          SizedBox(
            height: 200,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: products.length,
              separatorBuilder: (_, __) => const SizedBox(width: 10),
              itemBuilder: (context, index) {
                final product = products[index];
                return _ProductCard(
                  product: product,
                  isDark: isDark,
                  onTap: () => onProductTap(product),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _ProductCard extends StatelessWidget {
  final Map<String, dynamic> product;
  final bool isDark;
  final VoidCallback onTap;

  const _ProductCard({
    required this.product,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final name = product['name']?.toString() ?? 'Sản phẩm';
    final brand = product['brand']?.toString() ?? '';
    final price = double.tryParse(product['price']?.toString() ?? '0') ?? 0;
    final originalPrice = double.tryParse(product['original_price']?.toString() ?? '');
    final imageUrl = product['main_image_url']?.toString();

    final formatter = NumberFormat('#,###', 'vi_VN');
    final hasDiscount = originalPrice != null && originalPrice > price;

    String? resolvedImage;
    if (imageUrl != null && imageUrl.isNotEmpty) {
      resolvedImage = NetworkUtils.fixDeviceUrl(imageUrl);
    }

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 155,
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isDark
                ? const Color(0xFF333333)
                : const Color(0xFFE2E8F0),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.06),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Product image
            ClipRRect(
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(14)),
              child: Container(
                height: 100,
                width: double.infinity,
                color: isDark
                    ? const Color(0xFF2D2D2D)
                    : const Color(0xFFF8FAFC),
                child: resolvedImage != null
                    ? Image.network(
                        resolvedImage,
                        fit: BoxFit.contain,
                        errorBuilder: (_, __, ___) =>
                            const _PlaceholderIcon(),
                      )
                    : const _PlaceholderIcon(),
              ),
            ),
            // Product info
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (brand.isNotEmpty)
                      Text(
                        brand.toUpperCase(),
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFFF26522),
                          letterSpacing: 0.5,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    const SizedBox(height: 2),
                    Expanded(
                      child: Text(
                        name,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: isDark
                              ? const Color(0xFFE2E8F0)
                              : const Color(0xFF1E293B),
                          height: 1.2,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    // Rating row (if available)
                    if (product['avg_rating'] != null) ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          ...List.generate(5, (i) {
                            final rating = double.tryParse(product['avg_rating'].toString()) ?? 0;
                            if (i < rating.floor()) {
                              return const Icon(Icons.star_rounded, size: 12, color: Color(0xFFFBBF24));
                            } else if (i < rating.ceil() && rating % 1 >= 0.5) {
                              return const Icon(Icons.star_half_rounded, size: 12, color: Color(0xFFFBBF24));
                            } else {
                              return Icon(Icons.star_outline_rounded, size: 12, color: Colors.grey.withValues(alpha: 0.4));
                            }
                          }),
                          const SizedBox(width: 4),
                          Text(
                            '${product['avg_rating']}',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFFFBBF24),
                            ),
                          ),
                          const SizedBox(width: 2),
                          Text(
                            '(${product['reviews_count'] ?? 0})',
                            style: TextStyle(
                              fontSize: 9,
                              color: isDark ? const Color(0xFF888888) : const Color(0xFF94A3B8),
                            ),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${formatter.format(price)}đ',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFFF26522),
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              if (hasDiscount)
                                Text(
                                  '${formatter.format(originalPrice)}đ',
                                  style: TextStyle(
                                    fontSize: 10,
                                    decoration: TextDecoration.lineThrough,
                                    color: isDark
                                        ? const Color(0xFF666666)
                                        : const Color(0xFF94A3B8),
                                  ),
                                ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF26522),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Icon(
                            Icons.arrow_forward_rounded,
                            color: Colors.white,
                            size: 14,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PlaceholderIcon extends StatelessWidget {
  const _PlaceholderIcon();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Icon(
        Icons.devices_outlined,
        size: 32,
        color: Colors.grey.withValues(alpha: 0.4),
      ),
    );
  }
}
