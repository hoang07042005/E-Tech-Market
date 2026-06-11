import 'dart:io';
import 'package:dio/dio.dart';
import '../../config/dio_client.dart';

class AdminProductsService {
  static Future<List<dynamic>> fetchAdminProducts() async {
    try {
      final response = await DioClient.instance.get(
        '/admin/products',
        queryParameters: {'per_page': 100},
      );
      final data = response.data;
      if (data is Map<String, dynamic> && data['data'] != null) {
        return data['data'] as List<dynamic>;
      }
      return data is List ? data : [];
    } on DioException catch (e) {
      throw Exception('Không thể tải danh sách sản phẩm: ${e.response?.statusCode}');
    }
  }

  static Future<List<dynamic>> fetchAdminCategories() async {
    try {
      final response = await DioClient.instance.get('/admin/categories');
      final data = response.data;
      return data is List ? data : ((data['data'] ?? []) as List<dynamic>);
    } on DioException catch (e) {
      throw Exception('Không thể tải danh mục: ${e.response?.statusCode}');
    }
  }

  static Future<Map<String, dynamic>> fetchAdminProductDetail(int id) async {
    try {
      final response = await DioClient.instance.get('/admin/products/$id');
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception('Không thể tải chi tiết sản phẩm: ${e.response?.statusCode}');
    }
  }

  static Future<void> saveAdminProduct({
    int? id,
    required Map<String, String> fields,
    File? mainImage,
    List<File>? additionalImages,
    List<File?>? variantImages,
  }) async {
    final endpoint = id != null ? '/admin/products/$id' : '/admin/products';

    final formData = FormData.fromMap({
      ...fields,
      // Laravel expects _method=PUT for update via POST+multipart
      if (id != null) '_method': 'PUT',
    });

    if (mainImage != null && mainImage.existsSync()) {
      formData.files.add(MapEntry(
        'main_image',
        await MultipartFile.fromFile(mainImage.path),
      ));
    }

    if (additionalImages != null) {
      for (final file in additionalImages) {
        if (file.existsSync()) {
          formData.files.add(MapEntry(
            'images[]',
            await MultipartFile.fromFile(file.path),
          ));
        }
      }
    }

    if (variantImages != null) {
      for (int i = 0; i < variantImages.length; i++) {
        final imgFile = variantImages[i];
        if (imgFile != null && imgFile.existsSync()) {
          formData.files.add(MapEntry(
            'variants[$i][image]',
            await MultipartFile.fromFile(imgFile.path),
          ));
        }
      }
    }

    try {
      await DioClient.instance.post(endpoint, data: formData);
    } on DioException catch (e) {
      if (e.response?.data is Map) {
        final data = e.response!.data as Map<String, dynamic>;
        throw Exception(data['message'] ?? 'Lỗi lưu sản phẩm (${e.response?.statusCode})');
      }
      throw Exception('Lỗi lưu sản phẩm (${e.response?.statusCode})');
    }
  }

  static Future<void> deleteAdminProduct(int id) async {
    try {
      await DioClient.instance.delete('/admin/products/$id');
    } on DioException catch (e) {
      throw Exception('Lỗi xóa sản phẩm: ${e.response?.statusCode}');
    }
  }
}