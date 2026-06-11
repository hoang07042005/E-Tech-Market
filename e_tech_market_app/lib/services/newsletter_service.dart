import 'package:dio/dio.dart';
import '../../config/dio_client.dart';

class NewsletterService {
  static Future<Map<String, dynamic>> subscribeToNewsletter({
    required String email,
    String source = 'home',
  }) async {
    try {
      final response = await DioClient.instance.post(
        '/newsletter/subscriptions',
        data: {'email': email, 'source': source},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      if (e.response?.data is Map) {
        final data = e.response!.data as Map<String, dynamic>;
        throw Exception(data['message']?.toString() ?? 'Đăng ký newsletter thất bại.');
      }
      throw Exception('Lỗi mạng khi đăng ký newsletter.');
    }
  }
}
