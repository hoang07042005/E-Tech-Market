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

  Widget build(BuildContext context) {
    final visibleArticles =
        articles.take(8).cast<Map<String, dynamic>>().toList();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 10),
      color: Theme.of(context).colorScheme.surface,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.only(bottom: 5),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'TIN TỨC CÔNG NGHỆ',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: _brandColor,
                          letterSpacing: 1.2,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Bài viết mới nhất',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: Theme.of(context).colorScheme.onSurface,
                          height: 1.1,
                        ),
                      ),
                    ],
                  ),
                ),
                GestureDetector(
                  onTap: onViewAll,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Xem tất cả',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: _brandColor,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Icon(Icons.arrow_forward_ios,
                          size: 12, color: _brandColor),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (isLoading)
            _buildSkeletonList()
          else if (visibleArticles.isEmpty)
            Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Text(
                'Chưa có bài viết nào.',
                textAlign: TextAlign.center,
                style: TextStyle(
                    fontSize: 14,
                    color: Theme.of(context).colorScheme.onSurfaceVariant),
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: visibleArticles.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final article = visibleArticles[index];
                return _NewsCard(
                  article: article,
                  onTap: () {
                    AppSnackBar.showInfo(context,
                        'Mở bài viết: ${article['title'] ?? 'Không có tiêu đề'}');
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
    final imageUrl =
        NetworkUtils.fixDeviceUrl(article['thumbnail_url']?.toString() ?? '');
    final categoryName = article['category']?['name']?.toString() ?? '';
    final readingTime = article['reading_time'] as int? ?? 0;
    final publishedAt = _formatDate(article['published_at']?.toString() ?? '');
    final catColor = _getCategoryColor(categoryName);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(
                color: Theme.of(context).colorScheme.surfaceContainerLow,
                width: 1,
              ),
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 0),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Stack(
                  children: [
                    if (imageUrl.isNotEmpty)
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.network(
                          imageUrl,
                          width: 140,
                          height: 100,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) =>
                              _buildImageFallback(context, 140, 100),
                        ),
                      )
                    else
                      _buildImageFallback(context, 140, 100),
                    if (categoryName.isNotEmpty)
                      Positioned(
                        top: 6,
                        left: 6,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 3),
                          decoration: BoxDecoration(
                            color: catColor,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            categoryName,
                            style: const TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                              letterSpacing: 0.3,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          color: Theme.of(context).colorScheme.onSurface,
                          height: 1.3,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        excerpt,
                        style: TextStyle(
                          fontSize: 12,
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                          height: 1.4,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Text(
                            publishedAt,
                            style: TextStyle(
                              fontSize: 11,
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurfaceVariant,
                            ),
                          ),
                          if (readingTime > 0) ...[
                            Text(
                              ' • ',
                              style: TextStyle(
                                fontSize: 11,
                                color: Theme.of(context)
                                    .colorScheme
                                    .onSurfaceVariant,
                              ),
                            ),
                            Text(
                              '$readingTime phút đọc',
                              style: TextStyle(
                                fontSize: 11,
                                color: Theme.of(context)
                                    .colorScheme
                                    .onSurfaceVariant,
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 4),
                      Align(
                        alignment: Alignment.centerRight,
                        child: Text(
                          'Đọc tiếp →',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFFEF7A45),
                          ),
                        ),
                      )
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

  Widget _buildImageFallback(
      BuildContext context, double width, double height) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Center(
        child: Icon(
          Icons.newspaper_outlined,
          color: Theme.of(context).colorScheme.outline,
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

  Color _getCategoryColor(String categoryName) {
    if (categoryName.isEmpty) return Colors.grey;

    final lowerName = categoryName.toLowerCase();
    if (lowerName.contains('đánh giá')) return const Color(0xFFE91E63);
    if (lowerName.contains('công nghệ')) return const Color(0xFF2196F3);
    if (lowerName.contains('tư vấn')) return const Color(0xFF4CAF50);
    if (lowerName.contains('tin tức')) return const Color(0xFFFF9800);
    if (lowerName.contains('khuyến mãi')) return const Color(0xFFF44336);

    final colors = const [
      Color(0xFF9C27B0),
      Color(0xFF3F51B5),
      Color(0xFF00BCD4),
      Color(0xFF009688),
      Color(0xFFFF5722),
      Color(0xFF795548),
      Color(0xFF607D8B),
    ];

    int hash = 0;
    for (int i = 0; i < categoryName.length; i++) {
      hash = (hash * 31 + categoryName.codeUnitAt(i)) & 0x7FFFFFFF;
    }
    return colors[hash % colors.length];
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
              color: Theme.of(context).colorScheme.surfaceContainerLow,
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
                    color: Theme.of(context).colorScheme.surfaceContainerLow,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  height: 18,
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surfaceContainerLow,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  height: 12,
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surfaceContainerLow,
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
