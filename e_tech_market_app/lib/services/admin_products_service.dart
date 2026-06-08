import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../config/api_config.dart';

class AdminProductsService {
  static const String _baseUrl = ApiConfig.apiBaseUrl;


  static Future<Map<String, String>> _getHeaders() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    final String? token = prefs.getString('auth_token');
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // 1. Lấy danh sách sản phẩm công khai/quản trị
  static Future<List<dynamic>> fetchAdminProducts() async {
    final Uri uri = Uri.parse('$_baseUrl/admin/products?per_page=100');
    try {
      final headers = await _getHeaders();
      final response = await http.get(uri, headers: headers).timeout(const Duration(seconds: 15));
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final data = jsonDecode(response.body);
        if (data is Map<String, dynamic> && data['data'] != null) {
          return data['data'] as List<dynamic>;
        }
        return data is List ? data : [];
      }
      throw Exception('Mã lỗi từ Server: ${response.statusCode}');
    } catch (e) {
      throw Exception('Không thể tải danh sách sản phẩm: $e');
    }
  }

  // 2. Lấy danh sách danh mục phục vụ Combobox giống fetchAdminCategories
  static Future<List<dynamic>> fetchAdminCategories() async {
    final Uri uri = Uri.parse('$_baseUrl/admin/categories');
    try {
      final headers = await _getHeaders();
      final response = await http.get(uri, headers: headers);
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final data = jsonDecode(response.body);
        return data is List ? data : (data['data'] ?? []);
      }
      throw Exception('Lỗi lấy danh mục: ${response.statusCode}');
    } catch (e) {
      throw Exception('Không thể tải danh mục: $e');
    }
  }

  // 3. Lấy chi tiết sản phẩm cụ thể để Edit giống fetchAdminProductDetail
  static Future<Map<String, dynamic>> fetchAdminProductDetail(int id) async {
    final Uri uri = Uri.parse('$_baseUrl/admin/products/$id');
    try {
      final headers = await _getHeaders();
      final response = await http.get(uri, headers: headers);
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
      throw Exception('Lỗi lấy chi tiết: ${response.statusCode}');
    } catch (e) {
      throw Exception('Không thể tải chi tiết sản phẩm: $e');
    }
  }

  // 4. Hàm Lưu Sản Phẩm (Hỗ trợ cả Thêm mới và Cập nhật bằng Multipart Request)
  static Future<void> saveAdminProduct({
    int? id,
    required Map<String, String> fields,
    File? mainImage,
    List<File>? additionalImages,
    List<File?>? variantImages, // Thứ tự tương ứng với danh sách variant gửi lên
  }) async {
    final String url = id != null ? '$_baseUrl/admin/products/$id' : '$_baseUrl/admin/products';
    final Uri uri = Uri.parse(url);

    final request = http.MultipartRequest('POST', uri); // Laravel/Backend thường nhận POST kèm _method=PUT nếu update
    
    // Đọc token
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    final String? token = prefs.getString('auth_token');
    if (token != null) {
      request.headers['Authorization'] = 'Bearer $token';
    }
    request.headers['Accept'] = 'application/json';

    // Thêm các trường text thường
    request.fields.addAll(fields);

    // Đính kèm ảnh chính chính (main_image)
    if (mainImage != null && await mainImage.exists()) {
      request.files.add(await http.MultipartFile.fromPath('main_image', mainImage.path));
    }

    // Đính kèm danh sách ảnh phụ (images[])
    if (additionalImages != null) {
      for (var file in additionalImages) {
        if (await file.exists()) {
          request.files.add(await http.MultipartFile.fromPath('images[]', file.path));
        }
      }
    }

    // Đính kèm ảnh variant theo index tương ứng (nếu có chọn từ máy)
    if (variantImages != null) {
      for (int i = 0; i < variantImages.length; i++) {
        final imgFile = variantImages[i];
        if (imgFile != null && await imgFile.exists()) {
          request.files.add(await http.MultipartFile.fromPath('variants[$i][image]', imgFile.path));
        }
      }
    }

    // Gửi request lên server
    final streamedResponse = await request.send().timeout(const Duration(seconds: 40));
    final response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return;
    } else {
      final resData = jsonDecode(response.body);
      throw Exception(resData['message'] ?? 'Lỗi lưu sản phẩm từ Server (${response.statusCode})');
    }
  }

  // 5. Xóa sản phẩm
  static Future<void> deleteAdminProduct(int id) async {
    final Uri uri = Uri.parse('$_baseUrl/admin/products/$id');
    try {
      final headers = await _getHeaders();
      final response = await http.delete(uri, headers: headers);
      if (response.statusCode >= 200 && response.statusCode < 300) return;
      throw Exception('Lỗi xóa sản phẩm');
    } catch (e) {
      throw Exception('$e');
    }
  }
}