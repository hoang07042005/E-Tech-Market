import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import 'auth_service.dart';

class CouponService {
  static const String _defaultBaseUrl = 'http://192.168.24.18:8000/api';
  static const String _baseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: _defaultBaseUrl);

  static Future<List<dynamic>> fetchAvailableCoupons() async {
    final uri = Uri.parse('$_baseUrl/coupons?exclude_saved=true');
    final response = await _get(uri);
    final body = json.decode(response.body);

    if (body is List) return body;
    if (body is Map && body['data'] is List) return body['data'] as List<dynamic>;
    return [];
  }

  static Future<String> saveCoupon(String code) async {
    final token = await AuthService.getToken();
    if (token == null) {
      throw Exception('Vui lòng đăng nhập lại để lưu mã giảm giá.');
    }

    final uri = Uri.parse('$_baseUrl/me/coupons/save');
    final response = await _post(uri, token, {'code': code});
    final body = json.decode(response.body);
    if (body is Map<String, dynamic>) {
      return body['message']?.toString() ?? 'Lưu mã thành công.';
    }
    return 'Lưu mã thành công.';
  }

  static Future<http.Response> _get(Uri uri) async {
    try {
      final response = await http
          .get(uri, headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          })
          .timeout(const Duration(seconds: 15));

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return response;
      }

      throw Exception('Lỗi máy chủ ${response.statusCode} khi tải voucher.');
    } on TimeoutException {
      throw Exception('Không thể kết nối tới máy chủ $uri. Vui lòng kiểm tra API và mạng.');
    } on SocketException {
      throw Exception('Lỗi mạng. Không thể kết nối tới $uri.');
    } on http.ClientException {
      throw Exception('Lỗi kết nối HTTP tới $uri.');
    }
  }

  static Future<http.Response> _post(Uri uri, String token, Map<String, dynamic> body) async {
    try {
      final response = await http
          .post(
            uri,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': 'Bearer $token',
            },
            body: json.encode(body),
          )
          .timeout(const Duration(seconds: 15));

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return response;
      }

      String message = 'Lỗi máy chủ ${response.statusCode} khi lưu voucher.';
      try {
        final bodyJson = json.decode(response.body);
        if (bodyJson is Map<String, dynamic>) {
          message = bodyJson['message']?.toString() ?? message;
        }
      } catch (_) {
        // ignore
      }
      throw Exception(message);
    } on TimeoutException {
      throw Exception('Không thể kết nối tới máy chủ $uri. Vui lòng kiểm tra API và mạng.');
    } on SocketException {
      throw Exception('Lỗi mạng. Không thể kết nối tới $uri.');
    } on http.ClientException {
      throw Exception('Lỗi kết nối HTTP tới $uri.');
    }
  }
}
