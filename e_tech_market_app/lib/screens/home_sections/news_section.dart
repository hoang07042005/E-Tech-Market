import 'package:flutter/material.dart';

import '../../utils/network_utils.dart';
import '../../utils/app_snackbar.dart';

class NewsSection extends StatelessWidget {
  final List<dynamic> articles;
  final bool isLoading;
  final VoidCallback onViewAll;

  const NewsSection({
    super.key,
    required this.articles,
    required this.isLoading,
    required this.onViewAll,
  });

  static const _brandColor = Color(0xFFEF7A45);

  @override
  Widget build(BuildContext context) {
    final visibleArticles = articles.take(5).cast<Map<String, dynamic>>().toList();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 30),
      decoration: const BoxDecoration(
        color: Colors.white,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.only(bottom: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                const Text(
                  'TIN TỨC CÔNG NGHỆ',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: _brandColor,
                    letterSpacing: 1.2,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Bài viết mới nhất',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 25,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF111827),
                    height: 1.1,
                  ),
                ),
              ],
            ),
          ),
          if (isLoading)
            _buildSkeletonList()
          else if (visibleArticles.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Text(
                'Chưa có bài viết nào.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: Colors.black54),
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: visibleArticles.length,
              separatorBuilder: (_, __) => const SizedBox(height: 16),
              itemBuilder: (context, index) {
                final article = visibleArticles[index];
                return _NewsCard(
                  article: article,
                  onTap: () {
                    AppSnackBar.showInfo(context, 'Mở bài viết: ${article['title'] ?? 'Không có tiêu đề'}');
                  },
                );
              },
            ),
        ],
      ),
    );
  }

  Widget _buildSkeletonList() {
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: 3,
      separatorBuilder: (_, __) => const SizedBox(height: 16),
      itemBuilder: (_, __) => const _NewsCardSkeleton(),
    );
  }
}

class _NewsCard extends StatelessWidget {
  final Map<String, dynamic> article;
  final VoidCallback onTap;

  const _NewsCard({
    required this.article,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final title = article['title']?.toString() ?? '';
    final excerpt = article['excerpt']?.toString() ?? '';
    final imageUrl = NetworkUtils.fixDeviceUrl(article['thumbnail_url']?.toString() ?? '');
    final categoryName = article['category']?['name']?.toString() ?? '';
    final readingTime = article['reading_time'] as int? ?? 0;
    final publishedAt = _formatDate(article['published_at']?.toString() ?? '');

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(
                color: const Color(0xFFF1F5F9),
                width: 1,
              ),
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 5),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                if (imageUrl.isNotEmpty)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.network(
                      imageUrl,
                      width: 140,
                      height: 100,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _buildImageFallback(140, 100),
                    ),
                  )
                else
                  _buildImageFallback(140, 100),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (categoryName.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEF7A45).withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              categoryName,
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFFEF7A45),
                                letterSpacing: 0.3,
                              ),
                            ),
                          ),
                        ),
                      Text(
                        title,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF111827),
                          height: 1.3,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        excerpt,
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF64748B),
                          height: 1.4,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Text(
                            publishedAt,
                            style: const TextStyle(
                              fontSize: 11,
                              color: Color(0xFFA3A3A3),
                            ),
                          ),
                          if (readingTime > 0) ...[
                            const Text(
                              ' • ',
                              style: TextStyle(
                                fontSize: 11,
                                color: Color(0xFFA3A3A3),
                              ),
                            ),
                            Text(
                              '$readingTime phút đọc',
                              style: const TextStyle(
                                fontSize: 11,
                                color: Color(0xFFA3A3A3),
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Đọc tiếp →',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFFEF7A45),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildImageFallback(double width, double height) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Center(
        child: Icon(
          Icons.newspaper_outlined,
          color: Color(0xFFCBD5E1),
          size: 32,
        ),
      ),
    );
  }

  String _formatDate(String isoDate) {
    if (isoDate.isEmpty) return '';
    try {
      final dateTime = DateTime.parse(isoDate);
      final now = DateTime.now();
      final diff = now.difference(dateTime);

      if (diff.inDays == 0) {
        if (diff.inHours == 0) {
          return '${diff.inMinutes} phút trước';
        }
        return '${diff.inHours} giờ trước';
      } else if (diff.inDays < 30) {
        return '${diff.inDays} ngày trước';
      } else {
        return dateTime.toLocal().toString().split(' ')[0];
      }
    } catch (_) {
      return '';
    }
  }
}

class _NewsCardSkeleton extends StatelessWidget {
  const _NewsCardSkeleton();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          Container(
            width: 140,
            height: 100,
            decoration: BoxDecoration(
              color: const Color(0xFFE5E7EB),
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 80,
                  height: 14,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE5E7EB),
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  height: 18,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE5E7EB),
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  height: 12,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE5E7EB),
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
