import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../config/dio_client.dart';

class AdminDashboardProvider extends ChangeNotifier {
  bool _isLoading = true;
  String? _error;
  Map<String, dynamic>? _dashboardData;
  Map<String, dynamic>? _settingsData;

  bool get isLoading => _isLoading;
  String? get error => _error;
  Map<String, dynamic>? get dashboardData => _dashboardData;
  Map<String, dynamic>? get settingsData => _settingsData;

  Future<void> fetchDashboardData() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final responses = await Future.wait([
        DioClient.instance.get('/admin/dashboard/stats?range=month&resolution=day'),
        DioClient.instance.get('/admin/settings'),
      ]);

      if (responses[0].statusCode == 200) {
        final resData = responses[0].data;
        _dashboardData = resData['data'] ?? resData;
      }
      
      if (responses[1].statusCode == 200) {
        _settingsData = responses[1].data as Map<String, dynamic>;
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

  Future<bool> updatePaymentGateway(String method, bool enabled) async {
    try {
      final response = await DioClient.instance.patch('/admin/settings', data: {
        'payments': {
          method: {'enabled': enabled}
        }
      });
      if (response.statusCode == 200) {
        _settingsData = response.data as Map<String, dynamic>;
        notifyListeners();
        return true;
      }
    } catch (e) {
      print('Lỗi cập nhật cài đặt: $e');
    }
    return false;
  }
}
