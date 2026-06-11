import 'dart:async';
import 'dart:io';

import 'package:dio/dio.dart';

import '../../config/dio_client.dart';

class OrderService {
  static Future<Map<String, dynamic>> fetchOrders({int page = 1}) async {
    try {
      final response = await DioClient.instance.get('/orders', queryParameters: {'page': page});
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(_extractErrorMessage(e));
    }
  }

  static Future<Map<String, dynamic>> fetchOrderDetail(int id) async {
    try {
      final response = await DioClient.instance.get('/orders/$id');
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(_extractErrorMessage(e));
    }
  }

  static Future<Map<String, dynamic>> cancelOrder(int id) async {
    try {
      final response = await DioClient.instance.patch('/orders/$id/cancel');
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(_extractErrorMessage(e));
    }
  }

  static Future<Map<String, dynamic>> confirmPayment(int id) async {
    try {
      final response = await DioClient.instance.patch('/orders/$id/confirm-payment');
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(_extractErrorMessage(e));
    }
  }

  static Future<Map<String, dynamic>> confirmReceived(int id) async {
    try {
      final response = await DioClient.instance.patch('/orders/$id/confirm-received');
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(_extractErrorMessage(e));
    }
  }

  static Future<Map<String, dynamic>> requestReturn(int id, String content, List<File> mediaFiles) async {
    try {
      final formData = FormData.fromMap({
        'content': content,
      });

      for (var file in mediaFiles) {
        formData.files.add(MapEntry(
          'media[]',
          await MultipartFile.fromFile(file.path),
        ));
      }

      final response = await DioClient.instance.post(
        '/orders/$id/return-request',
        data: formData,
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(_extractErrorMessage(e));
    }
  }

  static Future<Map<String, dynamic>> confirmRefundReceived(int id) async {
    try {
      final response = await DioClient.instance.patch('/orders/$id/return-request/confirm-refund');
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(_extractErrorMessage(e));
    }
  }

  static String _extractErrorMessage(DioException e) {
    if (e.response?.data is Map) {
      final data = e.response!.data as Map<String, dynamic>;
      return data['message']?.toString() ?? 'Có lỗi xảy ra, vui lòng thử lại sau.';
    }
    return 'Có lỗi xảy ra, vui lòng thử lại sau.';
  }
}
