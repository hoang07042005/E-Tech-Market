import 'package:flutter/material.dart';

import '../../utils/network_utils.dart';
import '../../utils/translation.dart';

class ReviewsSection extends StatelessWidget {
  final List<dynamic> reviews;
  final bool isLoading;

  const ReviewsSection({
    super.key,
    required this.reviews,
    required this.isLoading,
  });

  static const _brandColor = Color(0xFFEF7A45);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 30),
      color: Theme.of(context).colorScheme.surface,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.only(bottom: 30),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Text(
                  Trans.experienceReality,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: _brandColor,
                    letterSpacing: 1.2,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  Trans.customerReviews,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 25,
                    fontWeight: FontWeight.w800,
                    color: Theme.of(context).colorScheme.onSurface,
                    height: 1.1,
                  ),
                ),
              ],
            ),
          ),
          if (isLoading)
            _buildSkeletonList()
          else if (reviews.isEmpty)
            Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Text(
                'Chưa có đánh giá nổi bật.',
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
              itemCount: reviews.length,
              separatorBuilder: (_, __) => const SizedBox(height: 20),
              itemBuilder: (context, index) {
                final review = reviews[index] as Map<String, dynamic>;
                return _ReviewCard(review: review);
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
      separatorBuilder: (_, __) => const SizedBox(height: 20),
      itemBuilder: (_, __) => const _ReviewCardSkeleton(),
    );
  }
}

class _ReviewCard extends StatelessWidget {
  final Map<String, dynamic> review;

  const _ReviewCard({required this.review});

  @override
  Widget build(BuildContext context) {
    final userName = review['user']?['name']?.toString() ?? Trans.user;
    final userAvatarUrl = NetworkUtils.fixDeviceUrl(
        review['user']?['avatar_url']?.toString() ?? '');
    final rating = (review['rating'] as num?)?.toInt() ?? 5;
    final comment =
        review['comment']?.toString() ?? 'Khách hàng không để lại bình luận.';
    final createdAt = (review['created_at'] ??
                review['createdAt'] ??
                review['date'] ??
                review['published_at'])
            ?.toString()
            .trim() ??
        '';
    final productName = review['product']?['name']?.toString() ?? '';
    final expPerformance = _toNullableInt(review['exp_performance']);
    final expBattery = _toNullableInt(review['exp_battery']);
    final expCamera = _toNullableInt(review['exp_camera']);
    final experienceWidgets = <Widget>[
      if (expPerformance != null)
        _buildExperienceMetric(context, 'performance', expPerformance),
      if (expBattery != null)
        _buildExperienceMetric(context, 'battery', expBattery),
      if (expCamera != null)
        _buildExperienceMetric(context, 'camera', expCamera),
    ];
    final mediaItems = _extractMediaItems(review['media']);

    return Container(
      decoration: BoxDecoration(
        border: Border.all(
            color: Theme.of(context).colorScheme.outline, width: 0.15),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Avatar
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Color(0xFFEF7A45).withValues(alpha: 0.1),
                  ),
                  child: userAvatarUrl.isNotEmpty
                      ? ClipOval(
                          child: Image.network(
                            userAvatarUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) =>
                                Center(child: _buildAvatarInitial(userName)),
                          ),
                        )
                      : Center(child: _buildAvatarInitial(userName)),
                ),
                const SizedBox(width: 16),
                // Right content
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Stars and rating label
                      Row(
                        children: [
                          _buildStars(rating),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              _getRatingLabel(rating),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFFEF7A45),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        userName,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: Theme.of(context).colorScheme.onSurface,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            if (experienceWidgets.isNotEmpty) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  for (var i = 0; i < experienceWidgets.length; i++) ...[
                    if (i > 0) const SizedBox(width: 8),
                    experienceWidgets[i],
                  ],
                ],
              ),
            ],
            const SizedBox(height: 10),
            // Comment
            Text(
              comment,
              style: TextStyle(
                fontSize: 13,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
                height: 1.5,
              ),
              // maxLines: 4,
              // overflow: TextOverflow.ellipsis,
            ),
            if (mediaItems.isNotEmpty) ...[
              const SizedBox(height: 10),
              SizedBox(
                height: 72,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: mediaItems.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, index) {
                    final item = mediaItems[index];
                    return GestureDetector(
                      onTap: () => _showMediaViewer(context, mediaItems, index),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: SizedBox(
                          width: 72,
                          height: 72,
                          child: item.type == 'video'
                              ? Stack(
                                  fit: StackFit.expand,
                                  children: [
                                    Container(color: Colors.black87),
                                    const Center(
                                      child: Icon(
                                        Icons.play_circle_fill,
                                        color: Colors.white,
                                        size: 30,
                                      ),
                                    ),
                                  ],
                                )
                              : Image.network(
                                  item.url,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => Container(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .surfaceContainerLow,
                                    child: const Icon(Icons.image,
                                        color: Colors.grey),
                                  ),
                                ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
            const SizedBox(height: 10),
            // Time
            Text(
              '🕒Thời gian : ${_formatDate(createdAt)}',
              style: TextStyle(
                fontSize: 11,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            // Product name
            if (productName.isNotEmpty) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceContainerLow,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  Trans.productWithName(productName),
                  style: TextStyle(
                    fontSize: 11,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildAvatarInitial(String name) {
    final initial = name.isNotEmpty ? name[0].toUpperCase() : 'U';
    return Text(
      initial,
      style: TextStyle(
        fontSize: 24,
        fontWeight: FontWeight.w700,
        color: Color(0xFFEF7A45),
      ),
    );
  }

  Widget _buildStars(int rating) {
    return Row(
      children: List.generate(5, (index) {
        return Icon(
          index < rating ? Icons.star : Icons.star_border,
          color: Color.fromARGB(255, 255, 217, 1),
          size: 14,
        );
      }),
    );
  }

  String _getRatingLabel(int rating) {
    if (rating >= 5) return Trans.ratingExcellent;
    if (rating == 4) return Trans.ratingVeryGood;
    if (rating == 3) return Trans.ratingGood;
    if (rating == 2) return Trans.ratingOkay;
    return Trans.ratingNotSatisfied;
  }

  int? _toNullableInt(dynamic value) {
    if (value == null) return null;
    if (value is num) return value.toInt();
    return int.tryParse(value.toString());
  }

  Widget _buildExperienceMetric(BuildContext context, String key, int value) {
    final label = key == 'performance'
        ? 'Hi\u1ec7u n\u0103ng'
        : key == 'battery'
            ? 'Th\u1eddi l\u01b0\u1ee3ng'
            : 'Camera';

    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerLow,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.star, color: Color(0xFFEF7A45), size: 14),
                const SizedBox(width: 3),
                Text(
                  '$value/5',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  List<_ReviewMediaItem> _extractMediaItems(dynamic raw) {
    if (raw is! List) return const [];
    final items = <_ReviewMediaItem>[];
    for (final item in raw) {
      if (item is! Map) continue;
      final url = NetworkUtils.fixDeviceUrl(item['url']?.toString() ?? '');
      if (url.isEmpty) continue;
      items.add(_ReviewMediaItem(
        type: item['type']?.toString() == 'video' ? 'video' : 'image',
        url: url,
      ));
    }
    return items;
  }

  void _showMediaViewer(
    BuildContext context,
    List<_ReviewMediaItem> items,
    int initialIndex,
  ) {
    showDialog(
      context: context,
      barrierColor: Colors.black87,
      builder: (ctx) {
        var currentIndex = initialIndex;
        return StatefulBuilder(
          builder: (ctx, setViewerState) {
            final item = items[currentIndex];
            return GestureDetector(
              onTap: () => Navigator.pop(ctx),
              child: Scaffold(
                backgroundColor: Colors.transparent,
                body: SafeArea(
                  child: Stack(
                    children: [
                      Center(
                        child: item.type == 'video'
                            ? const Icon(
                                Icons.play_circle_fill,
                                color: Colors.white,
                                size: 72,
                              )
                            : InteractiveViewer(
                                child: Image.network(
                                  item.url,
                                  fit: BoxFit.contain,
                                  errorBuilder: (_, __, ___) => const Icon(
                                    Icons.broken_image,
                                    color: Colors.white,
                                    size: 64,
                                  ),
                                ),
                              ),
                      ),
                      Positioned(
                        top: 8,
                        right: 8,
                        child: IconButton(
                          onPressed: () => Navigator.pop(ctx),
                          icon: const Icon(Icons.close, color: Colors.white),
                        ),
                      ),
                      if (items.length > 1) ...[
                        Positioned(
                          left: 8,
                          top: 0,
                          bottom: 0,
                          child: Center(
                            child: IconButton(
                              onPressed: currentIndex > 0
                                  ? () => setViewerState(() => currentIndex--)
                                  : null,
                              icon: Icon(
                                Icons.chevron_left,
                                color: currentIndex > 0
                                    ? Colors.white
                                    : Colors.transparent,
                                size: 32,
                              ),
                            ),
                          ),
                        ),
                        Positioned(
                          right: 8,
                          top: 0,
                          bottom: 0,
                          child: Center(
                            child: IconButton(
                              onPressed: currentIndex < items.length - 1
                                  ? () => setViewerState(() => currentIndex++)
                                  : null,
                              icon: Icon(
                                Icons.chevron_right,
                                color: currentIndex < items.length - 1
                                    ? Colors.white
                                    : Colors.transparent,
                                size: 32,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  String _formatDate(String isoDate) {
    if (isoDate.isEmpty) return 'vừa xong';
    try {
      final normalized =
          isoDate.contains('T') ? isoDate : isoDate.replaceFirst(' ', 'T');
      final dateTime = DateTime.parse(normalized).toLocal();
      final now = DateTime.now();
      final diff = now.difference(dateTime);

      if (diff.isNegative || diff.inSeconds < 60) {
        return 'vừa xong';
      }
      if (diff.inDays == 0) {
        if (diff.inHours == 0) {
          return '${diff.inMinutes} ${Trans.minutesAgo}';
        }
        return '${diff.inHours} ${Trans.hoursAgo}';
      } else if (diff.inDays < 30) {
        return '${diff.inDays} ${Trans.daysAgo}';
      } else {
        return dateTime.toString().split(' ')[0];
      }
    } catch (_) {
      return isoDate;
    }
  }
}

class _ReviewMediaItem {
  final String type;
  final String url;

  const _ReviewMediaItem({
    required this.type,
    required this.url,
  });
}

class _ReviewCardSkeleton extends StatelessWidget {
  const _ReviewCardSkeleton();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 64,
            height: 64,
            color: Theme.of(context).colorScheme.surfaceContainerLow,
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 100,
                  height: 14,
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surfaceContainerLow,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  height: 50,
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surfaceContainerLow,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                const SizedBox(height: 10),
                Container(
                  width: 80,
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
