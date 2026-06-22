import 'dart:async';
import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/dio_client.dart';

class AuthService {
  static const String _tokenKey = 'auth_token';
  static const String _userKey = 'auth_user';
  static const _secureStorage = FlutterSecureStorage();

  static Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await DioClient.instance.post('/auth/login', data: {
        'email': email,
        'password': password,
      });
      return await _parseAuthResponse(response.data);
    } catch (e) {
      _handleError(e, 'Đăng nhập thất bại.');
      rethrow;
    }
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

    try {
      final response = await DioClient.instance.post('/auth/google-login', data: {
        'token': auth.idToken,
        'access_token': auth.accessToken,
      });
      return await _parseAuthResponse(response.data);
    } catch (e) {
      _handleError(e, 'Đăng nhập bằng Google thất bại.');
      rethrow;
    }
  }

  static Future<Map<String, dynamic>> register({
    required String name,
    required String email,
    required String password,
    required String phone,
  }) async {
    try {
      final response = await DioClient.instance.post('/auth/register', data: {
        'name': name,
        'email': email,
        'password': password,
        'phone': phone,
      });
      return await _parseAuthResponse(response.data);
    } catch (e) {
      _handleError(e, 'Đăng ký thất bại.');
      rethrow;
    }
  }

  static Future<Map<String, dynamic>> _parseAuthResponse(dynamic body) async {
    if (body is! Map<String, dynamic>) {
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

  static void _handleError(dynamic e, String defaultMessage) {
    if (e is DioException) {
      final data = e.response?.data;
      if (data is Map<String, dynamic>) {
        final message = data['message'] ?? _findFirstError(data) ?? defaultMessage;
        throw Exception(message);
      }
    }
    throw Exception(e is Exception ? e.toString().replaceFirst('Exception: ', '') : defaultMessage);
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
    await _secureStorage.write(key: _tokenKey, value: token);
    await prefs.setString(_userKey, jsonEncode(user));
  }

  static Future<List<Map<String, dynamic>>> fetchSessions(String token) async {
    try {
      final response = await DioClient.instance.get('/me/sessions');
      final body = response.data;
      final data = body['data'];
      if (data is List) {
        return data.map((item) => Map<String, dynamic>.from(item as Map<String, dynamic>)).toList();
      }
      return [];
    } catch (e) {
      _handleError(e, 'Đã xảy ra lỗi khi lấy danh sách phiên.');
      rethrow;
    }
  }

  static Future<void> changePassword({
    required String token,
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      await DioClient.instance.patch('/me/password', data: {
        'current_password': currentPassword,
        'new_password': newPassword,
      });
    } catch (e) {
      _handleError(e, 'Đổi mật khẩu thất bại.');
    }
  }

  static Future<void> forgotPassword(String email) async {
    try {
      await DioClient.instance.post('/auth/forgot-password', data: {'email': email});
    } catch (e) {
      _handleError(e, 'Gửi yêu cầu thất bại. Vui lòng thử lại.');
    }
  }

  static Future<void> resetPassword({
    required String email,
    required String token,
    required String password,
  }) async {
    try {
      await DioClient.instance.post('/auth/reset-password', data: {
        'email': email,
        'token': token,
        'password': password,
        'password_confirmation': password,
      });
    } catch (e) {
      _handleError(e, 'Đặt lại mật khẩu thất bại.');
    }
  }

  static Future<void> clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    await _secureStorage.delete(key: _tokenKey);
    await prefs.remove(_userKey);
  }

  static Future<bool> hasSession() async {
    final token = await _secureStorage.read(key: _tokenKey);
    final prefs = await SharedPreferences.getInstance();
    final hasUser = prefs.getString(_userKey) != null;
    return token != null && token.isNotEmpty && hasUser;
  }

  static Future<Map<String, dynamic>?> getCurrentUser() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = prefs.getString(_userKey);
      if (json == null) return null;
      return jsonDecode(json) as Map<String, dynamic>;
    } catch (e) {
      await clearSession();
      return null;
    }
  }

  static Future<Map<String, dynamic>?> refreshUser() async {
    try {
      final token = await getToken();
      if (token == null) return null;
      
      final response = await DioClient.instance.get('/me');
      final data = response.data;
      if (data != null && data['user'] != null) {
        final user = data['user'] as Map<String, dynamic>;
        await saveSession(token: token, user: user);
        return user;
      }
    } catch (e) {
      // Ignore network errors, fallback to local cache
    }
    return getCurrentUser();
  }

  static Future<String?> getToken() async {
    return await _secureStorage.read(key: _tokenKey);
  }

  static Future<void> deleteAccount({
    required String password,
  }) async {
    try {
      await DioClient.instance.delete('/me', data: {
        'password': password,
      });
      await clearSession();
    } catch (e) {
      _handleError(e, 'Xóa tài khoản thất bại.');
    }
  }
}
