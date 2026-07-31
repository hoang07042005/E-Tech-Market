import sys

with open('d:/E-Tech-Market/e_tech_market_app/lib/screens/wishlist/wishlist_screen.dart', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace _buildListOrGrid for product
old_grid = """    if (widget.type == 'product') {
      return SliverPadding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        sliver: SliverGrid(
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisSpacing: 16,
            crossAxisSpacing: 16,
            childAspectRatio: 0.48, // Taller for progress bar and price wrap
          ),
          delegate: SliverChildBuilderDelegate(
            (context, index) {
              final product = items[index]['product'];
              if (product == null) return const SizedBox.shrink();
              return _buildProductCard(product);
            },
            childCount: items.length,
          ),
        ),
      );
    } else if"""

new_grid = """    if (widget.type == 'product') {
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
    } else if"""

if old_grid in content:
    content = content.replace(old_grid, new_grid)
else:
    print("Failed to find old grid")

# Replace activeVariants logic in _buildProductCard
old_active_variants_else = """    } else {
      displayPrice = double.tryParse(product['price']?.toString() ?? '0') ?? 0;
    }"""

new_active_variants_else = """    } else {
      final originalPrice = double.tryParse(product['price']?.toString() ?? '0') ?? 0;
      displayPrice = originalPrice;
      if (product['discount_price'] != null) {
         displayPrice = double.tryParse(product['discount_price']?.toString() ?? '0') ?? originalPrice;
      }
      showDiscountBadge = true;
      
      if (isFlashSale) {
        displayPrice = double.tryParse(flashSaleItem!['flash_sale_price']?.toString() ?? '0') ?? 0;
      }

      final hasDiscount = displayPrice < originalPrice && showDiscountBadge;
      displayOldPrice = hasDiscount ? originalPrice : null;
      discountPercent = hasDiscount ? ((1 - displayPrice / originalPrice) * 100).round() : 0;
    }"""

if old_active_variants_else in content:
    content = content.replace(old_active_variants_else, new_active_variants_else)
else:
    print("Failed to find active variants else block")

with open('d:/E-Tech-Market/e_tech_market_app/lib/screens/wishlist/wishlist_screen.dart', 'w', encoding='utf-8') as f:
    f.write(content)

print("done")
