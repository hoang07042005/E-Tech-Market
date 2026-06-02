import 'dart:convert';
import 'package:http/http.dart' as http;
import 'auth_service.dart';

class WishlistService {
  static const String _defaultBaseUrl = 'http://192.168.24.17:8000/api';
  static const String _baseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: _defaultBaseUrl);

  static Future<List<dynamic>> fetchWishlist() async {
    final token = await AuthService.getToken();
    if (token == null) return [];

    final uri = Uri.parse('$_baseUrl/wishlist');
    try {
      final response = await http.get(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded is List) {
          return decoded;
        }
      }
    } catch (e) {
      // ignore
    }
    return [];
  }

  static Future<String?> toggleWishlist(int productId) async {
    final token = await AuthService.getToken();
    if (token == null) return null;

    final uri = Uri.parse('$_baseUrl/wishlist/toggle');
    try {
      final response = await http.post(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'product_id': productId}),
      );
      
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        return decoded['status'] as String?; // 'added' or 'removed'
      }
    } catch (e) {
      // ignore
    }
    return null;
  }
}
