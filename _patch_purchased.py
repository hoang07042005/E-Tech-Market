import re

with open('d:/E-Tech-Market/e_tech_market_app/lib/screens/account/profile/_purchased_products_widget.dart', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update _PurchasedProduct class to include variantName
content = content.replace("""class _PurchasedProduct {
  _PurchasedProduct({
    required this.key,
    required this.productId,
    required this.name,
    required this.imageUrl,
    required this.quantity,
    required this.totalAmount,
  });

  final String key;
  final dynamic productId;
  final String name;
  String? imageUrl;
  int quantity;
  double totalAmount;
}""", """class _PurchasedProduct {
  _PurchasedProduct({
    required this.key,
    required this.productId,
    required this.name,
    this.variantName,
    required this.imageUrl,
    required this.quantity,
    required this.totalAmount,
  });

  final String key;
  final dynamic productId;
  final String name;
  final String? variantName;
  String? imageUrl;
  int quantity;
  double totalAmount;
}""")

# 2. Update _load() grouping logic
old_load = """            final product = item['product'] as Map<String, dynamic>?;
            final productId = product?['id'] ?? item['product_id'];
            final productName =
                (product?['name'] ?? item['product_name_snapshot'] ?? 'Sản phẩm').toString();

            final imageUrl = _resolveOrderItemImageUrl(item);
            final key = productId != null
                ? 'id:${productId.toString()}'
                : 'name:${productName.toLowerCase()}';

            final qty = (item['quantity'] ?? 1);"""

new_load = """            final product = item['product'] as Map<String, dynamic>?;
            final productId = product?['id'] ?? item['product_id'];
            final productName =
                (product?['name'] ?? item['product_name_snapshot'] ?? 'Sản phẩm').toString();

            final imageUrl = _resolveOrderItemImageUrl(item);
            
            final variant = item['variant'] as Map<String, dynamic>? ?? <String, dynamic>{};
            final variantId = item['variant_id'];
            String? variantLabel;
            final direct = (variant['variant_name'] ?? variant['name'])?.toString();
            if (direct != null && direct.trim().isNotEmpty) {
              variantLabel = direct.trim();
            } else {
              final parts = [
                variant['color']?.toString(),
                (variant['configuration'] ?? variant['storage'])?.toString(),
              ].where((part) => part != null && part.trim().isNotEmpty).toList();
              final label = parts.join(' · ');
              variantLabel = label.isEmpty ? null : label;
            }

            final key = productId != null
                ? 'id:${productId.toString()}_var:${variantId?.toString() ?? '0'}'
                : 'name:${productName.toLowerCase()}_var:${variantId?.toString() ?? '0'}';

            final qty = (item['quantity'] ?? 1);"""

content = content.replace(old_load, new_load)

# 3. Update map[key] assignment
old_assign = """              map[key] = _PurchasedProduct(
                key: key,
                productId: productId,
                name: productName,
                imageUrl: imageUrl,
                quantity: qtyNum,
                totalAmount: amount,
              );"""

new_assign = """              map[key] = _PurchasedProduct(
                key: key,
                productId: productId,
                name: productName,
                variantName: variantLabel,
                imageUrl: imageUrl,
                quantity: qtyNum,
                totalAmount: amount,
              );"""

content = content.replace(old_assign, new_assign)

# 4. Update _buildProductRow
old_row = """                Text(
                  p.name,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 6),
                Text(
                  'Số lượng: ${p.quantity}',"""

new_row = """                Text(
                  p.name,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                if (p.variantName != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    'Phân loại: ${p.variantName}',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                      fontSize: 12,
                    ),
                  ),
                ],
                const SizedBox(height: 6),
                Text(
                  'Số lượng: ${p.quantity}',"""

content = content.replace(old_row, new_row)

with open('d:/E-Tech-Market/e_tech_market_app/lib/screens/account/profile/_purchased_products_widget.dart', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done patching _purchased_products_widget.dart")
