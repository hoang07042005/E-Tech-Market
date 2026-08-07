import 'package:dio/dio.dart';

import '../../config/dio_client.dart';

class WishlistService {
  static Map<String, Set<int>> _wishlistIds = {
    'product': {},
    'blog': {},
    'video': {},
    'news': {},
  };

  static Future<List<dynamic>> fetchWishlist({String type = 'product'}) async {
    try {
      final response = await DioClient.instance
          .get('/wishlist', queryParameters: {'type': type});
      final data = response.data;
      if (data is List) return data;
      return [];
    } catch (_) {
      // Wishlist is optional during page rendering.
      return [];
    }
  }

  static Future<String?> toggleWishlist(int id,
      {String type = 'product'}) async {
    try {
      final response = await DioClient.instance.post(
        '/wishlist/toggle',
        data: {'id': id, 'type': type},
      );
      final decoded = response.data;
      if (decoded is Map<String, dynamic>) {
        return decoded['status'] as String?;
      }
      return null;
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        throw Exception('Vui lòng đăng nhập để thêm vào danh sách yêu thích.');
      }
      if (e.response?.data is Map) {
        final data = e.response!.data as Map<String, dynamic>;
        throw Exception(
            data['message']?.toString() ?? 'Không thể cập nhật yêu thích.');
      }
      throw Exception('Không thể cập nhật yêu thích.');
    }
  }

  static Future<void> loadWishlist({String type = 'product'}) async {
    final list = await fetchWishlist(type: type);
    String idField = 'product_id';
    if (type == 'blog') idField = 'blog_post_id';
    if (type == 'video') idField = 'video_id';
    if (type == 'news') idField = 'product_news_id';

    _wishlistIds[type] = list.map((item) => _toInt(item[idField])).toSet();
  }

  static bool isFavorite(int id, {String type = 'product'}) =>
      _wishlistIds[type]?.contains(id) ?? false;

  static Future<void> toggleFavorite(int id, {String type = 'product'}) async {
    if (!_wishlistIds.containsKey(type)) {
      _wishlistIds[type] = {};
    }

    final wasFavorite = _wishlistIds[type]!.contains(id);
    // Optimistic update
    if (wasFavorite) {
      _wishlistIds[type]!.remove(id);
    } else {
      _wishlistIds[type]!.add(id);
    }

    try {
      final status = await toggleWishlist(id, type: type);
      if (status == 'added') {
        _wishlistIds[type]!.add(id);
      } else if (status == 'removed') {
        _wishlistIds[type]!.remove(id);
      }
    } catch (_) {
      // Rollback optimistic update on error
      if (wasFavorite) {
        _wishlistIds[type]!.add(id);
      } else {
        _wishlistIds[type]!.remove(id);
      }
      rethrow;
    }
  }

  static int _toInt(dynamic value) {
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }
}
