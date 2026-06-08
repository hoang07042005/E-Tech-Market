import 'dart:convert';

import 'package:http/http.dart' as http;

import 'auth_service.dart';
import '../config/api_config.dart';

class WishlistService {
  static const String _baseUrl = ApiConfig.apiBaseUrl;

  static Set<int> _wishlistIds = {};

  static Future<List<dynamic>> fetchWishlist() async {
    final token = await AuthService.getToken();
    if (token == null || token.isEmpty) return [];

    final uri = Uri.parse('$_baseUrl/wishlist');
    try {
      final response = await http.get(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final decoded = jsonDecode(response.body);
        if (decoded is List) return decoded;
      }
    } catch (_) {
      // Wishlist is optional during page rendering.
    }
    return [];
  }

  static Future<String?> toggleWishlist(int productId) async {
    final token = await AuthService.getToken();
    if (token == null || token.isEmpty) {
      throw Exception('Vui long dang nhap de them san pham yeu thich.');
    }

    final uri = Uri.parse('$_baseUrl/wishlist/toggle');
    final response = await http.post(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'product_id': productId}),
    );

    final decoded = response.body.isNotEmpty ? jsonDecode(response.body) : {};
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (decoded is Map<String, dynamic>) {
        return decoded['status'] as String?;
      }
      return null;
    }

    if (decoded is Map<String, dynamic>) {
      final message =
          decoded['message']?.toString() ?? _findFirstError(decoded);
      throw Exception(message ?? 'Khong the cap nhat yeu thich.');
    }

    throw Exception(
        'Khong the cap nhat yeu thich. HTTP ${response.statusCode}');
  }

  static Future<void> loadWishlist() async {
    final list = await fetchWishlist();
    _wishlistIds = list.map((item) => _toInt(item['product_id'])).toSet();
  }

  static bool isFavorite(int productId) => _wishlistIds.contains(productId);

  static Future<void> toggleFavorite(int productId) async {
    final wasFavorite = _wishlistIds.contains(productId);
    if (wasFavorite) {
      _wishlistIds.remove(productId);
    } else {
      _wishlistIds.add(productId);
    }

    try {
      final status = await toggleWishlist(productId);
      if (status == 'added') {
        _wishlistIds.add(productId);
      } else if (status == 'removed') {
        _wishlistIds.remove(productId);
      }
    } catch (_) {
      if (wasFavorite) {
        _wishlistIds.add(productId);
      } else {
        _wishlistIds.remove(productId);
      }
      rethrow;
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

  static int _toInt(dynamic value) {
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }
}
