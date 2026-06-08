import 'package:flutter/material.dart';

import '../../utils/network_utils.dart';

class CategorySection extends StatelessWidget {
  final List<dynamic> categories;
  final bool isLoading;
  final VoidCallback onViewAll;
  final ValueChanged<Map<String, dynamic>> onCategorySelected;

  const CategorySection({
    super.key,
    required this.categories,
    required this.isLoading,
    required this.onViewAll,
    required this.onCategorySelected,
  });

  static const _brandColor = Color(0xFFEF7A45);

  @override
  Widget build(BuildContext context) {
    final visibleCategories =
        categories.take(5).cast<Map<String, dynamic>>().toList();

    return Container(
      color: Theme.of(context).colorScheme.surface,
      padding: const EdgeInsets.fromLTRB(20, 26, 20, 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'KHÁM PHÁ HỆ SINH THÁI',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: _brandColor,
                        letterSpacing: 1.2,
                      ),
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Tuyển chọn đẳng cấp',
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
              TextButton(
                onPressed: onViewAll,
                style: TextButton.styleFrom(
                  foregroundColor: _brandColor,
                  padding: const EdgeInsets.only(left: 10, bottom: 2),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: const Text(
                  'XEM TẤT CẢ',
                  style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.6),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          if (isLoading)
            _buildSkeletonGrid()
          else if (visibleCategories.isEmpty)
            Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Text('Chưa có danh mục nào.',
                  style: TextStyle(fontSize: 14, color: Theme.of(context).colorScheme.onSurfaceVariant)),
            )
          else
            _buildCategoryGrid(visibleCategories),
        ],
      ),
    );
  }

  Widget _buildCategoryGrid(List<Map<String, dynamic>> visibleCategories) {
    final cards = <Widget>[];
    for (var index = 0; index < visibleCategories.length; index++) {
      cards.add(
        _CategoryCard(
          category: visibleCategories[index],
          height: _heightForIndex(index),
          showDescription: index == 0 || index == 4,
          onTap: () => onCategorySelected(visibleCategories[index]),
        ),
      );
    }

    return Column(
      children: [
        if (cards.isNotEmpty) cards[0],
        if (cards.length > 1) const SizedBox(height: 6),
        if (cards.length > 1)
          Row(
            children: [
              Expanded(child: cards[1]),
              if (cards.length > 2) const SizedBox(width: 6),
              if (cards.length > 2) Expanded(child: cards[2]),
            ],
          ),
        if (cards.length > 3) const SizedBox(height: 6),
        if (cards.length > 3)
          Row(
            children: [
              Expanded(child: cards[3]),
              if (cards.length > 4) const SizedBox(width: 6),
              if (cards.length > 4) Expanded(flex: 2, child: cards[4]),
            ],
          ),
      ],
    );
  }

  Widget _buildSkeletonGrid() {
    return Column(
      children: [
        const _CategorySkeleton(height: 190),
        const SizedBox(height: 6),
        Row(
          children: const [
            Expanded(child: _CategorySkeleton(height: 150)),
            SizedBox(width: 6),
            Expanded(child: _CategorySkeleton(height: 150)),
          ],
        ),
        const SizedBox(height: 6),
        Row(
          children: const [
            Expanded(child: _CategorySkeleton(height: 165)),
            SizedBox(width: 6),
            Expanded(flex: 2, child: _CategorySkeleton(height: 165)),
          ],
        ),
      ],
    );
  }

  double _heightForIndex(int index) {
    switch (index) {
      case 0:
        return 190;
      case 1:
      case 2:
        return 150;
      default:
        return 165;
    }
  }
}

class _CategoryCard extends StatelessWidget {
  final Map<String, dynamic> category;
  final double height;
  final bool showDescription;
  final VoidCallback onTap;

  const _CategoryCard({
    required this.category,
    required this.height,
    required this.showDescription,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final name = category['name']?.toString() ?? '';
    final imageUrl = NetworkUtils.fixDeviceUrl(category['image']?.toString());

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(2),
      child: SizedBox(
        height: height,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(2),
          child: Stack(
            fit: StackFit.expand,
            children: [
              if (imageUrl.isNotEmpty)
                Image.network(
                  imageUrl,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => _buildFallback(),
                )
              else
                _buildFallback(),
              DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.black.withValues(alpha: 0.05),
                      Colors.black.withValues(alpha: 0.72),
                    ],
                    stops: const [0.35, 1],
                  ),
                ),
              ),
              Positioned(
                left: 18,
                right: 18,
                bottom: 18,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        height: 1.1,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (showDescription) ...[
                      const SizedBox(height: 8),
                      const Text(
                        'Khám phá các sản phẩm nổi bật',
                        style: TextStyle(
                            color: Colors.white70,
                            fontSize: 12,
                            fontWeight: FontWeight.w600),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFallback() {
    return Container(
      color: const Color(0xFF1F2937),
      child: const Center(
        child: Icon(Icons.category_outlined, color: Colors.white54, size: 34),
      ),
    );
  }
}

class _CategorySkeleton extends StatelessWidget {
  final double height;

  const _CategorySkeleton({required this.height});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      decoration: BoxDecoration(
        color: const Color(0xFFE5E7EB),
        borderRadius: BorderRadius.circular(6),
      ),
    );
  }
}
