import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart'; 
import 'package:e_tech_market_app/services/products_service.dart';
import '../../../config/api_config.dart';
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

class ProductNewDetailScreen extends StatefulWidget {
  final String slug;
  const ProductNewDetailScreen({Key? key, required this.slug}) : super(key: key);

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
      setState(() {
        _isLoading = true;
        _error = null;
      });

      final Map<String, dynamic> responseData = await ProductsService.fetchProductNewsBySlug(widget.slug);
      
      if (mounted) {
        setState(() {
          _news = ProductNews.fromJson(responseData);
          _isLoading = false;
        });
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

    String _resolveImageUrl(String? url) {
        return NetworkUtils.fixDeviceUrl(url);
    }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        backgroundColor: Theme.of(context).colorScheme.surface,
        body: Center(
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
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.article_outlined, color: Theme.of(context).colorScheme.outline, size: 64),
                const SizedBox(height: 16),
                Text(
                  _error ?? 'Không tìm thấy nội dung tin tức sản phẩm này.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 14.5, height: 1.4),
                ),
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Color(0xFFF26522),
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: Text('Quay lại', style: TextStyle(color: Theme.of(context).colorScheme.surface, fontWeight: FontWeight.bold)),
                )
              ],
            ),
          ),
        ),
      );
    }

    final newsItem = _news!;

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        title: Text(
          'TIN TỨC SẢN PHẨM',
          style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontSize: 15, fontWeight: FontWeight.bold, letterSpacing: 0.5),
        ),
        centerTitle: true,
        backgroundColor: Theme.of(context).colorScheme.surface,
        elevation: 0.5,
        iconTheme: IconThemeData(color: Theme.of(context).colorScheme.onSurface),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(18.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                newsItem.title,
                style: TextStyle(
                  fontSize: 22, 
                  fontWeight: FontWeight.w900,
                  color: Theme.of(context).colorScheme.onSurface,
                  height: 1.3,
                ),
              ),
              const SizedBox(height: 14),
              if (newsItem.thumbnailUrl != null && newsItem.thumbnailUrl!.isNotEmpty) ...[
                ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: Image.network(
                    _resolveImageUrl(newsItem.thumbnailUrl),
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                  ),
                ),
                const SizedBox(height: 18),
              ],

              Divider(color: Theme.of(context).colorScheme.outline, height: 1),
              const SizedBox(height: 14),

              SizedBox(
                width: double.infinity,
                child: Html(
                  data: newsItem.contentHtml ?? '',
                  style: {
                    "body": Style(
                      margin: Margins.zero,
                      padding: HtmlPaddings.zero,
                      fontSize: FontSize(14),
                      lineHeight: const LineHeight(1.55),
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                    "table": Style(
                      backgroundColor: Theme.of(context).colorScheme.surfaceContainerLow,
                      border: Border.all(color: Theme.of(context).colorScheme.outline),
                    ),
                    "th": Style(
                      padding: HtmlPaddings.all(6),
                      backgroundColor: Theme.of(context).colorScheme.surfaceContainerLow,
                    ),
                    "td": Style(
                      padding: HtmlPaddings.all(6),
                      border: Border.all(color: Theme.of(context).colorScheme.outline),
                    ),
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
