import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'dart:async';
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
        duration: const Duration(milliseconds: 600),
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
        height: 300,
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
          height: 320, // Increased height to accommodate the banner + marquee padding
          width: double.infinity,
          child: Stack(
            children: [
              // Image carousel
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
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
                        opacity: 0.8,
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
              // Bỏ overlay gradient để banner sáng rõ theo yêu cầu
              // Content on top
              Positioned(
                left: 45,
                right: 45,
                top: 30,
                child: _buildBannerContent(),
              ),
              // Dots Navigation
              if (widget.banners.length > 1)
                Positioned(
                  bottom: 60, // Above the marquee
                  left: 0,
                  right: 0,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(
                      widget.banners.length,
                      (index) => GestureDetector(
                        onTap: () {
                          _pageController.animateToPage(
                            index,
                            duration: const Duration(milliseconds: 600),
                            curve: Curves.easeInOut,
                          );
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 60),
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          width: index == widget.currentBannerIndex ? 12 : 8,
                          height: 8,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: index == widget.currentBannerIndex ? const Color(0xFFF97316) : Colors.white54,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              // Navigation Arrows
              if (widget.banners.length > 1) ...[
                Positioned(
                  left: 8,
                  top: 0,
                  bottom: 70,
                  child: Center(
                    child: GestureDetector(
                      onTap: () {
                        final newIndex = widget.currentBannerIndex == 0 ? widget.banners.length - 1 : widget.currentBannerIndex - 1;
                        _pageController.animateToPage(
                          newIndex,
                          duration: const Duration(milliseconds: 600),
                          curve: Curves.easeInOut,
                        );
                      },
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: Colors.black45,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.chevron_left, color: Colors.white, size: 20),
                      ),
                    ),
                  ),
                ),
                Positioned(
                  right: 8,
                  top: 0,
                  bottom: 70,
                  child: Center(
                    child: GestureDetector(
                      onTap: () {
                        final newIndex = widget.currentBannerIndex == widget.banners.length - 1 ? 0 : widget.currentBannerIndex + 1;
                        _pageController.animateToPage(
                          newIndex,
                          duration: const Duration(milliseconds: 600),
                          curve: Curves.easeInOut,
                        );
                      },
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF97316),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.chevron_right, color: Colors.white, size: 20),
                      ),
                    ),
                  ),
                ),
              ],
              // Features Marquee at the bottom
              const Positioned(
                bottom: 10,
                left: 0,
                right: 0,
                child: HeroBannerMarquee(),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildBannerContent() {
    final titleRaw = widget.banners[widget.currentBannerIndex]['title'] ?? 'CHẠM ĐẾN TƯƠNG LAI\nTHIẾT BỊ ĐỈNH CAO';
    final parts = (titleRaw as String).split('\n');
    String title1 = parts[0];
    String title2 = parts.length > 1 ? parts.sublist(1).join('\n') : '';

    if (parts.length == 1 && titleRaw.contains(' ')) {
      final words = titleRaw.split(' ');
      final mid = (words.length / 2).floor();
      title1 = words.sublist(0, mid).join(' ');
      title2 = words.sublist(mid).join(' ');
    }

    return Column(
      mainAxisAlignment: MainAxisAlignment.start,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Badge E-TECH MARKET
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            border: Border.all(color: const Color(0xFFF97316), width: 0.5),
            borderRadius: BorderRadius.circular(20),
            color: Colors.black54,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: const [
              Text(
                'E-TECH ',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 10,
                  letterSpacing: 1,
                ),
              ),
              Text(
                'MARKET',
                style: TextStyle(
                  color: Color(0xFFF97316),
                  fontWeight: FontWeight.bold,
                  fontSize: 10,
                  letterSpacing: 1,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        // Title
        if (title2.isNotEmpty)
          RichText(
            text: TextSpan(
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, height: 1.2),
              children: [
                TextSpan(
                  text: '$title1\n',
                  style: const TextStyle(color: Colors.white),
                ),
                TextSpan(
                  text: title2,
                  style: const TextStyle(color: Color(0xFFF97316)),
                ),
              ],
            ),
          )
        else
          Text(
            title1,
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white, height: 1.2),
          ),
        const SizedBox(height: 10),
        // Description
        Text(
          widget.banners[widget.currentBannerIndex]['description'] ?? 'Khám phá thế hệ công nghệ mới với những thiết bị chính hãng, hiệu năng vượt trội.',
          style: const TextStyle(fontSize: 12, color: Colors.white70, height: 1.4),
          maxLines: 3,
          overflow: TextOverflow.ellipsis,
        ),
        const SizedBox(height: 10),
        // Action Buttons Row
        Row(
          children: [
            ElevatedButton(
              onPressed: widget.onShopNow,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFF97316),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                elevation: 0,
                minimumSize: const Size(0, 36),
              ),
              child: const Text(
                'KHÁM PHÁ NGAY →',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 9),
              ),
            ),
            const SizedBox(width: 8),
            OutlinedButton(
              onPressed: () {
                // Navigate to flash sale screen if exists, for now fallback to ShopNow or push directly
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Tính năng đang phát triển')));
              },
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.white,
                side: const BorderSide(color: Color(0xFFF97316), width: 0.5),
                backgroundColor: Colors.black45,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                minimumSize: const Size(0, 36),
              ),
              child: const Text(
                'XEM ƯU ĐÃI HOT 🎁',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 9),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildEmptyBanner() {
    return SizedBox(
      height: 330,
      width: double.infinity,
      child: Stack(
        children: [
          Positioned.fill(
            child: ClipRRect(
              borderRadius: BorderRadius.zero,
              child: Container(color: Colors.grey.shade900),
            ),
          ),
          Positioned(
            left: 20,
            right: 20,
            top: 40,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.start,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'CHẠM ĐẾN TƯƠNG LAI\nTHIẾT BỊ ĐỈNH CAO',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, height: 1.15, color: Colors.white),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Ưu đãi và sản phẩm mới nhất đang chờ bạn khám phá.',
                  style: TextStyle(fontSize: 12, color: Colors.white70, height: 1.4),
                ),
                const SizedBox(height: 14),
                ElevatedButton(
                  onPressed: widget.onShopNow,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFF97316),
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                  ),
                  child: const Text(
                    'KHÁM PHÁ NGAY',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
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

class HeroBannerMarquee extends StatefulWidget {
  const HeroBannerMarquee({super.key});

  @override
  State<HeroBannerMarquee> createState() => _HeroBannerMarqueeState();
}

class _HeroBannerMarqueeState extends State<HeroBannerMarquee> with SingleTickerProviderStateMixin {
  final ScrollController _scrollController = ScrollController();
  late Ticker _ticker;
  
  final List<Map<String, dynamic>> _features = [
    {
      'icon': Icons.verified_user,
      'text': "Đảm bảo thiết bị chính hãng, nguyên seal, đầy đủ chứng từ."
    },
    {
      'icon': Icons.local_shipping,
      'text': "Hỗ trợ giao hàng nhanh chóng và an toàn tận tay bạn."
    },
    {
      'icon': Icons.headset_mic,
      'text': "Chuyên viên luôn sẵn sàng tư vấn và giải đáp mọi thắc mắc."
    },
    {
      'icon': Icons.build,
      'text': "Xử lý bảo hành chuyên nghiệp, đúng tiêu chuẩn nhà sản xuất."
    },
    {
      'icon': Icons.autorenew,
      'text': "Thủ tục linh hoạt, hỗ trợ 1 đổi 1 khi phát sinh lỗi. Đổi trả dễ dàng"
    }
  ];

  @override
  void initState() {
    super.initState();
    _ticker = createTicker((elapsed) {
      if (_scrollController.hasClients) {
        // Tốc độ: 1.0 pixel mỗi frame (~60 pixel / giây ở 60fps)
        _scrollController.jumpTo(_scrollController.position.pixels + 1.0);
      }
    });
    _ticker.start();
  }

  @override
  void dispose() {
    _ticker.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 50,
      width: double.infinity,
      color: Colors.transparent, // Background of marquee
      child: ListView.builder(
        controller: _scrollController,
        scrollDirection: Axis.horizontal,
        physics: const NeverScrollableScrollPhysics(), // Only auto scroll
        // Providing a very large number simulates infinite scrolling easily
        itemCount: 10000, 
        itemBuilder: (context, index) {
          final feature = _features[index % _features.length];
          return Container(
            width: 240, // Limit width so text wraps
            margin: const EdgeInsets.symmetric(horizontal: 10),
            alignment: Alignment.centerLeft,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Icon(feature['icon'], color: const Color(0xFFF97316), size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    feature['text'],
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      height: 1.3,
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

