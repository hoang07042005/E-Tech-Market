import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

class BannerService {
  static const String _defaultBaseUrl = 'http://192.168.24.17:8000/api';
  static const String _baseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: _defaultBaseUrl);

  static Future<List<dynamic>> fetchActiveBanners() async {
    final uri = Uri.parse('$_baseUrl/banners');
    final response = await _get(uri);
    final body = json.decode(response.body);

    if (body is List) return body;
    if (body is Map && body['data'] is List) return body['data'] as List<dynamic>;
    return [];
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

      throw Exception('Lỗi máy chủ ${response.statusCode} khi tải banner.');
    } on TimeoutException {
      throw Exception('Không thể kết nối tới máy chủ $uri. Vui lòng kiểm tra API và mạng.');
    } on SocketException {
      throw Exception('Lỗi mạng. Không thể kết nối tới $uri.');
    } on http.ClientException {
      throw Exception('Lỗi kết nối HTTP tới $uri.');
    }
  }
}
