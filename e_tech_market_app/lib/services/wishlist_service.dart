import 'package:dio/dio.dart';

import '../../config/dio_client.dart';

class WishlistService {
  static Set<int> _wishlistIds = {};

  static Future<List<dynamic>> fetchWishlist() async {
    try {
      final response = await DioClient.instance.get('/wishlist');
      final data = response.data;
      if (data is List) return data;
      return [];
    } catch (_) {
      // Wishlist is optional during page rendering.
      return [];
    }
  }

  static Future<String?> toggleWishlist(int productId) async {
    try {
      final response = await DioClient.instance.post(
        '/wishlist/toggle',
        data: {'product_id': productId},
      );
      final decoded = response.data;
      if (decoded is Map<String, dynamic>) {
        return decoded['status'] as String?;
      }
      return null;
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        throw Exception('Vui lòng đăng nhập để thêm sản phẩm yêu thích.');
      }
      if (e.response?.data is Map) {
        final data = e.response!.data as Map<String, dynamic>;
        throw Exception(data['message']?.toString() ?? 'Không thể cập nhật yêu thích.');
      }
      throw Exception('Không thể cập nhật yêu thích.');
    }
  }

  static Future<void> loadWishlist() async {
    final list = await fetchWishlist();
    _wishlistIds = list.map((item) => _toInt(item['product_id'])).toSet();
  }

  static bool isFavorite(int productId) => _wishlistIds.contains(productId);

  static Future<void> toggleFavorite(int productId) async {
    final wasFavorite = _wishlistIds.contains(productId);
    // Optimistic update
    if (wasFavorite) {
      _wishlistIds.remove(productId);
    } else {
      _wishlistIds.add(productId);
    }

    try {
      final status = await toggleWishlist(productId);
      if (status == 'added') {
        _wishlistIds.add(productId);
      } else if (status == 'removed') {
        _wishlistIds.remove(productId);
      }
    } catch (_) {
      // Rollback optimistic update on error
      if (wasFavorite) {
        _wishlistIds.add(productId);
      } else {
        _wishlistIds.remove(productId);
      }
      rethrow;
    }
  }

  static int _toInt(dynamic value) {
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }
}
