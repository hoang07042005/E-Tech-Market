import 'package:dio/dio.dart';
import '../../config/dio_client.dart';

class NotificationService {
  static Future<Map<String, dynamic>> fetchNotifications({int page = 1, int perPage = 20}) async {
    try {
      final response = await DioClient.instance.get('/notifications', queryParameters: {
        'page': page,
        'per_page': perPage,
      });
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        throw Exception('Vui lòng đăng nhập để xem thông báo.');
      }
      throw Exception('Không thể tải thông báo.');
    }
  }

  static Future<void> markAsRead(int id) async {
    try {
      await DioClient.instance.patch('/notifications/$id/read');
    } catch (_) {}
  }

  static Future<void> markAllAsRead() async {
    try {
      await DioClient.instance.patch('/notifications/read-all');
    } catch (_) {}
  }
}
