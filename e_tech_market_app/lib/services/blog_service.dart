import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

class BlogService {
  static const String _defaultBaseUrl = 'http://192.168.24.17:8000/api';
  static const String _baseUrl =
      String.fromEnvironment('API_BASE_URL', defaultValue: _defaultBaseUrl);

  static Future<Map<String, dynamic>> fetchBlogPosts({
    int perPage = 5,
    int page = 1,
  }) async {
    final queryParams = <String, String>{
      'per_page': perPage.toString(),
      'page': page.toString(),
    };

    final uri =
        Uri.parse('$_baseUrl/blog/posts').replace(queryParameters: queryParams);

    final response = await _get(uri);
    final data = jsonDecode(response.body);
    return data;
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
}
