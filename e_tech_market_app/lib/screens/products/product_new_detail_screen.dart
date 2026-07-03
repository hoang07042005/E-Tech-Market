import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:e_tech_market_app/services/products_service.dart';
import '../../../utils/network_utils.dart';

class ProductNews {
  final int id;
  final String title;
  final String? thumbnailUrl;
  final String? contentHtml;
  final String? createdAt;

  ProductNews({
    required this.id,
    required this.title,
    this.thumbnailUrl,
    this.contentHtml,
    this.createdAt,
  });

  factory ProductNews.fromJson(Map<String, dynamic> json) {
    return ProductNews(
      id: json['id'] ?? 0,
      title: json['title'] ?? '',
      thumbnailUrl: json['thumbnail_url'] ?? json['thumbnail_path'],
      contentHtml: json['content_html'] ?? json['content'] ?? '',
      createdAt: json['created_at'],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Widget load ảnh với HttpClient tự-signed, fallback về Image.network
// ─────────────────────────────────────────────────────────────────────────────
class _TrustAllImage extends StatefulWidget {
  final String url;
  final double? width;
  final BoxFit fit;

  const _TrustAllImage({required this.url, this.width, this.fit = BoxFit.contain});

  @override
  State<_TrustAllImage> createState() => _TrustAllImageState();
}

class _TrustAllImageState extends State<_TrustAllImage> {
  Uint8List? _bytes;
  bool _failed = false;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final uri = Uri.parse(widget.url);
      final client = HttpClient()
        ..badCertificateCallback = (_, __, ___) => true;
      final req = await client.getUrl(uri);
      req.headers.set('user-agent', 'Mozilla/5.0 (Flutter)');
      final res = await req.close();
      if (res.statusCode == 200) {
        final chunks = <int>[];
        await for (final chunk in res) {
          chunks.addAll(chunk);
        }
        if (mounted) setState(() { _bytes = Uint8List.fromList(chunks); _loading = false; });
      } else {
        if (mounted) setState(() { _failed = true; _loading = false; });
      }
      client.close(force: true);
    } catch (_) {
      if (mounted) setState(() { _failed = true; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return SizedBox(
        width: widget.width ?? double.infinity,
        height: 160,
        child: const Center(child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFFF26522))),
      );
    }
    if (_failed || _bytes == null) {
      // Fallback: thử Image.network bình thường (có thể hoạt động trên một số thiết bị)
      return Image.network(
        widget.url,
        width: widget.width ?? double.infinity,
        fit: widget.fit,
        errorBuilder: (_, __, ___) => const SizedBox.shrink(),
      );
    }
    return Image.memory(
      _bytes!,
      width: widget.width ?? double.infinity,
      fit: widget.fit,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────
class ProductNewDetailScreen extends StatefulWidget {
  final String slug;
  const ProductNewDetailScreen({super.key, required this.slug});

  @override
  State<ProductNewDetailScreen> createState() => _ProductNewDetailScreenState();
}

class _ProductNewDetailScreenState extends State<ProductNewDetailScreen> {
  ProductNews? _news;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchNewsDetail();
  }

  Future<void> _fetchNewsDetail() async {
    try {
      if (!mounted) return;
      setState(() { _isLoading = true; _error = null; });

      final data = await ProductsService.fetchProductNewsBySlug(widget.slug);
      if (mounted) {
        setState(() { _news = ProductNews.fromJson(data); _isLoading = false; });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString().replaceAll('Exception: ', '');
          _isLoading = false;
        });
      }
    }
  }

  String _resolveUrl(String? url) => NetworkUtils.fixDeviceUrl(url);

  /// Rewrites <img src="..."> in HTML content to use device-resolved URLs.
  /// Handles both single and double-quoted src attributes.
  String _fixImageUrls(String html) {
    if (html.trim().isEmpty) return html;

    return html.replaceAllMapped(
      RegExp(r'<img[^>]*>', caseSensitive: false),
      (tagMatch) {
        var tag = tagMatch.group(0)!;

        // fix double-quoted src
        tag = tag.replaceFirstMapped(
          RegExp(r'src="([^"]*)"', caseSensitive: false),
          (m) {
            final raw = m.group(1) ?? '';
            if (raw.trim().startsWith('data:') || raw.trim().isEmpty) return m.group(0)!;
            return 'src="${_resolveUrl(raw.trim())}"';
          },
        );

        // fix single-quoted src (if not already replaced)
        tag = tag.replaceFirstMapped(
          RegExp(r"src='([^']*)'", caseSensitive: false),
          (m) {
            final raw = m.group(1) ?? '';
            if (raw.trim().startsWith('data:') || raw.trim().isEmpty) return m.group(0)!;
            return 'src="${_resolveUrl(raw.trim())}"';
          },
        );

        return tag;
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        backgroundColor: Theme.of(context).colorScheme.surface,
        body: const Center(
          child: CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFF26522)),
          ),
        ),
      );
    }

    if (_error != null || _news == null) {
      return Scaffold(
        backgroundColor: Theme.of(context).colorScheme.surface,
        appBar: AppBar(
          elevation: 0,
          backgroundColor: Theme.of(context).colorScheme.surface,
          iconTheme: IconThemeData(color: Theme.of(context).colorScheme.onSurface),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.article_outlined, color: Theme.of(context).colorScheme.outline, size: 64),
                const SizedBox(height: 16),
                Text(
                  _error ?? 'Không tìm thấy nội dung tin tức sản phẩm này.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    fontSize: 14.5,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFF26522),
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: Text(
                    'Quay lại',
                    style: TextStyle(color: Theme.of(context).colorScheme.surface, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final news = _news!;
    final processedHtml = _fixImageUrls(news.contentHtml ?? '');

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        title: Text(
          'TIN TỨC SẢN PHẨM',
          style: TextStyle(
            color: Theme.of(context).colorScheme.onSurface,
            fontSize: 15,
            fontWeight: FontWeight.bold,
            letterSpacing: 0.5,
          ),
        ),
        centerTitle: true,
        backgroundColor: Theme.of(context).colorScheme.surface,
        elevation: 0.5,
        iconTheme: IconThemeData(color: Theme.of(context).colorScheme.onSurface),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Tiêu đề
              Text(
                news.title,
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  color: Theme.of(context).colorScheme.onSurface,
                  height: 1.3,
                ),
              ),
              const SizedBox(height: 14),

              // ── Thumbnail
              if (news.thumbnailUrl != null && news.thumbnailUrl!.isNotEmpty) ...[
                ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: _TrustAllImage(
                    url: _resolveUrl(news.thumbnailUrl),
                    width: double.infinity,
                    fit: BoxFit.cover,
                  ),
                ),
                const SizedBox(height: 18),
              ],

              Divider(color: Theme.of(context).colorScheme.outline, height: 1),
              const SizedBox(height: 14),

              // ── HTML content với custom image rendering (bypass SSL)
              SizedBox(
                width: double.infinity,
                child: Html(
                  data: processedHtml,
                  style: {
                    'body': Style(
                      margin: Margins.zero,
                      padding: HtmlPaddings.zero,
                      fontSize: FontSize(14.5),
                      lineHeight: const LineHeight(1.6),
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                    'h1': Style(fontSize: FontSize(20), fontWeight: FontWeight.bold),
                    'h2': Style(fontSize: FontSize(18), fontWeight: FontWeight.bold),
                    'h3': Style(fontSize: FontSize(16), fontWeight: FontWeight.bold),
                    'p': Style(margin: Margins.only(bottom: 10)),
                    'img': Style(
                      width: Width(100, Unit.percent),
                      margin: Margins.only(top: 8, bottom: 8),
                    ),
                    'table': Style(
                      backgroundColor: Theme.of(context).colorScheme.surfaceContainerLow,
                      border: Border.all(color: Theme.of(context).colorScheme.outline),
                    ),
                    'th': Style(
                      padding: HtmlPaddings.all(6),
                      backgroundColor: Theme.of(context).colorScheme.surfaceContainerLow,
                    ),
                    'td': Style(
                      padding: HtmlPaddings.all(6),
                      border: Border.all(color: Theme.of(context).colorScheme.outline),
                    ),
                  },
                  extensions: [
                    // Custom renderer cho <img>: dùng _TrustAllImage thay Image.network
                    TagExtension(
                      tagsToExtend: {'img'},
                      builder: (extensionContext) {
                        final src = extensionContext.attributes['src'] ?? '';
                        if (src.isEmpty) return const SizedBox.shrink();
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 6),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: _TrustAllImage(
                              url: src,
                              width: double.infinity,
                              fit: BoxFit.contain,
                            ),
                          ),
                        );
                      },
                    ),
                  ],
                ), // Html
              ), // SizedBox
            ],
          ),
        ),
      ),
    );
  }
}
