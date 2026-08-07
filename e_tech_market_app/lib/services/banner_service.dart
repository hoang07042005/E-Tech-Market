import 'package:dio/dio.dart';
import '../../config/dio_client.dart';

class BannerService {
  static Future<List<dynamic>> fetchActiveBanners() async {
    try {
      final response = await DioClient.instance.get('/banners');
      final body = response.data;

      List<dynamic> list = [];
      if (body is List) {
        list = body;
      } else if (body is Map && body['data'] is List) {
        list = body['data'] as List<dynamic>;
      }

      // Lọc ra các banner có trạng thái is_active
      return list.where((b) {
        final isActive = b['is_active'];
        return isActive == 1 || isActive == true || isActive == '1';
      }).toList();
    } catch (_) {
      return [];
    }
  }
}
