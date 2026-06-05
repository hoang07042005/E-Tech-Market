import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

class ReviewsService {
  static const String _defaultBaseUrl = 'http://192.168.24.14:8000/api';
  static const String _baseUrl =
      String.fromEnvironment('API_BASE_URL', defaultValue: _defaultBaseUrl);

  static Future<List<dynamic>> fetchReviews({
    int minRating = 5,
    int limit = 6,
  }) async {
    final queryParams = <String, String>{
      'min_rating': minRating.toString(),
      'limit': limit.toString(),
    };

    final uri =
        Uri.parse('$_baseUrl/reviews').replace(queryParameters: queryParams);

    final response = await _get(uri);
    final data = jsonDecode(response.body);

    if (data is List) {
      return data;
    }
    return [];
  }

  static Future<Map<String, dynamic>> submitProductReview({
    required int productId,
    required String token,
    required int rating,
    required String comment,
    int? expPerformance,
    int? expBattery,
    int? expCamera,
  }) async {
    final uri = Uri.parse('$_baseUrl/products/$productId/reviews');
    final response = await http
        .post(
          uri,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Bearer $token',
          },
          body: jsonEncode({
            'rating': rating,
            'comment': comment,
            if (expPerformance != null) 'exp_performance': expPerformance,
            if (expBattery != null) 'exp_battery': expBattery,
            if (expCamera != null) 'exp_camera': expCamera,
          }),
        )
        .timeout(const Duration(seconds: 15));

    final data = response.body.isNotEmpty ? jsonDecode(response.body) : {};
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data is Map<String, dynamic> ? data : {};
    }

    final message = data is Map<String, dynamic>
        ? data['message']?.toString() ?? _findFirstError(data)
        : null;
    throw Exception(message ?? 'Khong gui duoc danh gia.');
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
