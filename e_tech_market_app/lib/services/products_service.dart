import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../config/dio_client.dart';

class ProductsService {
  static Future<Map<String, dynamic>> fetchProducts({
    int page = 1,
    int? limit,
    String? search,
    String? sort,
    String? order,
    double? minPrice,
    double? maxPrice,
    String? categoryId,
    String? brand,
    int? isFeatured,
  }) async {
    final queryParams = <String, dynamic>{
      'page': page,
      '_t': DateTime.now().millisecondsSinceEpoch,
    };

    if (limit != null) queryParams['limit'] = limit;
    if (search != null && search.isNotEmpty) queryParams['search'] = search;
    if (sort != null && sort.isNotEmpty) queryParams['sort'] = sort;
    if (order != null && order.isNotEmpty) queryParams['order'] = order;
    if (minPrice != null) queryParams['min_price'] = minPrice.toStringAsFixed(0);
    if (maxPrice != null) queryParams['max_price'] = maxPrice.toStringAsFixed(0);
    if (categoryId != null && categoryId.isNotEmpty) queryParams['category_id'] = categoryId;
    if (brand != null && brand.isNotEmpty) queryParams['brand'] = brand;
    if (isFeatured != null) queryParams['is_featured'] = isFeatured;

    try {
      final response = await DioClient.instance.get('/products', queryParameters: queryParams);
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(_extractErrorMessage(e));
    }
  }

  static Future<Map<String, dynamic>> fetchProductBySlug(String slug) async {
    try {
      final response = await DioClient.instance.get('/products/$slug');
      final data = response.data;
      if (data is Map<String, dynamic>) {
        final product = data['data'];
        if (product is Map<String, dynamic>) return product;
        return data;
      }
      throw Exception('Invalid product response');
    } on DioException catch (e) {
      throw Exception(_extractErrorMessage(e));
    }
  }

  static Future<Map<String, dynamic>> fetchRelatedProducts(String slug) async {
    try {
      final response = await DioClient.instance.get('/products/$slug/related');
      final data = response.data;
      if (data is Map<String, dynamic>) return data;
      return {};
    } on DioException catch (e) {
      throw Exception(_extractErrorMessage(e));
    }
  }

  static Future<List<dynamic>> fetchProductShopQnas(String slug) async {
    try {
      final response = await DioClient.instance.get('/products/$slug/shop-qna');
      final data = response.data;
      if (data is List) return data;
      if (data is Map<String, dynamic> && data['data'] is List) {
        return data['data'] as List<dynamic>;
      }
      return [];
    } on DioException catch (e) {
      throw Exception(_extractErrorMessage(e));
    }
  }

  static Future<Map<String, dynamic>> submitProductShopQna({
    required String slug,
    required String question,
    String? guestName,
    String? token,
  }) async {
    try {
      final response = await DioClient.instance.post(
        '/products/$slug/shop-qna',
        data: {
          'question': question,
          if (guestName != null && guestName.trim().isNotEmpty) 'guest_name': guestName.trim(),
        },
      );
      final data = response.data;
      return data is Map<String, dynamic> ? data : {};
    } on DioException catch (e) {
      throw Exception(_extractErrorMessage(e));
    }
  }

  static Future<List<dynamic>> fetchCategories() async {
    try {
      final response = await DioClient.instance.get('/categories', queryParameters: {'type': 'product'});
      final data = response.data;
      if (data is List) return data;
      if (data is Map<String, dynamic> && data['data'] is List) return data['data'];
      return [];
    } on DioException catch (e) {
      throw Exception(_extractErrorMessage(e));
    }
  }

  static Future<Map<String, dynamic>> fetchProductNewsBySlug(String slug) async {
    try {
      final response = await DioClient.instance.get('/product-news/$slug');
      final data = response.data;
      if (data is Map<String, dynamic> && data['data'] != null) {
        return data['data'] as Map<String, dynamic>;
      }
      return data is Map<String, dynamic> ? data : {};
    } on DioException catch (e) {
      throw Exception('Không tải được tin tức sản phẩm: ${_extractErrorMessage(e)}');
    }
  }

  static Future<Map<String, dynamic>> restock({
    required int id,
    required bool isVariant,
    required int amount,
  }) async {
    final String endpoint = isVariant
        ? '/admin/product-variants/$id/restock'
        : '/admin/products/$id/restock';

    // DioClient already attaches Bearer token via interceptor
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('auth_token');
    try {
      final response = await DioClient.instance.patch(
        endpoint,
        data: {'add': amount},
        options: token != null
            ? Options(headers: {'Authorization': 'Bearer $token'})
            : null,
      );
      final data = response.data;
      if (data is Map<String, dynamic> && data['data'] != null) return data['data'];
      return data is Map<String, dynamic> ? data : {};
    } on DioException catch (e) {
      throw Exception(_extractErrorMessage(e));
    }
  }

  static String _extractErrorMessage(DioException e) {
    if (e.response?.data is Map) {
      final data = e.response!.data as Map<String, dynamic>;
      return data['message']?.toString() ?? 'Có lỗi xảy ra, vui lòng thử lại sau.';
    }
    if (e.type == DioExceptionType.connectionTimeout || e.type == DioExceptionType.receiveTimeout) {
      return 'Kết nối quá thời gian, vui lòng thử lại.';
    }
    return 'Không thể kết nối máy chủ.';
  }
}
