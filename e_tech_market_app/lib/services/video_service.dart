import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

class VideoService {
  static const String _defaultBaseUrl = 'http://192.168.24.18:8000/api';
  static const String _baseUrl =
      String.fromEnvironment('API_BASE_URL', defaultValue: _defaultBaseUrl);

  static Future<List<dynamic>> fetchVideos({
    int limit = 4,
  }) async {
    final queryParams = <String, String>{
      'limit': limit.toString(),
    };

    final uri = Uri.parse('$_baseUrl/videos').replace(queryParameters: queryParams);

    final response = await _get(uri);
    final data = jsonDecode(response.body);
    
    if (data is List) {
      return data;
    }
    return [];
  }

  static Future<Map<String, dynamic>?> fetchVideoById(int id) async {
    final uri = Uri.parse('$_baseUrl/videos/$id');
    try {
      final response = await _get(uri);
      return jsonDecode(response.body) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
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
