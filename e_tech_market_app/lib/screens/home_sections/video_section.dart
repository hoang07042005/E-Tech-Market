import 'package:flutter/material.dart';

import '../../utils/network_utils.dart';

import '../videos/video_detail_screen.dart';

class VideoSection extends StatelessWidget {
  final List<dynamic> videos;
  final bool isLoading;
  final VoidCallback onViewAll;

  const VideoSection({
    super.key,
    required this.videos, 
    required this.isLoading,
    required this.onViewAll,
  });

  static const _brandColor = Color(0xFFEF7A45);

  @override
  Widget build(BuildContext context) {
    final visibleVideos = videos.take(4).cast<Map<String, dynamic>>().toList();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 24, 0, 30), // Bỏ padding phải để danh sách trượt tự nhiên ra mép
      decoration: const BoxDecoration(
        color: Colors.white,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
            Padding(
              padding: const EdgeInsets.only(bottom: 20, right: 20),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'REVIEW THỰC TẾ & TRỰC QUAN',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: _brandColor,
                            letterSpacing: 1.2,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Video nổi bật',
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
                  TextButton(
                    onPressed: onViewAll,
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Text(
                          'Xem tất cả',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: _brandColor,
                          ),
                        ),
                        SizedBox(width: 4),
                        Icon(Icons.arrow_forward_ios, size: 12, color: _brandColor),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          if (isLoading)
            _buildSkeletonGrid()
          else if (visibleVideos.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Text(
                'Chưa có video nào.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: Colors.black54),
              ),
            )
          else
            SizedBox(
              height: 250,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                clipBehavior: Clip.none,
                itemCount: visibleVideos.length,
                separatorBuilder: (_, __) => const SizedBox(width: 16),
                itemBuilder: (context, index) {
                  final video = visibleVideos[index];
                  // Thêm khoảng trống padding-right cho item cuối cùng
                  final isLast = index == visibleVideos.length - 1;
                  return Padding(
                    padding: EdgeInsets.only(right: isLast ? 20 : 0),
                    child: _VideoCard(
                      video: video,
                      onTap: () {
                        final videoId = video['id'] as int?;
                        if (videoId != null) {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => VideoDetailScreen(videoId: videoId),
                            ),
                          );
                        }
                      },
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSkeletonGrid() {
    return SizedBox(
      height: 250,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        clipBehavior: Clip.none,
        itemCount: 4,
        separatorBuilder: (_, __) => const SizedBox(width: 16),
        itemBuilder: (context, index) {
          final isLast = index == 3;
          return Padding(
            padding: EdgeInsets.only(right: isLast ? 20 : 0),
            child: const _VideoCardSkeleton(),
          );
        },
      ),
    );
  }
}

class _VideoCard extends StatelessWidget {
  final Map<String, dynamic> video;
  final VoidCallback onTap;

  const _VideoCard({
    required this.video,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final title = video['title']?.toString() ?? 'Video giới thiệu';

    final thumbnail = NetworkUtils.fixDeviceUrl(video['thumbnail_url']?.toString() ?? 
        video['product']?['main_image_url']?.toString() ?? '');
    final productName = video['product']?['name']?.toString() ?? '';

    return SizedBox(
      width: 280,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  height: 158, // 16:9 tỷ lệ cho thumbnail
                  decoration: const BoxDecoration(
                    color: Color(0xFFF1F5F9),
                  ),
                  child: Stack(
                    children: [
                      if (thumbnail.isNotEmpty)
                        Image.network(
                          thumbnail,
                          fit: BoxFit.cover,
                          width: double.infinity,
                          height: double.infinity,
                          errorBuilder: (_, __, ___) => const Center(
                            child: Icon(
                              Icons.play_circle_outlined,
                              color: Color(0xFFCBD5E1),
                              size: 48,
                            ),
                          ),
                        )
                      else
                        const Center(
                          child: Icon(
                            Icons.play_circle_outlined,
                            color: Color(0xFFCBD5E1),
                            size: 48,
                          ),
                        ),
                      // Play overlay
                      Container(
                        color: Colors.black.withValues(alpha: 0.3),
                        child: Center(
                          child: Container(
                            width: 56,
                            height: 56,
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.9),
                              borderRadius: BorderRadius.circular(50),
                            ),
                            child: const Center(
                              child: Icon(
                                Icons.play_arrow,
                                color: Color(0xFFEF7A45),
                                size: 28,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 12),
            Text(
              title,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: Color(0xFF111827),
                height: 1.3,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            // Loại bỏ dòng miêu tả để card gọn và tập trung vào tiêu đề hơn
            if (productName.isNotEmpty) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 8,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFFEF7A45).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: const Color(0xFFEF7A45).withValues(alpha: 0.2),
                    width: 1,
                  ),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.link_outlined,
                      size: 12,
                      color: Color(0xFFEF7A45),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        productName,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFFEF7A45),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    ),
  );
}
}

class _VideoCardSkeleton extends StatelessWidget {
  const _VideoCardSkeleton();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 280,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            height: 158,
            decoration: BoxDecoration(
              color: const Color(0xFFE5E7EB),
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            height: 16,
            decoration: BoxDecoration(
              color: const Color(0xFFE5E7EB),
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          const SizedBox(height: 8),
          Container(
            width: 140, // width limit
            height: 16,
            decoration: BoxDecoration(
              color: const Color(0xFFE5E7EB),
              borderRadius: BorderRadius.circular(4),
            ),
          ),
        ],
      ),
    );
  }
}
