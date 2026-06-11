import 'package:dio/dio.dart';
import '../../config/dio_client.dart';

class VoucherService {
  static Future<List<dynamic>> fetchMyCoupons() async {
    try {
      final response = await DioClient.instance.get('/me/coupons');
      final body = response.data;
      if (body is List) return body;
      if (body is Map && body['data'] is List) return body['data'] as List<dynamic>;
      return [];
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        throw Exception('Vui lòng đăng nhập lại.');
      }
      throw Exception('Không thể tải voucher: ${e.response?.statusCode ?? 'unknown'}');
    }
  }
}
