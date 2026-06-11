import 'package:dio/dio.dart';
import '../../config/dio_client.dart';

class BannerService {
  static Future<List<dynamic>> fetchActiveBanners() async {
    try {
      final response = await DioClient.instance.get('/banners');
      final body = response.data;
      if (body is List) return body;
      if (body is Map && body['data'] is List) return body['data'] as List<dynamic>;
      return [];
    } catch (_) {
      return [];
    }
  }
}
