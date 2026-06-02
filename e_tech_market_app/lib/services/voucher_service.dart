import 'dart:convert';

import 'package:http/http.dart' as http;

import 'auth_service.dart';

class VoucherService {
  static const String _defaultBaseUrl = 'http://192.168.24.17:8000/api';
  static const String _baseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: _defaultBaseUrl);

  static Future<List<dynamic>> fetchMyCoupons() async {
    final token = await AuthService.getToken();
    if (token == null) {
      throw Exception('Vui lòng đăng nhập lại.');
    }

    final uri = Uri.parse('$_baseUrl/me/coupons');
    final response = await _get(uri, token);
    final body = json.decode(response.body);
    if (body is List) return body;
    if (body is Map && body['data'] is List) return body['data'] as List<dynamic>;
    return [];
  }

  static Future<http.Response> _get(Uri uri, String token) async {
    final response = await http.get(uri, headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': 'Bearer $token',
    }).timeout(const Duration(seconds: 15));

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Không thể tải voucher: ${response.statusCode}');
    }

    return response;
  }
}
