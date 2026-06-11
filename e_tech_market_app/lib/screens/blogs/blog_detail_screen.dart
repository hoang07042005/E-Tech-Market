import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';
import '../../utils/network_utils.dart';
import '../../utils/translation.dart';

class BlogDetailScreen extends StatelessWidget {
  final dynamic post;

  const BlogDetailScreen({
    Key? key,
    required this.post,
  }) : super(key: key);


  @override
  Widget build(BuildContext context) {
    final imageUrl = NetworkUtils.fixDeviceUrl(post['thumbnail_url'] ?? '');
    final title = post['title'] ?? '';
    final excerpt = post['excerpt'] ?? '';
    // API returns content, not content_html
    final content = post['content'] ?? post['content_html'] ?? 'No content available';
    final categoryName = post['category']?['name'] ?? 'News';
    final authorName = post['author']?['name'] ?? 'E-Tech Market';
    final createdAt = post['published_at'] ?? '';
    final readingTime = post['reading_time'] ?? 5;
    final views = (post['views'] as num?)?.toInt() ?? 0;


    return Scaffold(
      appBar: AppBar(
        title: Text(
          Trans.articleDetail,
          style: TextStyle(color: Theme.of(context).colorScheme.onSurface),
        ),
        centerTitle: true,
        backgroundColor: Theme.of(context).colorScheme.surface,
        foregroundColor: Theme.of(context).colorScheme.onSurface,
        elevation: 1,
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            Image.network(
              imageUrl,
              width: double.infinity,
              height: 280,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                height: 280,
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                child: Icon(
                  Icons.image_not_supported,
                  size: 64,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(
                        color: Theme.of(context).colorScheme.primary,
                        width: 1,
                      ),
                    ),
                    child: Text(
                      categoryName,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onPrimaryContainer,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                      color: Theme.of(context).colorScheme.onSurface,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: Theme.of(context).colorScheme.primaryContainer,
                            ),
                            child: Center(
                              child: Text(
                                authorName.isNotEmpty ? authorName[0] : 'E',
                                style: TextStyle(
                                  color: Theme.of(context).colorScheme.onPrimaryContainer,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                authorName,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: Theme.of(context).colorScheme.onSurface,
                                ),
                              ),
                              Text(
                                _formatDate(createdAt),
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      _buildMetaItem(Trans.readingTimeLabel(readingTime), context),
                      const SizedBox(width: 16),
                      _buildMetaItem(Trans.viewsLabel(views), context),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Container(
                    height: 1,
                    color: Theme.of(context).colorScheme.outline,
                  ),
                  const SizedBox(height: 24),
                  if (excerpt.isNotEmpty) ...[
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primaryContainer.withAlpha(13),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: Theme.of(context).colorScheme.primary.withAlpha(51),
                        ),
                      ),
                      child: Text(
                        excerpt,
                        style: TextStyle(
                          fontSize: 14,
                          fontStyle: FontStyle.italic,
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                          height: 1.6,
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                  _buildContent(content, context),
                  const SizedBox(height: 40),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetaItem(String text, BuildContext context) {
    return Text(
      text,
      style: TextStyle(
        fontSize: 12,
        color: Theme.of(context).colorScheme.onSurfaceVariant,
        fontWeight: FontWeight.w500,
      ),
    );
  }

  Widget _buildContent(String htmlContent, BuildContext context) {
    // Fix relative image URLs
    final fixedContent = _fixImageUrls(htmlContent);
    return Html(
      data: fixedContent,
      style: {
        'body': Style(
          margin: Margins.zero,
          padding: HtmlPaddings.zero,
          fontSize: FontSize(15),
          lineHeight: const LineHeight(1.8),
          color: Theme.of(context).colorScheme.onSurface,
        ),
        'p': Style(
          margin: Margins.only(bottom: 12),
        ),
        'img': Style(
          width: Width(100, Unit.percent),
          height: Height.auto(),
        ),
      },
    );
  }

  String _fixImageUrls(String htmlContent) {
    // Simple fix for relative image URLs
    final regex = RegExp(r'src="([^"]+)"');
    return htmlContent.replaceAllMapped(regex, (match) {
      final url = match.group(1) ?? '';
      if (url.startsWith('http')) return match.group(0) ?? '';
      final fixedUrl = NetworkUtils.fixDeviceUrl(url);
      return 'src="$fixedUrl"';
    });
  }

  String _formatDate(String dateString) {
    try {
      final date = DateTime.parse(dateString);
      return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
    } catch (_) {
      return 'N/A';
    }
  }
}