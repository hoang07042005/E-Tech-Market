import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import 'auth_service.dart';
import '../config/api_config.dart';

class OrderService {
  static const String _baseUrl = ApiConfig.apiBaseUrl;


  static Future<Map<String, dynamic>> fetchOrders({int page = 1}) async {
    final token = await AuthService.getToken();
    if (token == null) {
      throw Exception('Vui lòng đăng nhập lại.');
    }

    final uri = Uri.parse('$_baseUrl/orders').replace(queryParameters: {
      'page': page.toString(),
    });

    final response = await _get(uri, token);
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> fetchOrderDetail(int id) async {
    final token = await AuthService.getToken();
    if (token == null) {
      throw Exception('Vui lòng đăng nhập lại.');
    }

    final uri = Uri.parse('$_baseUrl/orders/$id');
    final response = await _get(uri, token);
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> cancelOrder(int id) async {
    final token = await AuthService.getToken();
    if (token == null) {
      throw Exception('Vui lòng đăng nhập lại.');
    }

    final uri = Uri.parse('$_baseUrl/orders/$id/cancel');
    final response = await _patch(uri, token, {});
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> confirmPayment(int id) async {
    final token = await AuthService.getToken();
    if (token == null) {
      throw Exception('Vui lòng đăng nhập lại.');
    }

    final uri = Uri.parse('$_baseUrl/orders/$id/confirm-payment');
    final response = await _patch(uri, token, {});
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> confirmReceived(int id) async {
    final token = await AuthService.getToken();
    if (token == null) {
      throw Exception('Vui lòng đăng nhập lại.');
    }

    final uri = Uri.parse('$_baseUrl/orders/$id/confirm-received');
    final response = await _patch(uri, token, {});
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> requestReturn(int id, String content, List<File> mediaFiles) async {
    final token = await AuthService.getToken();
    if (token == null) {
      throw Exception('Vui lòng đăng nhập lại.');
    }

    final uri = Uri.parse('$_baseUrl/orders/$id/return-request');
    final response = await _postMultipart(uri, token, content, mediaFiles);
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> confirmRefundReceived(int id) async {
    final token = await AuthService.getToken();
    if (token == null) {
      throw Exception('Vui lòng đăng nhập lại.');
    }

    final uri = Uri.parse('$_baseUrl/orders/$id/return-request/confirm-refund');
    final response = await _patch(uri, token, {});
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  static Future<http.Response> _get(Uri uri, String token) async {
    try {
      final response = await http
          .get(uri, headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Bearer $token',
          })
          .timeout(const Duration(seconds: 15));

      _ensureSuccess(response, uri);
      return response;
    } on TimeoutException {
      throw Exception('Không thể kết nối tới $uri. Vui lòng kiểm tra API và mạng.');
    } on SocketException {
      throw Exception('Lỗi mạng. Không thể kết nối tới $uri.');
    } on http.ClientException {
      throw Exception('Lỗi kết nối HTTP tới $uri.');
    }
  }

  static Future<http.Response> _patch(Uri uri, String token, Object body) async {
    try {
      final response = await http
          .patch(uri, headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Bearer $token',
          }, body: jsonEncode(body))
          .timeout(const Duration(seconds: 15));

      _ensureSuccess(response, uri);
      return response;
    } on TimeoutException {
      throw Exception('Không thể kết nối tới $uri. Vui lòng kiểm tra API và mạng.');
    } on SocketException {
      throw Exception('Lỗi mạng. Không thể kết nối tới $uri.');
    } on http.ClientException {
      throw Exception('Lỗi kết nối HTTP tới $uri.');
    }
  }

  static Future<http.Response> _postMultipart(
    Uri uri,
    String token,
    String content,
    List<File> mediaFiles,
  ) async {
    final request = http.MultipartRequest('POST', uri)
      ..headers['Authorization'] = 'Bearer $token'
      ..fields['content'] = content;

    for (final file in mediaFiles) {
      final multipartFile = await http.MultipartFile.fromPath('media[]', file.path);
      request.files.add(multipartFile);
    }

    try {
      final streamedResponse = await request.send().timeout(const Duration(seconds: 30));
      final response = await http.Response.fromStream(streamedResponse);
      _ensureSuccess(response, uri);
      return response;
    } on TimeoutException {
      throw Exception('Không thể kết nối tới $uri. Vui lòng kiểm tra API và mạng.');
    } on SocketException {
      throw Exception('Lỗi mạng. Không thể kết nối tới $uri.');
    } on http.ClientException {
      throw Exception('Lỗi kết nối HTTP tới $uri.');
    }
  }

  static void _ensureSuccess(http.Response response, Uri uri) {
    if (response.statusCode < 200 || response.statusCode >= 300) {
      String message = 'Lỗi máy chủ ${response.statusCode} khi kết nối tới $uri.';
      try {
        final body = jsonDecode(response.body);
        if (body is Map<String, dynamic>) {
          message = body['message']?.toString() ?? message;
        }
      } catch (_) {
        // ignore
      }
      throw Exception(message);
    }
  }
}
