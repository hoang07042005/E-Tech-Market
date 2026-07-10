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
      baseUrl: ApiConfig.apiBaseUrl, // sẽ được cập nhật động bên dưới
      connectTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 20),
      headers: {
        'Accept': 'application/json',
        // Cho backend biết đây là app mobile (không dùng cookie được) —
        // để backend luôn trả token trong body kể cả khi chạy production/https.
        'X-Client-Platform': 'mobile',
      },
    ));

    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        // Cập nhật baseUrl động mỗi request — hỗ trợ auto-discovery IP
        final currentBase = ApiConfig.apiBaseUrl;
        if (options.baseUrl != currentBase) {
          options.baseUrl = currentBase;
        }
        // Đọc token mới nhất trước mỗi request
        final token = await AuthService.getToken();
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException e, handler) async {
        // Khi token hết hạn / không hợp lệ → chỉ xóa session ngầm, không điều hướng ép buộc.
        //
        // QUAN TRỌNG: chỉ xoá session nếu request bị 401 THỰC SỰ đã gửi kèm
        // token hiện tại. Nếu request không có Authorization header (gọi API
        // công khai, hoặc request cũ bắn ra trước khi đăng nhập xong) mà nhận
        // 401, hoặc token trong request đã cũ hơn token hiện tại (do vừa
        // đăng nhập lại) thì KHÔNG được xoá — tránh race condition xoá mất
        // session vừa lưu (ví dụ: request nền bắn đi lúc chưa đăng nhập,
        // response 401 về SAU khi đăng nhập Google vừa xong → tưởng nhầm là
        // token mới cũng bị từ chối và tự động logout).
        if (e.response?.statusCode == 401) {
          final sentAuthHeader = e.requestOptions.headers['Authorization'] as String?;
          if (sentAuthHeader != null && sentAuthHeader.isNotEmpty) {
            final currentToken = await AuthService.getToken();
            final currentAuthHeader =
                (currentToken != null && currentToken.isNotEmpty) ? 'Bearer $currentToken' : null;
            final isStillSameToken = currentAuthHeader == null || sentAuthHeader == currentAuthHeader;
            if (isStillSameToken) {
              await AuthService.clearSession();
              DioClient.reset(); // Tạo Dio mới cho lần đăng nhập kế tiếp
            }
          }
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