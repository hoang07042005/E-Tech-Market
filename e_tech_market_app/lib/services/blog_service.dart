import 'package:dio/dio.dart';
import '../../config/dio_client.dart';

class BlogService {
  static Future<Map<String, dynamic>> fetchBlogPosts({
    int perPage = 5,
    int page = 1,
  }) async {
    try {
      final response = await DioClient.instance.get('/blog/posts', queryParameters: {
        'per_page': perPage,
        'page': page,
      });
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout || e.type == DioExceptionType.receiveTimeout) {
        throw Exception('Kết nối quá thời gian, vui lòng thử lại.');
      }
      throw Exception('Không thể tải bài viết.');
    }
  }
  static Future<Map<String, dynamic>> addComment(String slug, String content) async {
    try {
      final response = await DioClient.instance.post('/blog/posts/$slug/comments', data: {
        'content': content,
      });
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        throw Exception('Vui lòng đăng nhập để bình luận.');
      }
      throw Exception('Không thể gửi bình luận. ${e.response?.data['message'] ?? ''}');
    }
  }
}
