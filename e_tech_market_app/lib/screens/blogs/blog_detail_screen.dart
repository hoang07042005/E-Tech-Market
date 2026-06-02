import 'package:flutter/material.dart';
import '../../utils/network_utils.dart';

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
    final content = post['content_html'] ?? post['content'] ?? 'Nội dung không có sẵn';
    final categoryName = post['category']?['name'] ?? 'Tin tức';
    final authorName = post['author']?['name'] ?? 'E-Tech Market';
    final createdAt = post['published_at'] ?? '';
    final readingTime = post['reading_time'] ?? 5;
    final views = (post['views'] as num?)?.toInt() ?? 0;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Chi Tiết Bài Viết'),
        centerTitle: true,
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
        elevation: 1,
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Hero Image
            Image.network(
              imageUrl,
              width: double.infinity,
              height: 280,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                height: 280,
                color: Colors.grey[300],
                child: const Icon(Icons.image_not_supported, size: 64),
              ),
            ),

            // Content
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Category badge
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEF7A45).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                      border:
                          Border.all(color: const Color(0xFFEF7A45), width: 1),
                    ),
                    child: Text(
                      categoryName,
                      style: const TextStyle(
                        color: Color(0xFFEF7A45),
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Title
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF0F172A),
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Meta info
                  Row(
                    children: [
                      // Author
                      Row(
                        children: [
                          Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: const Color(0xFFEF7A45).withValues(alpha: 0.2),
                            ),
                            child: Center(
                              child: Text(
                                authorName.isNotEmpty ? authorName[0] : 'E',
                                style: const TextStyle(
                                  color: Color(0xFFEF7A45),
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
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFF0F172A),
                                ),
                              ),
                              Text(
                                _formatDate(createdAt),
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: Color(0xFF94A3B8),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Meta stats
                  Row(
                    children: [
                      _buildMetaItem('⏱️ $readingTime phút đọc'),
                      const SizedBox(width: 16),
                      _buildMetaItem('👁️ $views lượt xem'),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Divider
                  Container(
                    height: 1,
                    color: const Color(0xFFE2E8F0),
                  ),
                  const SizedBox(height: 24),

                  // Excerpt
                  if (excerpt.isNotEmpty) ...[
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEF7A45).withValues(alpha: 0.05),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: const Color(0xFFEF7A45).withValues(alpha: 0.2),
                        ),
                      ),
                      child: Text(
                        excerpt,
                        style: const TextStyle(
                          fontSize: 14,
                          fontStyle: FontStyle.italic,
                          color: Color(0xFF64748B),
                          height: 1.6,
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],

                  // Main content
                  _buildContent(content),

                  const SizedBox(height: 40),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetaItem(String text) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 12,
        color: Color(0xFF64748B),
        fontWeight: FontWeight.w500,
      ),
    );
  }

  Widget _buildContent(String htmlContent) {
    // Simple HTML stripping for display
    String plainText = htmlContent
        .replaceAll(RegExp(r'<[^>]*>'), '') // Remove HTML tags
        .replaceAll('&nbsp;', ' ')
        .replaceAll('&quot;', '"')
        .replaceAll('&amp;', '&')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .trim();

    if (plainText.isEmpty) {
      plainText = htmlContent.trim();
    }

    return Text(
      plainText,
      style: const TextStyle(
        fontSize: 15,
        color: Color(0xFF0F172A),
        height: 1.8,
        fontWeight: FontWeight.w400,
      ),
    );
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
