import 'package:flutter/material.dart';
import '../../utils/network_utils.dart';
import '../../utils/translation.dart';

class HeroBannerSection extends StatefulWidget {
  final List<dynamic> banners;
  final bool isLoading;
  final VoidCallback onShopNow;
  final ValueChanged<int> onBannerIndexChanged;
  final int currentBannerIndex;

  const HeroBannerSection({
    super.key,
    required this.banners,
    required this.isLoading,
    required this.onShopNow,
    required this.onBannerIndexChanged,
    required this.currentBannerIndex,
  });

  @override
  State<HeroBannerSection> createState() => _HeroBannerSectionState();
}

class _HeroBannerSectionState extends State<HeroBannerSection> {
  late final PageController _pageController;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
  }

  @override
  void didUpdateWidget(HeroBannerSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.currentBannerIndex != widget.currentBannerIndex) {
      _pageController.animateToPage(
        widget.currentBannerIndex,
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeInOut,
      );
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.isLoading) {
      return Container(
        height: 280,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
        ),
        child: const Center(child: CircularProgressIndicator()),
      );
    }

    if (widget.banners.isEmpty) {
      return _buildEmptyBanner();
    }

    return Column(
      children: [
        SizedBox(
          height: 280,
          width: double.infinity,
          child: Stack(
            children: [
              // Image carousel with opacity transition (like web)
              Positioned.fill(
                child: ClipRRect(
                  borderRadius: BorderRadius.zero,
                  child: PageView.builder(
                    controller: _pageController,
                    onPageChanged: widget.onBannerIndexChanged,
                    itemCount: widget.banners.length,
                    itemBuilder: (context, index) {
                      final banner = widget.banners[index] as Map<String, dynamic>;
                      final imageUrl = NetworkUtils.fixDeviceUrl(banner['image_url'] as String?);
                      return Opacity(
                        opacity: 0.65,
                        child: Image.network(
                          imageUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(color: Colors.grey.shade300),
                        ),
                      );
                    },
                  ),
                ),
              ),
              // Overlay gradient (like web)
              Positioned.fill(
                child: ClipRRect(
                  borderRadius: BorderRadius.zero,
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.centerLeft,
                        end: Alignment.centerRight,
                        colors: [
                          Colors.black54.withValues(alpha: 0.30),
                          Colors.black.withValues(alpha: 0.20),
                          Colors.black.withValues(alpha: 0.15),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              // Content on top (like web)
              Positioned(
                left: 20,
                right: 20,
                top: 0,
                bottom: 0,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.banners[widget.currentBannerIndex]['title'] ?? 'Khám phá ưu đãi mới',
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600, height: 1.15, color: Colors.white),
                    ),
                    const SizedBox(height: 8),
                    if ((widget.banners[widget.currentBannerIndex]['description'] as String?)?.isNotEmpty ?? false)
                      Text(
                        widget.banners[widget.currentBannerIndex]['description'] ?? '',
                        style: const TextStyle(fontSize: 13, color: Colors.white70, height: 1.4),
                      ),
                    const SizedBox(height: 14),
                    ElevatedButton(
                      onPressed: widget.onShopNow,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFEF7A45),
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        elevation: 8,
                      ),
                      child: Text(
                        Trans.explore,
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Container(width: 30, height: 2, color: const Color(0xFFEF7A45)),
                        const SizedBox(width: 12),
                        const Text(
                          'CẬP NHẬT MỚI NHẤT',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFFEF7A45),
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        if (widget.banners.length > 1)
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(
              widget.banners.length,
              (index) => GestureDetector(
                onTap: () {
                  _pageController.animateToPage(
                    index,
                    duration: const Duration(milliseconds: 500),
                    curve: Curves.easeInOut,
                  );
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  margin: const EdgeInsets.symmetric(horizontal: 6),
                  width: index == widget.currentBannerIndex ? 12 : 8,
                  height: 8,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: index == widget.currentBannerIndex ? const Color(0xFFEF7A45) : Colors.white,
                    border: Border.all(
                      color: index == widget.currentBannerIndex ? const Color(0xFFEF7A45) : Colors.grey.shade300,
                      width: 1.5,
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildEmptyBanner() {
    return SizedBox(
      height: 280,
      width: double.infinity,
      child: Stack(
        children: [
          Positioned.fill(
            child: ClipRRect(
              borderRadius: BorderRadius.zero,
              child: Container(color: Colors.grey.shade200),
            ),
          ),
          Positioned.fill(
            child: ClipRRect(
              borderRadius: BorderRadius.zero,
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.centerLeft,
                    end: Alignment.centerRight,
                    colors: [
                      Colors.white.withValues(alpha: 0.72),
                      Colors.orange.shade50.withValues(alpha: 0.35),
                      Colors.orange.shade100.withValues(alpha: 0.18),
                    ],
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            left: 20,
            right: 20,
            top: 0,
            bottom: 0,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Chính xác.\nSức mạnh.\nHoàn hảo.',
                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700, height: 1.15),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Ư u đãi và sản phẩm mới nhất đang chờ bạn khám phá.',
                  style: TextStyle(fontSize: 13, color: Colors.black54, height: 1.4),
                ),
                const SizedBox(height: 14),
                ElevatedButton(
                  onPressed: widget.onShopNow,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFEF7A45),
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    elevation: 8,
                  ),
                  child: const Text(
                    'Khám Phá Ngay',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Container(width: 30, height: 2, color: const Color(0xFFEF7A45)),
                    const SizedBox(width: 12),
                    const Text(
                      'CẬP NHẬT MỚI NHẤT',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFFEF7A45),
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
