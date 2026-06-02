import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

class ProductsService {
  static const String _defaultBaseUrl = 'http://192.168.24.17:8000/api';
  static const String _baseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: _defaultBaseUrl);

  static Future<Map<String, dynamic>> fetchProducts({
    int page = 1,
    int limit = 12,
    String? search,
    String? sort,
    String? order,
    double? minPrice,
    double? maxPrice,
    String? categoryId,
    String? brand,
  }) async {
    final queryParams = <String, String>{
      'page': page.toString(),
      'limit': limit.toString(),
    };

    if (search != null && search.isNotEmpty) queryParams['search'] = search;
    if (sort != null && sort.isNotEmpty) queryParams['sort'] = sort;
    if (order != null && order.isNotEmpty) queryParams['order'] = order;
    if (minPrice != null) queryParams['min_price'] = minPrice.toStringAsFixed(0);
    if (maxPrice != null) queryParams['max_price'] = maxPrice.toStringAsFixed(0);
    if (categoryId != null && categoryId.isNotEmpty) queryParams['category_id'] = categoryId;
    if (brand != null && brand.isNotEmpty) queryParams['brand'] = brand;

    final uri = Uri.parse('$_baseUrl/products').replace(queryParameters: queryParams);

    final response = await _get(uri);
    final data = jsonDecode(response.body);
    return data; // Returns PaginatedResponse
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
      final response = await http
          .get(uri, headers: {'Content-Type': 'application/json', 'Accept': 'application/json'})
          .timeout(const Duration(seconds: 15));
          
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
}
