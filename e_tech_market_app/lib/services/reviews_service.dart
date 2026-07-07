import 'package:dio/dio.dart';
import '../../config/dio_client.dart';
import '../../config/api_config.dart';

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

  /// Gửi đánh giá sản phẩm. [mediaFiles] là danh sách đường dẫn file ảnh/video trên thiết bị.
  static Future<Map<String, dynamic>> submitProductReview({
    required int productId,
    required String token,
    required int rating,
    required String comment,
    int? expPerformance,
    int? expBattery,
    int? expCamera,
    List<String> mediaFiles = const [],
  }) async {
    try {
      final formData = FormData.fromMap({
        'rating': rating,
        'comment': comment,
        if (expPerformance != null) 'exp_performance': expPerformance,
        if (expBattery != null) 'exp_battery': expBattery,
        if (expCamera != null) 'exp_camera': expCamera,
      });

      // Thêm từng file media vào FormData dưới key 'media[]'
      for (final path in mediaFiles) {
        formData.files.add(MapEntry(
          'media[]',
          await MultipartFile.fromFile(path),
        ));
      }

      final dio = Dio(BaseOptions(
        baseUrl: ApiConfig.apiBaseUrl,
        headers: {
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ));

      final response = await dio.post(
        '/products/$productId/reviews',
        data: formData,
      );
      final data = response.data;
      return data is Map<String, dynamic> ? data : {};
    } on DioException catch (e) {
      if (e.response?.data is Map) {
        final data = e.response!.data as Map<String, dynamic>;
        throw Exception(data['message']?.toString() ?? 'Không gửi được đánh giá.');
      }
      throw Exception('Lỗi kết nối: ${e.message}');
    }
  }
}
 