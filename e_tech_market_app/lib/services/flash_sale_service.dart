import '../../config/dio_client.dart';

class FlashSaleService {
  static Future<dynamic> fetchCurrentFlashSale() async {
    try {
      final response = await DioClient.instance.get('/flash-sale/current');
      final data = response.data;
      // API có thể trả về Map (1 flash sale) hoặc List (nhiều flash sale)
      if (data is Map<String, dynamic>) return data;
      if (data is List) return data;
      return null;
    } catch (_) {
      return null;
    }
  }
}