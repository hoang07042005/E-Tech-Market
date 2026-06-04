
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:youtube_player_flutter/youtube_player_flutter.dart';
import '../../services/video_service.dart';
import '../../utils/network_utils.dart';
import '../products/product_detail_screen.dart';

class VideoDetailScreen extends StatefulWidget {
  final int videoId;
  const VideoDetailScreen({super.key, required this.videoId});

  @override
  State<VideoDetailScreen> createState() => _VideoDetailScreenState();
}

class _VideoDetailScreenState extends State<VideoDetailScreen> {
  Map<String, dynamic>? _video;
  List<dynamic> _recommendations = [];
  bool _isLoading = true;
  String? _error;
  WebViewController? _webViewController;
  YoutubePlayerController? _ytController;


  @override
  void initState() {
    super.initState();
    _fetchData();
  }



  Future<void> _fetchData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        VideoService.fetchVideoById(widget.videoId),
        VideoService.fetchVideos(limit: 10),
      ]);

      if (mounted) {
        final videoObj = results[0] as Map<String, dynamic>?;
        final list = results[1] as List<dynamic>? ?? [];

        if (videoObj == null) {
          setState(() {
            _error = 'Không tìm thấy video yêu cầu';
            _isLoading = false;
          });
          return;
        }

        final recs = list.where((v) => v['id'] != widget.videoId).take(5).toList();

        final rawUrl = videoObj['video_url']?.toString() ?? '';

        setState(() {
          _video = videoObj;
          _recommendations = recs;
          _isLoading = false;
        });
        _initVideoPlayer(rawUrl);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Lỗi tải chi tiết video: $e';
          _isLoading = false;
        });
      }
    }
  }

  String _resolveImageUrl(Map<String, dynamic>? videoObj) {
    if (videoObj == null) return '';
    String? thumb = videoObj['thumbnail_url']?.toString();
    if (thumb == null || thumb.isEmpty) {
      final product = videoObj['product'] as Map<String, dynamic>?;
      thumb = product?['main_image_url']?.toString();
    }
    if (thumb != null && thumb.isNotEmpty) {
      return NetworkUtils.fixDeviceUrl(thumb);
    }
    return '';
  }

  String? _extractYoutubeId(String url) {
    // Handle youtu.be/ID
    final shortMatch = RegExp(r'youtu\.be/([a-zA-Z0-9_-]{11})').firstMatch(url);
    if (shortMatch != null) return shortMatch.group(1);

    // Handle youtube.com/watch?v=ID
    final watchMatch = RegExp(r'youtube\.com/watch\?.*v=([a-zA-Z0-9_-]{11})').firstMatch(url);
    if (watchMatch != null) return watchMatch.group(1);

    // Handle youtube.com/embed/ID
    final embedMatch = RegExp(r'youtube\.com/embed/([a-zA-Z0-9_-]{11})').firstMatch(url);
    if (embedMatch != null) return embedMatch.group(1);

    // Handle youtube.com/v/ID
    final vMatch = RegExp(r'youtube\.com/v/([a-zA-Z0-9_-]{11})').firstMatch(url);
    if (vMatch != null) return vMatch.group(1);

    return null;
  }

  String? _extractVimeoId(String url) {
    final match = RegExp(r'vimeo\.com/(?:video/)?(\d+)').firstMatch(url);
    return match?.group(1);
  }

  void _initVideoPlayer(String videoUrl) {
    if (videoUrl.isEmpty) {
      return;
    }

    // Detect YouTube
    final ytId = _extractYoutubeId(videoUrl);
    if (ytId != null) {
      _initYoutubePlayer(ytId);
      return;
    }

    // Detect Vimeo
    final vimeoId = _extractVimeoId(videoUrl);
    if (vimeoId != null) {
      _initVimeoPlayer(vimeoId);
      return;
    }

    // Fallback: direct video file
    _initDirectPlayer(videoUrl);
  }

  void _initYoutubePlayer(String ytId) {
    _ytController = YoutubePlayerController(
      initialVideoId: ytId,
      flags: const YoutubePlayerFlags(
        autoPlay: true,
        mute: false,
        enableCaption: false,
      ),
    );
    setState(() {});
  }

  void _initVimeoPlayer(String vimeoId) {
    final html = '''
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
    iframe { width: 100%; height: 100%; border: 0; }
  </style>
</head>
<body>
  <iframe src="https://player.vimeo.com/video/$vimeoId?autoplay=1&playsinline=1"
    allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
</body>
</html>
''';

    _webViewController = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.black)
      ..loadHtmlString(html, baseUrl: 'https://player.vimeo.com');

    setState(() {});
  }

  void _initDirectPlayer(String videoUrl) {
    String videoSrc = videoUrl;
    if (!videoSrc.startsWith('http')) {
      videoSrc = NetworkUtils.fixDeviceUrl(videoSrc);
    }
    final html = '''
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; background: #000; overflow: hidden;
      display: flex; align-items: center; justify-content: center; }
    video { width: 100%; height: 100%; object-fit: contain; }
  </style>
</head>
<body>
  <video src="$videoSrc" controls autoplay playsinline></video>
</body>
</html>
''';

    _webViewController = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.black)
      ..loadHtmlString(html);

    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(backgroundColor: Colors.white, foregroundColor: Colors.black, elevation: 1),
        body: const Center(child: CircularProgressIndicator(color: Color(0xFFEF7A45))),
      );
    }

    if (_error != null || _video == null) {
      return Scaffold(
        appBar: AppBar(backgroundColor: Colors.white, foregroundColor: Colors.black, elevation: 1),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, color: Colors.red, size: 48),
              const SizedBox(height: 16),
              Text(_error ?? 'Lỗi không xác định', style: const TextStyle(fontSize: 16)),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Quay lại danh sách'),
              )
            ],
          ),
        ),
      );
    }

    final title = _video!['title']?.toString() ?? 'Video giới thiệu sản phẩm';
    final product = _video!['product'] as Map<String, dynamic>?;
    String? desc = _video!['description']?.toString();
    if (desc == null || desc.isEmpty) {
      desc = product?['short_description']?.toString() ?? 'Đây là video giới thiệu trực quan, giúp bạn có cái nhìn khách quan và rõ nét nhất về thiết kế, tính năng và hiệu năng thực tế của sản phẩm. Video được tổng hợp và phân phối bởi E-Tech Market.';
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Video Player
            SizedBox(
              width: double.infinity,
              height: _ytController != null ? null : MediaQuery.of(context).size.height * 0.45,
              child: _ytController != null
                  ? YoutubePlayer(
                      controller: _ytController!,
                      showVideoProgressIndicator: true,
                      progressColors: const ProgressBarColors(
                        playedColor: Color(0xFFEF7A45),
                        handleColor: Color(0xFFEF7A45),
                      ),
                    )
                  : _webViewController != null
                      ? WebViewWidget(controller: _webViewController!)
                      : Container(
                          color: Colors.black,
                          child: Stack(
                            children: [
                              Image.network(
                                _resolveImageUrl(_video),
                                fit: BoxFit.cover,
                                width: double.infinity,
                                height: double.infinity,
                                errorBuilder: (_, __, ___) => const Center(child: Icon(Icons.videocam, color: Colors.white54, size: 64)),
                              ),
                              Container(color: Colors.black45),
                              const Positioned.fill(
                                child: Center(child: Icon(Icons.play_circle_fill, color: Colors.white, size: 72)),
                              ),
                            ],
                          ),
                        ),
            ),



            // Video Info
            Container(
              color: Colors.white,
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEF4444).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Text('Phát sóng trực tuyến', style: TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.bold, fontSize: 12)),
                      ),
                    ],
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 16),
                    child: Divider(height: 1, color: Color(0xFFE2E8F0)),
                  ),
                  const Text('Mô tả video', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                  const SizedBox(height: 8),
                  Text(desc, style: const TextStyle(fontSize: 13, color: Color(0xFF64748B), height: 1.5)),
                ],
              ),
            ),
            
            const SizedBox(height: 12),

            // Linked Product
            if (product != null)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Sản phẩm trong video', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                    const SizedBox(height: 12),
                    InkWell(
                      onTap: () {
                        Navigator.push(context, MaterialPageRoute(builder: (_) => ProductDetailScreen(slug: product['slug'] ?? '', variantId: null)));
                      },
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                          boxShadow: [
                            BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 10, offset: const Offset(0, 4)),
                          ],
                        ),
                        child: IntrinsicHeight(
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              ClipRRect(
                                borderRadius: const BorderRadius.only(topLeft: Radius.circular(11), bottomLeft: Radius.circular(11)),
                                child: Image.network(
                                  NetworkUtils.fixDeviceUrl(product['main_image_url']?.toString() ?? ''),
                                  width: 110,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => Container(width: 110, color: const Color(0xFFF1F5F9), child: const Icon(Icons.image, color: Colors.grey)),
                                ),
                              ),
                              Expanded(
                                child: Padding(
                                  padding: const EdgeInsets.all(12),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Text(
                                        product['name']?.toString() ?? '',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF1E293B)),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        (product['short_description']?.toString() ?? product['description']?.toString() ?? 'Đang cập nhật mô tả...').replaceAll(RegExp(r'<[^>]*>|&[^;]+;'), ''),
                                        style: const TextStyle(color: Color(0xFF64748B), fontSize: 12, height: 1.4),
                                        maxLines: 4,
                                        overflow: TextOverflow.ellipsis,
                                      )
                                    ],
                                  ),
                                ),
                              ),
                              const Padding(
                                padding: EdgeInsets.only(right: 12),
                                child: Icon(Icons.arrow_forward_ios, size: 14, color: Color(0xFF94A3B8)),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              )
            else
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text('Sản phẩm', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                    SizedBox(height: 8),
                    Text('Video tổng quan giới thiệu các giải pháp công nghệ tại E-Tech Market.', style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                  ],
                ),
              ),

            // Recommended Videos
            if (_recommendations.isNotEmpty) ...[
              const SizedBox(height: 24),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                child: Text('Video đề xuất', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
              ),
              const SizedBox(height: 12),
              ListView.separated(
                physics: const NeverScrollableScrollPhysics(),
                shrinkWrap: true,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                itemCount: _recommendations.length,
                separatorBuilder: (_, __) => const SizedBox(height: 16),
                itemBuilder: (context, index) {
                  final rec = _recommendations[index];
                  final recProduct = rec['product'] as Map<String, dynamic>?;
                  
                  return GestureDetector(
                    onTap: () {
                      Navigator.pushReplacement(
                        context,
                        MaterialPageRoute(builder: (_) => VideoDetailScreen(videoId: rec['id'])),
                      );
                    },
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Stack(
                            children: [
                              Image.network(
                                _resolveImageUrl(rec),
                                width: 120,
                                height: 72,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => Container(width: 120, height: 72, color: const Color(0xFFF1F5F9)),
                              ),
                              Container(
                                width: 120, height: 72, color: Colors.black26,
                              ),
                              const Positioned.fill(
                                child: Center(child: Icon(Icons.play_arrow, color: Colors.white, size: 28)),
                              )
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                rec['title']?.toString() ?? 'Video đề xuất',
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF1E293B)),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                (rec['description']?.toString() ?? 'Đang cập nhật mô tả...').replaceAll(RegExp(r'<[^>]*>|&[^;]+;'), ''),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), height: 1.3),
                              ),
                              if (recProduct != null) ...[
                                const SizedBox(height: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF1F5F9),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    '📦 ${recProduct['name']}',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontSize: 10, color: Color(0xFF475569)),
                                  ),
                                )
                              ]
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
              const SizedBox(height: 40),
            ]
          ],
        ),
      ),
    );
  }
  @override
  void dispose() {
    _ytController?.dispose();
    super.dispose();
  }
}
