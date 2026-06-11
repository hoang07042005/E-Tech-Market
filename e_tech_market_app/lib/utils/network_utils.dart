import '../config/api_config.dart';
class NetworkUtils {
  static String fixDeviceUrl(String? url) {
    if (url == null || url.isEmpty) return '';

    var fixedUrl = url.trim();
    
    // Extract host from ApiConfig.apiBaseUrl dynamically
    final uri = Uri.parse(ApiConfig.apiBaseUrl);
    final dynamicHost = uri.host + (uri.hasPort ? ':${uri.port}' : '');

    // If already a full URL, just replace localhost/127.0.0.1
    if (fixedUrl.startsWith('http://') || fixedUrl.startsWith('https://')) {
      fixedUrl = fixedUrl.replaceAll('localhost', dynamicHost);
      fixedUrl = fixedUrl.replaceAll('127.0.0.1', dynamicHost);
      return fixedUrl;
    }
    
    // For relative paths, append to base URL host
    const baseUrl = ApiConfig.apiBaseUrl;
    final hostUrl = baseUrl.replaceAll(RegExp(r'/api.*'), '');
    
    // Ensure path starts with /
    if (!fixedUrl.startsWith('/')) {
      fixedUrl = '/$fixedUrl';
    }
    
    fixedUrl = '$hostUrl$fixedUrl';
    fixedUrl = fixedUrl.replaceAll('localhost', dynamicHost);
    fixedUrl = fixedUrl.replaceAll('127.0.0.1', dynamicHost); 
    return fixedUrl;
  }
}
