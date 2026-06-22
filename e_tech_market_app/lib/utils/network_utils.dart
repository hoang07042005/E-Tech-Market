import '../config/api_config.dart';
class NetworkUtils {
  static String fixDeviceUrl(String? url) {
    if (url == null || url.trim().isEmpty) return '';

    // Chuẩn hoá dấu gạch chéo ngược trên Windows
    var s = url.trim().replaceAll('\\', '/');
    final baseUri = Uri.parse(ApiConfig.apiBaseUrl); // VD: http://192.168.24.19:8000/api/v1
    final targetOrigin = '${baseUri.scheme}://${baseUri.host}:${baseUri.port}'; // VD: http://192.168.24.19:8000

    // 1. Nếu đã là Absolute URL (Bắt đầu bằng http:// hoặc https://)
    if (s.startsWith(RegExp(r'^https?://', caseSensitive: false))) {
      final originRegex = RegExp(r'^https?://([^/]+)', caseSensitive: false);
      final match = originRegex.firstMatch(s);
      
      if (match != null) {
        final hostPort = match.group(1)!;
        // Kiểm tra xem host có phải là nginx (Docker), localhost, 127.0.0.1, hoặc IP local không
        if (hostPort.startsWith('nginx') || 
            hostPort.startsWith('localhost') || 
            hostPort.startsWith('127.0.0.1') || 
            hostPort.startsWith('192.168.') || 
            hostPort.startsWith('10.')) {
          
          // Trích xuất phần path bằng cách cắt bỏ origin
          final origin = match.group(0)!;
          final path = s.replaceFirst(origin, '');
          // Gắn targetOrigin (IP thiết bị) vào phần path
          s = targetOrigin + path;
        }
      }
      return Uri.encodeFull(s);
    }

    // 2. Nếu là Relative path bắt đầu bằng /storage/ hoặc storage/ (nginx proxy)
    if (s.startsWith('/storage/') || s.startsWith('storage/')) {
      s = s.replaceFirst(RegExp(r'^/+'), '');
      return Uri.encodeFull('$targetOrigin/$s');
    }

    // 3. Các đường dẫn relative khác (ví dụ: uploads/...)
    if (!s.startsWith('/')) {
      s = '/$s';
    }
    return Uri.encodeFull('$targetOrigin$s');
  }
}
