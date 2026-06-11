import '../../config/dio_client.dart';

class FlashSaleService {
  static Future<Map<String, dynamic>?> fetchCurrentFlashSale() async {
    try {
      final response = await DioClient.instance.get('/flash-sale/current');
      final data = response.data;
      if (data is Map<String, dynamic>) return data;
      return null;
    } catch (_) {
      return null;
    }
  }
}