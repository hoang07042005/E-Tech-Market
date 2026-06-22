import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../main.dart' show navigatorKey;
import '../services/auth_service.dart';
import '../screens/auth/login_screen.dart';
import '../screens/home_screen.dart';
import 'api_config.dart';

class DioClient {
  static Dio? _instance;

  static Dio get instance {
    _instance ??= _createDio();
    return _instance!;
  }

  static bool _isRedirecting = false;

  static Dio _createDio() {
    final dio = Dio(BaseOptions(
      baseUrl: ApiConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    ));

    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        // Đọc token mới nhất trước mỗi request
        final token = await AuthService.getToken();
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException e, handler) async {
        // Khi token hết hạn / không hợp lệ → chỉ xóa session ngầm, không điều hướng ép buộc
        if (e.response?.statusCode == 401) {
          await AuthService.clearSession();
          DioClient.reset(); // Tạo Dio mới cho lần đăng nhập kế tiếp
        }
        return handler.next(e);
      },
    ));

    return dio;
  }

  /// Gọi sau khi đăng nhập / đăng xuất để tạo instance mới với token sạch
  static void reset() {
    _instance = null;
  }
}
