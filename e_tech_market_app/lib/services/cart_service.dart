import 'package:dio/dio.dart';

import '../utils/network_utils.dart';
import 'auth_service.dart';
import '../../config/dio_client.dart';

class CartItem {
  final int id;
  final int productId;
  final int? variantId;
  final String slug;
  final String name;
  final String? variantLabel;
  final String? variantColor;
  final String? variantConfig;
  final String? imageUrl;
  final double unitPrice;
  final int quantity;

  const CartItem({
    required this.id,
    required this.productId,
    required this.variantId,
    required this.slug,
    required this.name,
    required this.variantLabel,
    required this.variantColor,
    required this.variantConfig,
    required this.imageUrl,
    required this.unitPrice,
    required this.quantity,
  });

  double get lineTotal => unitPrice * quantity;

  factory CartItem.fromJson(Map<String, dynamic> json) {
    final product = json['product'] is Map<String, dynamic>
        ? json['product'] as Map<String, dynamic>
        : <String, dynamic>{};
    final variant = json['variant'] is Map<String, dynamic>
        ? json['variant'] as Map<String, dynamic>
        : <String, dynamic>{};
    final image = _imageFrom(variant['image_url'] ?? product['main_image_url']);

    final color = variant['color']?.toString().trim();
    final config = (variant['configuration'] ?? variant['storage'])?.toString().trim();

    return CartItem(
      id: _toInt(json['id']),
      productId: _toInt(json['product_id'] ?? product['id']),
      variantId: json['variant_id'] == null ? null : _toInt(json['variant_id']),
      slug: product['slug']?.toString() ?? '',
      name: product['name']?.toString() ?? 'San pham',
      variantLabel: _variantLabel(variant),
      variantColor: (color != null && color.isNotEmpty) ? color : null,
      variantConfig: (config != null && config.isNotEmpty) ? config : null,
      imageUrl: image.isEmpty ? null : image,
      unitPrice: _toDouble(json['unit_price'] ?? variant['effective_price'] ?? product['price']),
      quantity: _toInt(json['quantity']).clamp(1, 999),
    );
  }

  static String? _variantLabel(Map<String, dynamic> variant) {
    final direct = (variant['variant_name'] ?? variant['name'])?.toString();
    if (direct != null && direct.trim().isNotEmpty) return direct.trim();
    final parts = [
      variant['color']?.toString(),
      (variant['configuration'] ?? variant['storage'])?.toString(),
    ].where((part) => part != null && part.trim().isNotEmpty).cast<String>();
    final label = parts.join(' · ');
    return label.isEmpty ? null : label;
  }
}

class CartState {
  final int id;
  final List<CartItem> items;

  const CartState({required this.id, required this.items});

  int get totalQuantity => items.fold(0, (sum, item) => sum + item.quantity);
  double get totalPrice => items.fold(0, (sum, item) => sum + item.lineTotal);

  factory CartState.empty() => const CartState(id: 0, items: []);

  factory CartState.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'];
    return CartState(
      id: _toInt(json['id']),
      items: rawItems is List
          ? rawItems
              .whereType<Map<String, dynamic>>()
              .map(CartItem.fromJson)
              .where((item) => item.productId > 0)
              .toList()
          : [],
    );
  }
}


class CartService {

  static Future<CartState> fetchCart() async {
    await _requireToken();
    final response = await _send(() => DioClient.instance.get('/cart'));
    return CartState.fromJson(response.data as Map<String, dynamic>);
  }

  static Future<CartState> addItem({
    required int productId,
    int? variantId,
    int quantity = 1,
    double? price,
  }) async {
    await _requireToken();
    final response = await _send(
      () => DioClient.instance.post(
        '/cart/items',
        data: {
          'product_id': productId,
          if (variantId != null) 'variant_id': variantId,
          'quantity': quantity.clamp(1, 999),
          if (price != null) 'unit_price': price,
        },
      ),
    );
    return CartState.fromJson(response.data as Map<String, dynamic>);
  }

  static Future<CartState> updateItemQuantity({
    required int productId,
    required int quantity,
  }) async {
    await _requireToken();
    final response = await _send(
      () => DioClient.instance.put(
        '/cart/items/$productId',
        data: {'quantity': quantity.clamp(1, 999)},
      ),
    );
    return CartState.fromJson(response.data as Map<String, dynamic>);
  }

  static Future<CartState> removeItem({required int productId}) async {
    await _requireToken();
    final response = await _send(
      () => DioClient.instance.delete('/cart/items/$productId'),
    );
    return CartState.fromJson(response.data as Map<String, dynamic>);
  }

  static Future<CartState> removeItems(List<CartItem> items, {CartState? currentCart}) async {
    var next = currentCart ?? CartState.empty();
    for (final item in List<CartItem>.from(items)) {
      next = await removeItem(productId: item.productId);
    }
    return next;
  }

  static Future<CartState> clearCart(CartState cart) async {
    return removeItems(cart.items, currentCart: cart);
  }

  static Future<String> _requireToken() async {
    final token = await AuthService.getToken();
    if (token == null || token.isEmpty) {
      throw Exception('Vui long dang nhap de su dung gio hang.');
    }
    return token;
  }

  static Future<Response> _send(Future<Response> Function() request) async {
    try {
      final response = await request();
      if (response.statusCode != null && response.statusCode! >= 200 && response.statusCode! < 300) {
        return response;
      }
      final body = response.data is Map ? response.data as Map<String, dynamic> : <String, dynamic>{};
      final message = body['message']?.toString() ?? _findFirstError(body);
      throw Exception(message ?? 'Khong the cap nhat gio hang.');
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout || e.type == DioExceptionType.receiveTimeout) {
        throw Exception('Ket noi gio hang qua cham. Vui long thu lai.');
      }
      if (e.response != null) {
        final body = e.response!.data is Map ? e.response!.data as Map<String, dynamic> : <String, dynamic>{};
        final message = body['message']?.toString() ?? _findFirstError(body);
        throw Exception(message ?? 'Loi he thong.');
      }
      throw Exception('Khong the ket noi may chu gio hang.');
    }
  }

  static String? _findFirstError(Map<String, dynamic> body) {
    for (final value in body.values) {
      if (value is String && value.isNotEmpty) return value;
      if (value is List && value.isNotEmpty && value.first is String) {
        return value.first as String;
      }
    }
    return null;
  }

  static Future<void> addToCart(int productId, int quantity, {int? variantId, double? price}) async {
    await addItem(productId: productId, quantity: quantity, variantId: variantId, price: price);
  }
}

double _toDouble(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString().replaceAll(',', '') ?? '') ?? 0;
}

int _toInt(dynamic value) {
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}

String _imageFrom(dynamic value) {
  final raw = value?.toString().trim() ?? '';
  return raw.isEmpty ? '' : NetworkUtils.fixDeviceUrl(raw);
}
