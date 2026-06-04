import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

class ProductsService {
  static const String _defaultBaseUrl = 'http://192.168.24.18:8000/api';
  static const String _baseUrl =
      String.fromEnvironment('API_BASE_URL', defaultValue: _defaultBaseUrl);

  static Future<Map<String, dynamic>> fetchProducts({
    int page = 1,
    int? limit,
    String? search,
    String? sort,
    String? order,
    double? minPrice,
    double? maxPrice,
    String? categoryId,
    String? brand,
    int? isFeatured,
  }) async {
    final queryParams = <String, String>{
      'page': page.toString(),
    };

    if (limit != null) {
      queryParams['limit'] = limit.toString();
    }

    if (search != null && search.isNotEmpty) {
      queryParams['search'] = search;
    }
    if (sort != null && sort.isNotEmpty) {
      queryParams['sort'] = sort;
    }
    if (order != null && order.isNotEmpty) {
      queryParams['order'] = order;
    }
    if (minPrice != null) {
      queryParams['min_price'] = minPrice.toStringAsFixed(0);
    }
    if (maxPrice != null) {
      queryParams['max_price'] = maxPrice.toStringAsFixed(0);
    }
    if (categoryId != null && categoryId.isNotEmpty) {
      queryParams['category_id'] = categoryId;
    }
    if (brand != null && brand.isNotEmpty) {
      queryParams['brand'] = brand;
    }
    if (isFeatured != null) {
      queryParams['is_featured'] = isFeatured.toString();
    }

    final uri =
        Uri.parse('$_baseUrl/products').replace(queryParameters: queryParams);

    final response = await _get(uri);
    final data = jsonDecode(response.body);
    return data; // Returns PaginatedResponse
  }

  static Future<Map<String, dynamic>> fetchProductBySlug(String slug) async {
    final encodedSlug = Uri.encodeComponent(slug);
    final uri = Uri.parse('$_baseUrl/products/$encodedSlug');

    final response = await _get(uri);
    final data = jsonDecode(response.body);
    if (data is Map<String, dynamic>) {
      final product = data['data'];
      if (product is Map<String, dynamic>) return product;
      return data;
    }
    throw Exception('Invalid product response');
  }

  static Future<Map<String, dynamic>> fetchRelatedProducts(String slug) async {
    final encodedSlug = Uri.encodeComponent(slug);
    final uri = Uri.parse('$_baseUrl/products/$encodedSlug/related');

    final response = await _get(uri);
    final data = jsonDecode(response.body);
    if (data is Map<String, dynamic>) return data;
    return {};
  }

  static Future<List<dynamic>> fetchProductShopQnas(String slug) async {
    final encodedSlug = Uri.encodeComponent(slug);
    final uri = Uri.parse('$_baseUrl/products/$encodedSlug/shop-qna');

    final response = await _get(uri);
    final data = jsonDecode(response.body);
    if (data is List) return data;
    if (data is Map<String, dynamic> && data['data'] is List) {
      return data['data'] as List<dynamic>;
    }
    return [];
  }

  static Future<Map<String, dynamic>> submitProductShopQna({
    required String slug,
    required String question,
    String? guestName,
    String? token,
  }) async {
    final encodedSlug = Uri.encodeComponent(slug);
    final uri = Uri.parse('$_baseUrl/products/$encodedSlug/shop-qna');
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
    final body = <String, dynamic>{
      'question': question,
      if (guestName != null && guestName.trim().isNotEmpty)
        'guest_name': guestName.trim(),
    };

    final response = await http
        .post(uri, headers: headers, body: jsonEncode(body))
        .timeout(const Duration(seconds: 15));
    final data = response.body.isNotEmpty ? jsonDecode(response.body) : {};
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data is Map<String, dynamic> ? data : {};
    }
    final message = data is Map<String, dynamic>
        ? data['message']?.toString()
        : null;
    throw Exception(message ?? 'Cannot submit product question');
  }

  static Future<List<dynamic>> fetchCategories() async {
    final uri = Uri.parse('$_baseUrl/categories?type=product');
    final response = await _get(uri);
    final data = jsonDecode(response.body);
    if (data is List) return data;
    if (data['data'] is List) return data['data'];
    return [];
  }

  static Future<http.Response> _get(Uri uri) async {
    try {
      final response = await http.get(uri, headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }).timeout(const Duration(seconds: 15));

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return response;
      }

      throw Exception('Server error: ${response.statusCode}');
    } on TimeoutException {
      throw Exception('Timeout when connecting to $uri.');
    } on SocketException {
      throw Exception('Network error. Cannot connect to $uri.');
    }
  }

  // Thêm hàm này vào trong class ProductsService để gọi API thực tế
  static Future<Map<String, dynamic>> fetchProductNewsBySlug(String slug) async {
    final uri = Uri.parse('$_baseUrl/product-news/$slug'); // Kiểm tra lại endpoint này trên backend của bạn
    
    try {
      final response = await http.get(uri, headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }).timeout(const Duration(seconds: 15));

      final data = jsonDecode(response.body);
      
      if (response.statusCode >= 200 && response.statusCode < 300) {
        // Nếu backend bọc data trong khối { success: true, data: {...} } thì trả về data['data']
        if (data is Map<String, dynamic> && data['data'] != null) {
          return data['data'];
        }
        return data is Map<String, dynamic> ? data : {};
      }

      final message = data is Map<String, dynamic> ? data['message']?.toString() : null;
      throw Exception(message ?? 'Server error: ${response.statusCode}');
    } catch (e) {
      throw Exception('Không tải được tin tức sản phẩm: $e');
    }
  }
}
