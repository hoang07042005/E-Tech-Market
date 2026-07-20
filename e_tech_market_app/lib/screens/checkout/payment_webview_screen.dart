import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

class PaymentWebViewScreen extends StatefulWidget {
  final String url;

  const PaymentWebViewScreen({Key? key, required this.url}) : super(key: key);

  @override
  State<PaymentWebViewScreen> createState() => _PaymentWebViewScreenState();
}

class _PaymentWebViewScreenState extends State<PaymentWebViewScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted);

    if (_controller.platform is AndroidWebViewController) {
      final androidCtrl = _controller.platform as AndroidWebViewController;
      androidCtrl.setMediaPlaybackRequiresUserGesture(false);
    }

    _controller.setNavigationDelegate(
      NavigationDelegate(
        onPageStarted: (_) {
          if (mounted) setState(() => _isLoading = true);
        },
        onPageFinished: (_) {
          if (mounted) setState(() => _isLoading = false);
        },
        onNavigationRequest: (request) {
          final uri = Uri.tryParse(request.url);
          if (uri != null &&
              (uri.path.contains('/payments/vnpay/return') ||
               uri.path.contains('/payments/momo/return'))) {
            Navigator.pop(context, request.url);
            return NavigationDecision.prevent;
          }
          return NavigationDecision.navigate;
        },
        onWebResourceError: (error) {
          if (mounted) setState(() => _isLoading = false);
        },
        // Chấp nhận SSL cert sandbox VNPAY (Android WebView không tin CA này)
        // ⚠️ Production cần dùng cert hợp lệ và bỏ callback này.
        onSslAuthError: (SslAuthError error) {
          error.proceed();
        },
      ),
    );

    _controller.loadRequest(Uri.parse(widget.url));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Thanh toán',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 1,
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.pop(context, null),
        ),
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_isLoading)
            const Center(
              child: CircularProgressIndicator(color: Color(0xFFF26522)),
            ),
        ],
      ),
    );
  }
}
