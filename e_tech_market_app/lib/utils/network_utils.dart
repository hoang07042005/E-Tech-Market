import '../config/api_config.dart';
class NetworkUtils {
  static String fixDeviceUrl(String? url) {
    if (url == null || url.isEmpty) return '';

    var fixedUrl = url.trim();
    final baseUri = Uri.parse(ApiConfig.apiBaseUrl);

    // If it's a relative URL, ensure it has the base scheme and host
    if (!fixedUrl.startsWith('http://') && !fixedUrl.startsWith('https://')) {
      if (!fixedUrl.startsWith('/')) {
        fixedUrl = '/$fixedUrl';
      }
      return '${baseUri.scheme}://${baseUri.host}:${baseUri.port}$fixedUrl';
    }

    // It's an absolute URL. Parse it to safely replace host/port.
    try {
      final uri = Uri.parse(fixedUrl);
      // Rewrite host/port if it comes from the local backend (localhost, 127.0.0.1, or 192.168.x.x)
      if (uri.host == 'localhost' || uri.host == '127.0.0.1' || uri.host.startsWith('192.168.') || uri.host.startsWith('10.')) {
        final newUri = uri.replace(
          host: baseUri.host,
          port: baseUri.port,
        );
        return newUri.toString();
      }
      return fixedUrl;
    } catch (e) {
      return fixedUrl;
    }
  }
}
