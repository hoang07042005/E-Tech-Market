import '../../config/dio_client.dart';

class VideoService {
  static Future<List<dynamic>> fetchVideos({int limit = 4}) async {
    try {
      final response = await DioClient.instance.get('/videos', queryParameters: {'limit': limit});
      final data = response.data;
      if (data is List) return data;
      return [];
    } catch (_) {
      return [];
    }
  }

  static Future<Map<String, dynamic>?> fetchVideoById(int id) async {
    try {
      final response = await DioClient.instance.get('/videos/$id');
      return response.data as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }
}
