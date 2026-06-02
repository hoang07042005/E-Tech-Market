import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:google_sign_in/google_sign_in.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class AuthService {
  // Android emulator should use 10.0.2.2 to reach the host machine's localhost.
  // If you run on iOS simulator, physical device, or a different host, override with API_BASE_URL.
  static const String _defaultBaseUrl = 'http://192.168.24.17:8000/api';
  static const String _baseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: _defaultBaseUrl);
  static const String _tokenKey = 'auth_token';
  static const String _userKey = 'auth_user';

  static Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final uri = Uri.parse('$_baseUrl/auth/login');
    final response = await _post(uri, {
      'email': email,
      'password': password,
    });

    return _parseAuthResponse(response);
  }

  static Future<Map<String, dynamic>> loginWithGoogle() async {
    final googleSignIn = GoogleSignIn(scopes: ['email', 'profile']);
    final account = await googleSignIn.signIn();
    if (account == null) {
      throw Exception('Đăng nhập Google đã bị hủy.');
    }

    final auth = await account.authentication;
    final token = auth.idToken ?? auth.accessToken;
    if (token == null || token.isEmpty) {
      throw Exception('Không thể lấy mã xác thực Google.');
    }

    final uri = Uri.parse('$_baseUrl/auth/google-login');
    final response = await _post(uri, {
      'token': auth.idToken,
      'access_token': auth.accessToken,
    });

    return _parseAuthResponse(response);
  }

  static Future<Map<String, dynamic>> register({
    required String name,
    required String email,
    required String password,
    required String phone,
  }) async {
    final uri = Uri.parse('$_baseUrl/auth/register');
    final response = await _post(uri, {
      'name': name,
      'email': email,
      'password': password,
      'phone': phone,
    });

    return _parseAuthResponse(response);
  }

  static Future<Map<String, dynamic>> _parseAuthResponse(http.Response response) async {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      late final Map<String, dynamic> body;
      try {
        body = jsonDecode(response.body) as Map<String, dynamic>;
      } catch (_) {
        throw Exception('Phản hồi máy chủ không hợp lệ.');
      }

      final token = body['token'] as String?;
      final user = body['user'] as Map<String, dynamic>?;

      if (token == null || user == null) {
        throw Exception('Phản hồi máy chủ không hợp lệ.');
      }

      await saveSession(token: token, user: user);
      return {'user': user, 'token': token};
    }

    final body = response.body.isNotEmpty
        ? (jsonDecode(response.body) as Map<String, dynamic>)
        : <String, dynamic>{};
    final message = body['message'] ?? _findFirstError(body) ?? 'Đã xảy ra lỗi khi kết nối tới máy chủ.';
    throw Exception(message);
  }

  static String? _findFirstError(Map<String, dynamic> body) {
    for (final value in body.values) {
      if (value is String && value.isNotEmpty) {
        return value;
      }
      if (value is List && value.isNotEmpty && value.first is String) {
        return value.first as String;
      }
    }
    return null;
  }

  static Future<void> saveSession({
    required String token,
    required Map<String, dynamic> user,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
    await prefs.setString(_userKey, jsonEncode(user));
  }

  static Future<List<Map<String, dynamic>>> fetchSessions(String token) async {
    final uri = Uri.parse('$_baseUrl/me/sessions');
    final response = await _get(uri, token);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final body = jsonDecode(response.body) as Map<String, dynamic>;
      final data = body['data'];
      if (data is List) {
        return data
            .map((item) => Map<String, dynamic>.from(item as Map<String, dynamic>))
            .toList();
      }
      return [];
    }

    final body = response.body.isNotEmpty
        ? jsonDecode(response.body) as Map<String, dynamic>
        : <String, dynamic>{};
    final message = body['message'] ?? _findFirstError(body) ?? 'Đã xảy ra lỗi khi lấy danh sách phiên.';
    throw Exception(message);
  }

  static Future<void> changePassword({
    required String token,
    required String currentPassword,
    required String newPassword,
  }) async {
    final uri = Uri.parse('$_baseUrl/me/password');
    final response = await _patch(uri, token, {
      'current_password': currentPassword,
      'new_password': newPassword,
    });

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return;
    }

    final body = response.body.isNotEmpty
        ? jsonDecode(response.body) as Map<String, dynamic>
        : <String, dynamic>{};
    final message = body['message'] ?? _findFirstError(body) ?? 'Đổi mật khẩu thất bại.';
    throw Exception(message);
  }

  static Future<http.Response> _get(Uri uri, String token) async {
    try {
      return await http.get(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 15));
    } on TimeoutException {
      throw Exception('Không thể kết nối tới máy chủ $uri. Vui lòng kiểm tra API và mạng.');
    } on SocketException {
      throw Exception('Lỗi mạng. Không thể kết nối tới $uri. Kiểm tra kết nối và địa chỉ API.');
    } on http.ClientException {
      throw Exception('Lỗi kết nối HTTP tới $uri. Kiểm tra địa chỉ API và mạng.');
    }
  }

  static Future<http.Response> _patch(Uri uri, String token, Map<String, dynamic> body) async {
    try {
      return await http
          .patch(
            uri,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 15));
    } on TimeoutException {
      throw Exception('Không thể kết nối tới máy chủ $uri. Vui lòng kiểm tra API và mạng.');
    } on SocketException {
      throw Exception('Lỗi mạng. Không thể kết nối tới $uri. Kiểm tra kết nối và địa chỉ API.');
    } on http.ClientException {
      throw Exception('Lỗi kết nối HTTP tới $uri. Kiểm tra địa chỉ API và mạng.');
    }
  }

  static Future<void> clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);
  }

  static Future<bool> hasSession() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.containsKey(_tokenKey);
  }

  static Future<Map<String, dynamic>?> getCurrentUser() async {
    final prefs = await SharedPreferences.getInstance();
    final json = prefs.getString(_userKey);
    if (json == null) return null;
    return jsonDecode(json) as Map<String, dynamic>;
  }

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  static Future<http.Response> _post(Uri uri, Map<String, dynamic> body) async {
    try {
      return await http
          .post(uri, headers: {'Content-Type': 'application/json'}, body: jsonEncode(body))
          .timeout(const Duration(seconds: 15));
    } on TimeoutException {
      throw Exception('Không thể kết nối tới máy chủ $uri. Vui lòng kiểm tra API và mạng.');
    } on SocketException {
      throw Exception('Lỗi mạng. Không thể kết nối tới $uri. Kiểm tra kết nối và địa chỉ API.');
    } on http.ClientException {
      throw Exception('Lỗi kết nối HTTP tới $uri. Kiểm tra địa chỉ API và mạng.');
    }
  }
}
