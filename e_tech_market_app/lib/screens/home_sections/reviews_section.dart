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
            padding: const EdgeInsets.only(bottom: 20),
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
                style: TextStyle(fontSize: 14, color: Theme.of(context).colorScheme.onSurfaceVariant),
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
    final userAvatarUrl =
        NetworkUtils.fixDeviceUrl(review['user']?['avatar_url']?.toString() ?? '');
    final rating = (review['rating'] as num?)?.toInt() ?? 5;
    final comment = review['comment']?.toString() ?? 'Khách hàng không để lại bình luận.';
    final createdAt = review['created_at']?.toString() ?? '';
    final productName = review['product']?['name']?.toString() ?? '';

    return Container(
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: Theme.of(context).colorScheme.surfaceContainerLow,
            width: 1,
          ),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Avatar
            Container(
              width: 64,
              height: 64,
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
                  Text(
                    userName,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                  ),
                  const SizedBox(height: 6),
                  // Stars and rating label
                  Row(
                    children: [
                      _buildStars(rating),
                      const SizedBox(width: 8),
                      Text(
                        _getRatingLabel(rating),
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFFEF7A45),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  // Comment
                  Text(
                    comment,
                    style: TextStyle(
                      fontSize: 13,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                      height: 1.5,
                    ),
                    maxLines: 4,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 10),
                  // Time
                  Text(
                    '🕒 Đánh giá đã đăng vào ${_formatDate(createdAt)}',
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
          color: Color(0xFFEF7A45),
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

  String _formatDate(String isoDate) {
    if (isoDate.isEmpty) return '';
    try {
      final dateTime = DateTime.parse(isoDate);
      final now = DateTime.now();
      final diff = now.difference(dateTime);

      if (diff.inDays == 0) {
        if (diff.inHours == 0) {
          return '${diff.inMinutes} ${Trans.minutesAgo}';
        }
        return '${diff.inHours} ${Trans.hoursAgo}';
      } else if (diff.inDays < 30) {
        return '${diff.inDays} ${Trans.daysAgo}';
      } else {
        return dateTime.toLocal().toString().split(' ')[0];
      }
    } catch (_) {
      return '';
    }
  }
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
