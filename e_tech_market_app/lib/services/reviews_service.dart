import 'package:dio/dio.dart';
import '../../config/dio_client.dart';

class ReviewsService {
  static Future<List<dynamic>> fetchReviews({
    int minRating = 5,
    int limit = 6,
  }) async {
    try {
      final response = await DioClient.instance.get('/reviews', queryParameters: {
        'min_rating': minRating,
        'limit': limit,
      });
      final data = response.data;
      if (data is List) return data;
      return [];
    } catch (_) {
      return [];
    }
  }

  static Future<Map<String, dynamic>> submitProductReview({
    required int productId,
    required String token,
    required int rating,
    required String comment,
    int? expPerformance,
    int? expBattery,
    int? expCamera,
  }) async {
    try {
      final response = await DioClient.instance.post(
        '/products/$productId/reviews',
        data: {
          'rating': rating,
          'comment': comment,
          if (expPerformance != null) 'exp_performance': expPerformance,
          if (expBattery != null) 'exp_battery': expBattery,
          if (expCamera != null) 'exp_camera': expCamera,
        },
      );
      final data = response.data;
      return data is Map<String, dynamic> ? data : {};
    } on DioException catch (e) {
      if (e.response?.data is Map) {
        final data = e.response!.data as Map<String, dynamic>;
        throw Exception(data['message']?.toString() ?? 'Không gửi được đánh giá.');
      }
      throw Exception('Không gửi được đánh giá.');
    }
  }
}
