import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../utils/network_utils.dart';
import 'auth_service.dart';

class CartItem {
  final int id;
  final int productId;
  final int? variantId;
  final String slug;
  final String name;
  final String? variantLabel;
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
    final image = _imageFrom(product['main_image_url']);

    return CartItem(
      id: _toInt(json['id']),
      productId: _toInt(json['product_id'] ?? product['id']),
      variantId: json['variant_id'] == null ? null : _toInt(json['variant_id']),
      slug: product['slug']?.toString() ?? '',
      name: product['name']?.toString() ?? 'San pham',
      variantLabel: _variantLabel(variant),
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
      variant['storage']?.toString(),
    ].where((part) => part != null && part.trim().isNotEmpty).cast<String>();
    final label = parts.join(' - ');
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
  static const String _defaultBaseUrl = 'http://192.168.24.18:8000/api';
  static const String _baseUrl =
      String.fromEnvironment('API_BASE_URL', defaultValue: _defaultBaseUrl);

  static Future<CartState> fetchCart() async {
    final token = await _requireToken();
    final response = await _send(
      () => http.get(Uri.parse('$_baseUrl/cart'), headers: _headers(token)),
    );
    return CartState.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  static Future<CartState> addItem({
    required int productId,
    int? variantId,
    int quantity = 1,
  }) async {
    final token = await _requireToken();
    final response = await _send(
      () => http.post(
        Uri.parse('$_baseUrl/cart/items'),
        headers: _headers(token),
        body: jsonEncode({
          'product_id': productId,
          if (variantId != null) 'variant_id': variantId,
          'quantity': quantity.clamp(1, 999),
        }),
      ),
    );
    return CartState.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  static Future<CartState> updateItemQuantity({
    required int productId,
    required int quantity,
  }) async {
    final token = await _requireToken();
    final response = await _send(
      () => http.put(
        Uri.parse('$_baseUrl/cart/items/$productId'),
        headers: _headers(token),
        body: jsonEncode({'quantity': quantity.clamp(1, 999)}),
      ),
    );
    return CartState.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  static Future<CartState> removeItem({required int productId}) async {
    final token = await _requireToken();
    final response = await _send(
      () => http.delete(
        Uri.parse('$_baseUrl/cart/items/$productId'),
        headers: _headers(token),
      ),
    );
    return CartState.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  static Future<CartState> clearCart(CartState cart) async {
    var next = cart;
    for (final item in List<CartItem>.from(cart.items)) {
      next = await removeItem(productId: item.productId);
    }
    return next;
  }

  static Future<String> _requireToken() async {
    final token = await AuthService.getToken();
    if (token == null || token.isEmpty) {
      throw Exception('Vui long dang nhap de su dung gio hang.');
    }
    return token;
  }

  static Map<String, String> _headers(String token) => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer $token',
      };

  static Future<http.Response> _send(Future<http.Response> Function() request) async {
    try {
      final response = await request().timeout(const Duration(seconds: 15));
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return response;
      }
      final body = response.body.isNotEmpty
          ? jsonDecode(response.body) as Map<String, dynamic>
          : <String, dynamic>{};
      final message = body['message']?.toString() ?? _findFirstError(body);
      throw Exception(message ?? 'Khong the cap nhat gio hang.');
    } on TimeoutException {
      throw Exception('Ket noi gio hang qua cham. Vui long thu lai.');
    } on SocketException {
      throw Exception('Khong the ket noi may chu gio hang.');
    } on http.ClientException {
      throw Exception('Loi ket noi HTTP toi gio hang.');
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

  static Future<void> addToCart(int productId, int quantity, {int? variantId}) async {
    await addItem(productId: productId, quantity: quantity, variantId: variantId);
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
