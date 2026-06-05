import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'auth_service.dart';

class NotificationService {
  static const String _defaultBaseUrl = 'http://192.168.24.14:8000/api';
  static const String _baseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: _defaultBaseUrl);

  static Future<Map<String, dynamic>> fetchNotifications({int page = 1, int perPage = 20}) async {
    final token = await AuthService.getToken();
    if (token == null) throw Exception('Vui lòng đăng nhập để xem thông báo.');

    final uri = Uri.parse('$_baseUrl/notifications?page=$page&per_page=$perPage');
    final response = await _get(uri, token);
    return jsonDecode(response.body);
  }

  static Future<void> markAsRead(int id) async {
    final token = await AuthService.getToken();
    if (token == null) return;

    final uri = Uri.parse('$_baseUrl/notifications/$id/read');
    await _patch(uri, token, {});
  }

  static Future<void> markAllAsRead() async {
    final token = await AuthService.getToken();
    if (token == null) return;

    final uri = Uri.parse('$_baseUrl/notifications/read-all');
    await _patch(uri, token, {});
  }

  static Future<http.Response> _get(Uri uri, String token) async {
    try {
      final response = await http.get(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return response;
      }
      throw Exception('Server error: ${response.statusCode}');
    } on TimeoutException {
      throw Exception('Kết nối thất bại. Vui lòng thử lại.');
    } on SocketException {
      throw Exception('Lỗi mạng. Vui lòng kiểm tra kết nối.');
    }
  }

  static Future<http.Response> _patch(Uri uri, String token, Map<String, dynamic> body) async {
    try {
      final response = await http.patch(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(body),
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return response;
      }
      throw Exception('Server error: ${response.statusCode}');
    } on TimeoutException {
      throw Exception('Kết nối thất bại. Vui lòng thử lại.');
    } on SocketException {
      throw Exception('Lỗi mạng. Vui lòng kiểm tra kết nối.');
    }
  }
}
