import 'dart:async';
import 'dart:io';
import 'package:network_info_plus/network_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiConfig {
  static const int _backendPort = 8000;
  static const String _prefKey = 'cached_server_ip';
  static const String _apiPath = '/api/v1';
  static const Duration _fastTimeout = Duration(milliseconds: 600);
  static const Duration _scanTimeout = Duration(milliseconds: 900);

  static String _baseUrl = 'http://localhost:$_backendPort$_apiPath';
  static String get apiBaseUrl => _baseUrl;

  /// Gọi khi app khởi động — tìm IP server nhanh nhất có thể
  static Future<void> initialize() async {
    final prefs = await SharedPreferences.getInstance();

    // 1. Thử IP đã cache trước (nhanh nhất, < 1s)
    final cachedIp = prefs.getString(_prefKey);
    if (cachedIp != null) {
      if (await _isReachable(cachedIp, _fastTimeout)) {
        _setUrl(cachedIp);
        print('[ApiConfig] ✅ Dùng IP cache: $_baseUrl');
        _refreshInBackground(prefs); // Scan ngầm phòng khi IP đổi
        return;
      }
    }

    // 2. Lấy IP WiFi thiết bị rồi scan thông minh
    final deviceIp = await _getDeviceWifiIp();
    if (deviceIp != null) {
      final subnet = _getSubnet(deviceIp);
      if (subnet != null) {
        print('[ApiConfig] 📡 Bắt đầu scan subnet $subnet.x (thiết bị: $deviceIp)');

        // Ưu tiên scan các IP thường dùng của máy tính trong LAN trước
        final priorityIps = _buildPriorityList(subnet, deviceIp);
        final found = await _scanWithPriority(priorityIps, subnet);

        if (found != null) {
          _setUrl(found);
          await prefs.setString(_prefKey, found);
          print('[ApiConfig] ✅ Tìm thấy server: $_baseUrl');
          return;
        }
      }
    }

    print('[ApiConfig] ⚠️ Không tìm thấy server, dùng localhost');
  }

  /// Tạo danh sách IP ưu tiên scan trước (không scan lần lượt 1→254)
  static List<String> _buildPriorityList(String subnet, String deviceIp) {
    final myLast = int.tryParse(deviceIp.split('.').last) ?? 0;

    // Ưu tiên: IP cạnh thiết bị (máy tính thường cùng dải)
    // + các IP đặc trưng của máy tính developer
    final priority = <int>{};

    // Quanh IP thiết bị ±10
    for (int d = 1; d <= 10; d++) {
      if (myLast - d >= 1) priority.add(myLast - d);
      if (myLast + d <= 254) priority.add(myLast + d);
    }

    // Các IP hay dùng cho máy tính trong LAN
    priority.addAll([2, 3, 4, 5, 10, 100, 101, 102, 103, 104, 105,
                     150, 200, 201, 202, 203, 210, 220, 230, 240, 250]);
    priority.remove(myLast); // Không scan IP của chính mình

    return priority.map((i) => '$subnet.$i').toList();
  }

  /// Scan ưu tiên trước, sau đó scan toàn bộ nếu không tìm thấy
  static Future<String?> _scanWithPriority(
      List<String> priorityIps, String subnet) async {
    // Giai đoạn 1: Scan song song danh sách ưu tiên
    final phase1 = await Future.wait(
      priorityIps.map((ip) => _checkHost(ip, _fastTimeout)),
    );
    for (final ip in phase1) {
      if (ip != null) return ip;
    }

    // Giai đoạn 2: Scan toàn bộ subnet còn lại
    final scanned = priorityIps.toSet();
    final remaining = <String>[];
    for (int i = 1; i <= 254; i++) {
      final ip = '$subnet.$i';
      if (!scanned.contains(ip)) remaining.add(ip);
    }

    print('[ApiConfig] Phase 2: scan ${remaining.length} IP còn lại...');
    final phase2 = await Future.wait(
      remaining.map((ip) => _checkHost(ip, _scanTimeout)),
    );
    for (final ip in phase2) {
      if (ip != null) return ip;
    }

    return null;
  }

  /// Scan nền để cập nhật nếu IP thay đổi
  static void _refreshInBackground(SharedPreferences prefs) {
    Future.microtask(() async {
      await Future.delayed(const Duration(seconds: 3));
      final deviceIp = await _getDeviceWifiIp();
      if (deviceIp == null) return;
      final subnet = _getSubnet(deviceIp);
      if (subnet == null) return;

      final priorityIps = _buildPriorityList(subnet, deviceIp);
      final found = await _scanWithPriority(priorityIps, subnet);
      if (found != null) {
        final newUrl = 'http://$found:$_backendPort$_apiPath';
        if (newUrl != _baseUrl) {
          _baseUrl = newUrl;
          await prefs.setString(_prefKey, found);
          print('[ApiConfig] 🔄 Cập nhật IP mới: $_baseUrl');
        }
      }
    });
  }

  static void _setUrl(String ip) {
    _baseUrl = 'http://$ip:$_backendPort$_apiPath';
  }

  static Future<String?> _getDeviceWifiIp() async {
    try {
      return await NetworkInfo().getWifiIP();
    } catch (_) {
      return null;
    }
  }

  static String? _getSubnet(String ip) {
    final parts = ip.split('.');
    if (parts.length != 4) return null;
    return '${parts[0]}.${parts[1]}.${parts[2]}';
  }

  static Future<String?> _checkHost(String ip, Duration timeout) async {
    try {
      final s = await Socket.connect(ip, _backendPort, timeout: timeout);
      s.destroy();
      return ip;
    } catch (_) {
      return null;
    }
  }

  static Future<bool> _isReachable(String ip, Duration timeout) async {
    return await _checkHost(ip, timeout) != null;
  }

  /// Force scan lại thủ công (ví dụ: sau khi đổi WiFi)
  static Future<void> rediscover() async {
    print('[ApiConfig] 🔍 Force re-discover...');
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_prefKey);
    await initialize();
  }
}
