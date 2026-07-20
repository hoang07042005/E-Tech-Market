
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:youtube_player_flutter/youtube_player_flutter.dart';
import '../../services/video_service.dart';
import '../../utils/network_utils.dart';
import '../../utils/translation.dart';
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
            _error = Trans.videoNotFound;
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
          _error = Trans.errorLoadingDetail('video', e.toString());
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

  String _formatPrice(String? price) {
    if (price == null || price.isEmpty) return 'Liên hệ';
    try {
      String cleanPrice = price;
      if (price.contains('.')) {
        cleanPrice = price.split('.').first;
      }
      final parsed = int.parse(cleanPrice);
      return '${parsed.toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (match) => '.')} đ';
    } catch (_) {
      return '$price đ';
    }
  }

  Widget _buildProductCard(Map<String, dynamic> prod) {
    final name = prod['name']?.toString() ?? '';
    final slug = prod['slug']?.toString() ?? '';
    final imageUrl = NetworkUtils.fixDeviceUrl(prod['main_image_url']?.toString() ?? '');
    
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Theme.of(context).colorScheme.outlineVariant.withValues(alpha: 0.4)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => ProductDetailScreen(slug: slug, variantId: null),
            ),
          );
        },
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: Image.network(
                  imageUrl,
                  width: 64,
                  height: 64,
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => Container(
                    width: 64,
                    height: 64,
                    color: const Color(0xFFF1F5F9),
                    child: const Icon(Icons.image, color: Colors.grey, size: 24),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Icon(
                Icons.arrow_forward_ios,
                size: 14,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(backgroundColor: Colors.white, foregroundColor: Colors.black, elevation: 1),
        body: const Center(child: CircularProgressIndicator(color: const Color(0xFFF26522))),
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
              Text(_error ?? Trans.videoUnknownError, style: const TextStyle(fontSize: 16)),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: Text(Trans.backToVideoList),
              )
            ],
          ),
        ),
      );
    }

    final title = _video!['title']?.toString() ?? Trans.videoIntroProduct;
    final product = _video!['product'] as Map<String, dynamic>?;
    final products = _video!['products'] as List<dynamic>?;
    String? desc = _video!['description']?.toString();
    if (desc == null || desc.isEmpty) {
      desc = product?['short_description']?.toString() ?? Trans.videoDescriptionDefault;
    }

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        backgroundColor: Theme.of(context).colorScheme.surface,
        foregroundColor: Theme.of(context).colorScheme.onSurface,
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
              color: Theme.of(context).colorScheme.surface,
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
                        child: Text(Trans.videoBroadcast, style: const TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.bold, fontSize: 12)),
                      ),
                    ],
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 16),
                    child: Divider(height: 1, color: Color(0xFFE2E8F0)),
                  ),
                  Text(Trans.videoDescriptionLabel, style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
                  const SizedBox(height: 8),
                  Text(desc, style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurface, height: 1.5)),
                ],
              ),
            ),
            
            const SizedBox(height: 12),

            // Linked Product(s)
            if ((products != null && products.isNotEmpty) || product != null)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      Trans.productsInVideo,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (products != null && products.isNotEmpty)
                      ...products.map((p) => _buildProductCard(Map<String, dynamic>.from(p)))
                    else if (product != null)
                      _buildProductCard(product),
                  ],
                ),
              )
            else
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Theme.of(context).colorScheme.outlineVariant.withValues(alpha: 0.4)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      Trans.productLabel,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      Trans.videoOverview,
                      style: TextStyle(
                        fontSize: 13,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                    ),
                  ],
                ),
              ),

            // Recommended Videos
            if (_recommendations.isNotEmpty) ...[
              const SizedBox(height: 24),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(Trans.suggestedVideos, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
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
                                rec['title']?.toString() ?? Trans.videoSuggested,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Theme.of(context).colorScheme.onSurface),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                (rec['description']?.toString() ?? Trans.updatingDescription).replaceAll(RegExp(r'<[^>]*>|&[^;]+;'), ''),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurface, height: 1.3),
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
