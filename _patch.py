import sys

with open('d:/E-Tech-Market/e_tech_market_app/lib/screens/wishlist/wishlist_screen.dart', 'r', encoding='utf-8') as f:
    content = f.read()

import_statement = "import '../../widgets/product_badges.dart';"
if import_statement not in content:
    content = content.replace("import '../videos/video_detail_screen.dart';", "import '../videos/video_detail_screen.dart';\n" + import_statement)

start_idx = content.find('Widget _buildProductCard(Map<String, dynamic> product) {')
end_idx = content.find('Widget _buildBlogCard(Map<String, dynamic> post) {')

if start_idx != -1 and end_idx != -1:
    new_func = '''Widget _buildProductCard(Map<String, dynamic> product) {
    final int productId = product['id'] as int;
    final name = product['name']?.toString() ?? '';
    final brand = product['brand']?.toString().trim();
    final description = product['description']?.toString().trim();
    final shortDescription = product['short_description']?.toString().trim();
    final excerpt = description != null && description.isNotEmpty ? description : (shortDescription != null && shortDescription.isNotEmpty ? shortDescription : Trans.defaultProductExcerpt);
    final rating = double.tryParse(product['avg_rating']?.toString() ?? '0') ?? 0;
    final ratingCount = (product['reviews_count'] as num?)?.toInt() ?? 0;
    final isNew = product['is_new'] == true;

    Map<String, dynamic>? flashSaleItem;
    final flashSaleItems = product['flash_sale_items'] ?? product['flashSaleItems'];
    if (flashSaleItems != null && (flashSaleItems as List).isNotEmpty) {
      final now = DateTime.now();
      for (var item in flashSaleItems) {
        if (item['flash_sale'] != null) {
          final start = DateTime.tryParse(item['flash_sale']['start_at']?.toString().replaceAll(' ', 'T') ?? '');
          final end = DateTime.tryParse(item['flash_sale']['end_at']?.toString().replaceAll(' ', 'T') ?? '');
          if (start != null && end != null && now.isAfter(start) && now.isBefore(end)) {
            final quantityLimit = (item['quantity_limit'] as num?)?.toInt();
            final soldQuantity = (item['sold_quantity'] as num?)?.toInt() ?? 0;
            final isSoldOut = quantityLimit != null && quantityLimit > 0 && soldQuantity >= quantityLimit;
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
    final activeVariants = variants.where((v) => v['is_active'] != false).toList();
    final isSingleVariant = activeVariants.length == 1;

    Map<String, dynamic>? selectedVariant;

    if (activeVariants.isNotEmpty) {
      final sorted = List.from(activeVariants);
      sorted.sort((a, b) {
        final aPrice = double.tryParse(a['effective_price']?.toString() ?? '0') ?? 0;
        final bPrice = double.tryParse(b['effective_price']?.toString() ?? '0') ?? 0;
        return aPrice.compareTo(bPrice);
      });

      final lowest = sorted.first;
      final highest = sorted.last;
      selectedVariant = lowest;

      displayPrice = double.tryParse(lowest['effective_price']?.toString() ?? '0') ?? 0;
      final priceMax = double.tryParse(highest['effective_price']?.toString() ?? '0') ?? 0;
      final originalPrice = double.tryParse(lowest['price']?.toString() ?? '0') ?? 0;

      bool hasMultiplePrices = displayPrice != priceMax;
      showDiscountBadge = isSingleVariant;

      if (isFlashSale) {
        if (flashSaleItem!['variant_id'] != null) {
          final int flashVariantId = int.tryParse(flashSaleItem['variant_id'].toString()) ?? 0;
          if (flashVariantId > 0) {
             final flashVariant = activeVariants.firstWhere((v) => v['id'] == flashVariantId, orElse: () => lowest);
             if (flashVariant != lowest) {
               selectedVariant = flashVariant;
             }
          }
        }
        displayPrice = double.tryParse(flashSaleItem['flash_sale_price']?.toString() ?? '0') ?? 0;
        hasMultiplePrices = false;
        showDiscountBadge = true;
      }

      final hasDiscount = displayPrice < originalPrice && showDiscountBadge;
      displayPriceMax = hasMultiplePrices ? priceMax : null;
      displayOldPrice = hasDiscount ? originalPrice : null;
      discountPercent = hasDiscount ? ((1 - displayPrice / originalPrice) * 100).round() : 0;
    } else {
      displayPrice = double.tryParse(product['price']?.toString() ?? '0') ?? 0;
    }

    final imageUrl = _resolveProductImageUrl(product, selectedVariant: selectedVariant);

    int? totalStock;
    if (variants.isNotEmpty) {
      totalStock = variants.fold<int>(0, (sum, v) => sum + ((v['stock_quantity'] as num?)?.toInt() ?? 0));
    } else {
      totalStock = (product['stock_quantity'] as num?)?.toInt();
    }

    final formatter = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ');

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => ProductDetailScreen(slug: product['slug'] ?? '', variantId: selectedVariant?['id']?.toString())),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Theme.of(context).colorScheme.outlineVariant, width: 1.5),
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
                    padding: const EdgeInsets.all(12),
                    child: Center(
                      child: imageUrl.isEmpty
                          ? Icon(Icons.image, color: Theme.of(context).colorScheme.outlineVariant, size: 40)
                          : Image.network(imageUrl, fit: BoxFit.contain),
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
                          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4)],
                        ),
                        child: Icon(Icons.delete_outline, color: Theme.of(context).colorScheme.onSurfaceVariant, size: 16),
                      ),
                    ),
                  ),
                  if (discountPercent > 0 || isNew)
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: (showDiscountBadge && discountPercent > 0) ? Colors.red : const Color(0xFFF26522),
                          borderRadius: BorderRadius.circular(3),
                        ),
                        child: Text(
                          (showDiscountBadge && discountPercent > 0) ? '-$discountPercent%' : Trans.newBadge,
                          style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800),
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
                          (brand == null || brand.isEmpty ? Trans.brandDefault : brand).toUpperCase(),
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Theme.of(context).colorScheme.onSurfaceVariant, letterSpacing: 0.5),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Row(
                         children: List.generate(5, (i) => Icon(Icons.star, size: 8, color: i < rating ? const Color(0xFFFACC15) : Theme.of(context).colorScheme.surfaceVariant)),
                      )
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Theme.of(context).colorScheme.onSurface, height: 1.25),
                  ),
                  const SizedBox(height: 2),
                  Wrap(
                    spacing: 6,
                    runSpacing: 2,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      if (showDiscountBadge)
                        Text(
                          '${formatter.format(displayPrice)}',
                          style: const TextStyle(color: Color(0xFFF26522), fontWeight: FontWeight.w800, fontSize: 12),
                        )
                      else if (displayPriceMax != null)
                        Text(
                          '${formatter.format(displayPrice)} - ${formatter.format(displayPriceMax)}',
                          style: const TextStyle(color: Color(0xFFF26522), fontWeight: FontWeight.w800, fontSize: 12),
                        )
                      else
                        Text(
                          '${formatter.format(displayPrice)}',
                          style: const TextStyle(color: Color(0xFFF26522), fontWeight: FontWeight.w800, fontSize: 12),
                        ),
                      if (displayOldPrice != null && displayOldPrice > displayPrice && showDiscountBadge)
                        Padding(
                          padding: const EdgeInsets.only(left: 4, bottom: 1),
                          child: Text(
                            '${formatter.format(displayOldPrice)}',
                            style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 10, decoration: TextDecoration.lineThrough),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  if (isFlashSale && flashSaleItem!['flash_sale'] != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: StockBar(
                        isFlashSale: true,
                        flashSaleSold: (flashSaleItem['sold_quantity'] as num?)?.toInt(),
                        flashSaleLimit: (flashSaleItem['quantity_limit'] as num?)?.toInt(),
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
                  Text(
                     excerpt,
                     maxLines: 2,
                     overflow: TextOverflow.ellipsis,
                     style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 10, height: 1.4),
                  )
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  '''

    content = content[:start_idx] + new_func + content[end_idx:]

    resolve_old = 'String _resolveProductImageUrl(Map<String, dynamic> product) {'
    resolve_new = 'String _resolveProductImageUrl(Map<String, dynamic> product, {Map<String, dynamic>? selectedVariant}) {\n    if (selectedVariant != null) {\n       final vImg = selectedVariant[\'image_url\']?.toString().trim();\n       if (vImg != null && vImg.isNotEmpty) return NetworkUtils.fixDeviceUrl(vImg);\n    }'
    content = content.replace(resolve_old, resolve_new)

    with open('d:/E-Tech-Market/e_tech_market_app/lib/screens/wishlist/wishlist_screen.dart', 'w', encoding='utf-8') as f:
        f.write(content)
    print('done')
else:
    print('error finding markers')
