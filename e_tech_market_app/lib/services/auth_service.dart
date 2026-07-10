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
    String? otp,
  }) async {
    try {
      final response = await DioClient.instance.post('/auth/login', data: {
        'email': email,
        'password': password,
        if (otp != null && otp.isNotEmpty) 'otp': otp,
      });
      return await _parseAuthResponse(response.data);
    } catch (e) {
      if (e is DioException) {
        final data = e.response?.data;
        if (e.response?.statusCode == 403 && data is Map && data['requires_2fa'] == true) {
          return parseLoginResponse(data);
        }
      }
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
    final parsed = parseLoginResponse(body);
    if (parsed['requires_2fa'] == true) {
      return parsed;
    }

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

  static Map<String, dynamic> parseLoginResponse(dynamic body) {
    if (body is Map) {
      final data = Map<String, dynamic>.from(
        body.map((key, value) => MapEntry(key.toString(), value)),
      );
      if (data['requires_2fa'] == true) {
        return {
          'requires_2fa': true,
          'message': data['message']?.toString() ?? 'Vui lòng nhập mã 2FA.',
        };
      }
    }
    return {'requires_2fa': false};
  }

  static void _handleError(dynamic e, String defaultMessage) {
    if (e is DioException) {
      final statusCode = e.response?.statusCode;
      final data = e.response?.data;

      // Lỗi kết nối / timeout
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.sendTimeout) {
        throw Exception('Kết nối máy chủ quá thời gian. Vui lòng thử lại.');
      }
      if (e.type == DioExceptionType.connectionError) {
        throw Exception('Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng.');
      }

      if (data is Map<String, dynamic>) {
        // Ưu tiên lấy message từ backend rồi dịch sang tiếng Việt
        final rawMessage = data['message']?.toString() ??
            _findFirstError(data) ??
            defaultMessage;
        throw Exception(_translateError(rawMessage, statusCode, defaultMessage));
      }

      // Body là String (một số backend trả plain text)
      if (data is String && data.isNotEmpty) {
        throw Exception(_translateError(data, statusCode, defaultMessage));
      }

      // HTTP status code không có body (hoặc body không parse được)
      if (statusCode == 401) throw Exception('Email hoặc mật khẩu không chính xác. Vui lòng thử lại.');
      if (statusCode == 403) throw Exception('Bạn không có quyền thực hiện thao tác này.');
      if (statusCode == 404) throw Exception('Không tìm thấy tài khoản với email này.');
      if (statusCode == 422) throw Exception('Dữ liệu nhập vào không hợp lệ.');
      if (statusCode == 429) throw Exception('Bạn đã thử quá nhiều lần. Vui lòng đợi một lúc.');
      if (statusCode != null && statusCode >= 500) throw Exception('Lỗi máy chủ. Vui lòng thử lại sau.');
    }
    throw Exception(defaultMessage);
  }

  /// Dịch thông báo lỗi tiếng Anh từ backend sang tiếng Việt
  static String _translateError(String raw, int? statusCode, String fallback) {
    final lower = raw.toLowerCase();

    // ── Đăng nhập / Sai mật khẩu ──
    if (lower.contains('credentials do not match') ||
        lower.contains('invalid credentials') ||
        lower.contains('these credentials') ||
        lower.contains('wrong password') ||
        lower.contains('password is incorrect') ||
        lower.contains('incorrect password') ||
        lower.contains('password mismatch') ||
        lower.contains('the provided password') ||
        lower.contains('given password') ||
        lower.contains('unauthenticated') ||
        lower.contains('unauthorized') ||
        statusCode == 401) {
      return 'Email hoặc mật khẩu không chính xác. Vui lòng thử lại.';
    }

    // ── Email ──
    if (lower.contains('email has already been taken') ||
        lower.contains('email already exists') ||
        lower.contains('already registered')) {
      return 'Email này đã được đăng ký. Vui lòng dùng email khác hoặc đăng nhập.';
    }
    if (lower.contains('email') && lower.contains('invalid')) {
      return 'Địa chỉ email không hợp lệ.';
    }
    if (lower.contains('email') && lower.contains('required')) {
      return 'Vui lòng nhập địa chỉ email.';
    }

    // ── Mật khẩu ──
    if (lower.contains('password') && (lower.contains('min') || lower.contains('least 8') || lower.contains('at least 6'))) {
      return 'Mật khẩu phải có ít nhất 6 ký tự.';
    }
    if (lower.contains('password') && lower.contains('confirmation')) {
      return 'Xác nhận mật khẩu không khớp.';
    }
    if (lower.contains('current password') || lower.contains('old password')) {
      return 'Mật khẩu hiện tại không đúng.';
    }

    // ── Số điện thoại ──
    if (lower.contains('phone') && lower.contains('taken')) {
      return 'Số điện thoại này đã được sử dụng.';
    }
    if (lower.contains('phone') && lower.contains('invalid')) {
      return 'Số điện thoại không hợp lệ.';
    }

    // ── Tài khoản ──
    if (lower.contains('account') && lower.contains('deactivated') ||
        lower.contains('account') && lower.contains('disabled') ||
        lower.contains('account') && lower.contains('banned')) {
      return 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ hỗ trợ.';
    }
    if (lower.contains('user not found') || lower.contains('account not found')) {
      return 'Không tìm thấy tài khoản với email này.';
    }
    if (lower.contains('too many') || lower.contains('rate limit')) {
      return 'Bạn đã thử quá nhiều lần. Vui lòng đợi một lúc rồi thử lại.';
    }

    // ── Validation chung ──
    if (lower.contains('required')) return 'Vui lòng điền đầy đủ thông tin bắt buộc.';
    if (lower.contains('invalid')) return 'Thông tin không hợp lệ. Vui lòng kiểm tra lại.';

    // ── Lỗi server ──
    if (statusCode != null && statusCode >= 500) {
      return 'Lỗi hệ thống. Vui lòng thử lại sau ít phút.';
    }

    // Nếu message gốc đã là tiếng Việt (có dấu) thì dùng luôn
    if (_isVietnamese(raw)) return raw;

    // Fallback
    return fallback;
  }

  /// Kiểm tra chuỗi có chứa ký tự tiếng Việt không
  static bool _isVietnamese(String text) {
    return RegExp(r'[àáạảãăắặẳẵâấầẩẫèéẹẻẽêếềệểễìíịỉĩòóọỏõôốồộổỗơớờợởỡùúụủũưứừựửữỳýỵỷỹđÀÁẠẢÃĂẮẶẲẴÂẤẦẨẪÈÉẸẺẼÊẾỀỆỂỄÌÍỊỈĨÒÓỌỎÕÔỐỒỘỔỖƠỚỜỢỞỠÙÚỤỦŨƯỨỪỰỬỮỲÝỴỶỸĐ]')
        .hasMatch(text);
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

    // Google SDK tự cache phiên đăng nhập ở ngoài phạm vi app (không nằm
    // trong secure storage/prefs ở trên). Nếu không sign-out ở đây, lần
    // đăng nhập Google kế tiếp sẽ tự động trả về tài khoản cũ mà không
    // hiện màn hình chọn tài khoản.
    try {
      await GoogleSignIn(scopes: ['email', 'profile']).signOut();
    } catch (_) {
      // Bỏ qua nếu chưa từng đăng nhập Google / không có kết nối — không
      // được để lỗi này chặn việc xoá session của app.
    }
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