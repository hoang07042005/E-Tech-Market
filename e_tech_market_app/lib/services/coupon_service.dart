import 'package:dio/dio.dart';
import '../../config/dio_client.dart';

class CouponService {
  static Future<List<dynamic>> fetchAvailableCoupons() async {
    try {
      final response = await DioClient.instance.get('/coupons', queryParameters: {'exclude_saved': true});
      final body = response.data;
      if (body is List) return body;
      if (body is Map && body['data'] is List) return body['data'] as List<dynamic>;
      return [];
    } catch (_) {
      return [];
    }
  }

  static Future<String> saveCoupon(String code) async {
    try {
      final response = await DioClient.instance.post('/me/coupons/save', data: {'code': code});
      final body = response.data;
      if (body is Map<String, dynamic>) {
        return body['message']?.toString() ?? 'Lưu mã thành công.';
      }
      return 'Lưu mã thành công.';
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        throw Exception('Vui lòng đăng nhập lại để lưu mã giảm giá.');
      }
      if (e.response?.data is Map) {
        final data = e.response!.data as Map<String, dynamic>;
        throw Exception(data['message']?.toString() ?? 'Không thể lưu mã giảm giá.');
      }
      throw Exception('Không thể lưu mã giảm giá.');
    }
  }
}
