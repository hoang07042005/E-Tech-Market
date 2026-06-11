import 'dart:io';
import 'package:dio/dio.dart';
import '../../config/dio_client.dart';

class AdminOrdersService {
  static Future<Map<String, dynamic>> fetchAdminOrders({
    int page = 1,
    int perPage = 10,
    String? orderCode,
    String? customer,
    String? dateFrom,
    String? dateTo,
    String? status,
    String? paymentMethod,
    String? paymentStatus,
    String? returnRequests,
  }) async {
    final params = <String, dynamic>{
      'page': page,
      'per_page': perPage,
    };

    if (orderCode?.isNotEmpty ?? false) params['order_code'] = orderCode!;
    if (customer?.isNotEmpty ?? false) params['customer'] = customer!;
    if (dateFrom?.isNotEmpty ?? false) params['date_from'] = dateFrom!;
    if (dateTo?.isNotEmpty ?? false) params['date_to'] = dateTo!;
    if (status != null && status != 'all') params['status'] = status;
    if (paymentMethod != null && paymentMethod != 'all') params['payment_method'] = paymentMethod;
    if (paymentStatus != null && paymentStatus != 'all') params['payment_status'] = paymentStatus;
    if (returnRequests?.isNotEmpty ?? false) params['return_requests'] = returnRequests!;

    try {
      final response = await DioClient.instance.get('/admin/orders', queryParameters: params);
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception('Lỗi tải đơn hàng: ${e.response?.statusCode ?? 'unknown'}');
    }
  }

  static Future<Map<String, dynamic>> fetchAdminOrderDetail(int orderId) async {
    try {
      final response = await DioClient.instance.get('/admin/orders/$orderId');
      final data = response.data;
      if (data is Map<String, dynamic>) {
        return data['data'] ?? data;
      }
      return {};
    } on DioException catch (e) {
      throw Exception('Lỗi tải chi tiết đơn: ${e.response?.statusCode ?? 'unknown'}');
    }
  }

  static Future<Map<String, dynamic>> updateAdminOrder(
    int orderId, {
    required String status,
  }) async {
    try {
      final response = await DioClient.instance.patch(
        '/admin/orders/$orderId',
        data: {'status': status},
      );
      final data = response.data;
      if (data is Map<String, dynamic>) {
        return data['data'] ?? data;
      }
      return {};
    } on DioException catch (e) {
      throw Exception('Lỗi cập nhật trạng thái: ${e.response?.statusCode ?? 'unknown'}');
    }
  }

  static Future<Map<String, dynamic>> processOrderReturn(
    int orderId,
    String action, {
    String? adminNote,
    List<String>? refundProofPaths,
  }) async {
    final actionSegment = action == 'approve'
        ? 'approve'
        : (action == 'reject' ? 'reject' : 'refunded');
    final endpoint = '/admin/orders/$orderId/return-request/$actionSegment';

    try {
      // With files → multipart
      if (refundProofPaths != null && refundProofPaths.isNotEmpty) {
        final formData = FormData.fromMap({
          'action': action,
          if (adminNote != null && adminNote.isNotEmpty) 'admin_note': adminNote,
        });
        for (final path in refundProofPaths) {
          formData.files.add(MapEntry(
            'refund_proof[]',
            await MultipartFile.fromFile(path),
          ));
        }
        final response = await DioClient.instance.post(endpoint, data: formData);
        final data = response.data;
        if (data is Map<String, dynamic>) return data['data'] ?? data;
        return {};
      }

      // Without files → JSON
      final response = await DioClient.instance.post(endpoint, data: {
        'action': action,
        if (adminNote != null && adminNote.isNotEmpty) 'admin_note': adminNote,
      });
      final data = response.data;
      if (data is Map<String, dynamic>) return data['data'] ?? data;
      return {};
    } on DioException catch (e) {
      throw Exception('Lỗi xử lý hoàn trả ($action): ${e.response?.statusCode ?? 'unknown'}');
    }
  }

  static String formatVnd(num amount) {
    return amount
        .toStringAsFixed(0)
        .replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.');
  }

  static String formatViTime(String? isoString) {
    if (isoString == null || isoString.isEmpty) return '—';
    try {
      final dt = DateTime.parse(isoString);
      return '${dt.day}/${dt.month}/${dt.year} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return '—';
    }
  }

  static String formatDate(String? isoString) {
    if (isoString == null || isoString.isEmpty) return '—';
    try {
      final dt = DateTime.parse(isoString);
      return '${dt.day}/${dt.month}/${dt.year}';
    } catch (_) {
      return '—';
    }
  }
}
