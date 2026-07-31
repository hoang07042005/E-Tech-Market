import sys

with open('d:/E-Tech-Market/e_tech_market_app/lib/screens/home_sections/product_section.dart', 'r', encoding='utf-8') as f:
    content = f.read()

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
    with open('d:/E-Tech-Market/e_tech_market_app/lib/screens/home_sections/product_section.dart', 'w', encoding='utf-8') as f:
        f.write(content)
    print("done")
else:
    print("Failed to find active variants else block")
