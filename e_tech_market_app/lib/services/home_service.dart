import 'package:dio/dio.dart';
import '../../config/dio_client.dart';

class HomeService {
  /// Unified home data - replaces 8 separate API calls with 1
  static Future<Map<String, dynamic>> fetchHomeData() async {
    try {
      final response = await DioClient.instance.get('/home');
      final data = response.data;
      if (data is Map<String, dynamic>) return data;
      return {};
    } on DioException catch (e) {
      throw Exception(_extractErrorMessage(e));
    }
  }

  static String _extractErrorMessage(DioException e) {
    final data = e.response?.data;
    if (data is Map && data['message'] != null) {
      return data['message'].toString();
    }
    if (e.type == DioExceptionType.connectionTimeout) {
      return 'Kết nối quá thời gian. Vui lòng thử lại.';
    }
    if (e.type == DioExceptionType.connectionError) {
      return 'Không kết nối được máy chủ.';
    }
    return 'Đã xảy ra lỗi. Vui lòng thử lại.';
  }
}