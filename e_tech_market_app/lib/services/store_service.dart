import '../../config/dio_client.dart';

class StoreService {
  static Future<Map<String, dynamic>> fetchConfig() async {
    try {
      final response = await DioClient.instance.get('/store/config');
      return response.data as Map<String, dynamic>;
    } catch (_) {
      return {};
    }
  }
}
