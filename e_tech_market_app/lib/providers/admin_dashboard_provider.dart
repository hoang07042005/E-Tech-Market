import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../config/dio_client.dart';

class AdminDashboardProvider extends ChangeNotifier {
  bool _isLoading = true;
  String? _error;
  Map<String, dynamic>? _dashboardData;

  bool get isLoading => _isLoading;
  String? get error => _error;
  Map<String, dynamic>? get dashboardData => _dashboardData;

  Future<void> fetchDashboardData() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await DioClient.instance.get('/admin/dashboard/stats?range=month&resolution=day');

      if (response.statusCode == 200) {
        final resData = response.data;
        _dashboardData = resData['data'] ?? resData;
      } else {
        _error = 'Lỗi tải dữ liệu (${response.statusCode})';
      }
    } on DioException catch (e) {
      _error = 'Lỗi kết nối: ${e.message}';
    } catch (e) {
      _error = 'Lỗi hệ thống: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
