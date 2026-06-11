import 'package:flutter/material.dart';
import '../../services/video_service.dart';
import '../../utils/network_utils.dart';
import '../../utils/translation.dart';
import 'video_detail_screen.dart';

class VideoScreen extends StatefulWidget {
  const VideoScreen({super.key});

  @override
  State<VideoScreen> createState() => _VideoScreenState();
}

class _VideoScreenState extends State<VideoScreen> {
  List<dynamic> _videos = [];
  bool _isLoading = true;
  String? _error;
  String _filter = 'all'; // 'all', 'product', 'general', or 'cat-{id}'

  @override
  void initState() {
    super.initState();
    _fetchVideos();
  }

  Future<void> _fetchVideos() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final videos = await VideoService.fetchVideos(limit: 100);
      if (mounted) {
        setState(() {
          _videos = videos;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = Trans.errorLoadingList('video', e.toString());
          _isLoading = false;
        });
      }
    }
  }

  // Get unique categories from the videos
  List<Map<String, dynamic>> get _categories {
    final Map<int, Map<String, dynamic>> map = {};
    for (final v in _videos) {
      final catObj = v['video_category'] ?? v['category'];
      if (catObj != null) {
        final id = catObj['id'] as int;
        if (!map.containsKey(id)) {
          map[id] = catObj as Map<String, dynamic>;
        }
      }
    }
    return map.values.toList();
  }

  bool get _hasGeneralVideos {
    return _videos.any((v) => v['product_id'] == null && (v['video_category_id'] == null && v['category_id'] == null));
  }

  List<dynamic> get _filteredVideos {
    if (_filter == 'all') return _videos;
    if (_filter == 'product') return _videos.where((v) => v['product_id'] != null).toList();
    if (_filter == 'general') return _videos.where((v) => v['product_id'] == null && (v['video_category_id'] == null && v['category_id'] == null)).toList();
    if (_filter.startsWith('cat-')) {
      final catId = int.tryParse(_filter.replaceFirst('cat-', ''));
      return _videos.where((v) {
        final currentCatId = v['video_category_id'] ?? v['category_id'];
        return currentCatId == catId;
      }).toList();
    }
    return _videos;
  }

  String _resolveImageUrl(Map<String, dynamic> video) {
    String? thumb = video['thumbnail_url']?.toString();
    if (thumb == null || thumb.isEmpty) {
      final product = video['product'] as Map<String, dynamic>?;
      thumb = product?['main_image_url']?.toString();
    }
    if (thumb != null && thumb.isNotEmpty) {
      return NetworkUtils.fixDeviceUrl(thumb);
    }
    return '';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        title: Text(Trans.videoTitle, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        backgroundColor: Theme.of(context).colorScheme.surface,
        foregroundColor: Theme.of(context).colorScheme.onSurface,
        elevation: 1,
      ),
      body: Column(
        children: [
          // Header area
          Container(
            color: Theme.of(context).colorScheme.surface,
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  Trans.videoExplore,
                  style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontSize: 13, height: 1.4),
                ),
                const SizedBox(height: 16),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildChip('all', Trans.videoAll),
                      _buildChip('product', Trans.videoWithProduct),
                      ..._categories.map((cat) => _buildChip('cat-${cat['id']}', cat['name'].toString())),
                      if (_hasGeneralVideos) _buildChip('general', 'Video chung'),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  Trans.showingVideosCount(_filteredVideos.length),
                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
          
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFFEF7A45)))
                : _error != null
                    ? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
                    : _filteredVideos.isEmpty
                        ? Center(child: Text(Trans.noVideosFound, style: const TextStyle(color: Color(0xFF64748B))))
                        : GridView.builder(
                            padding: const EdgeInsets.all(16),
                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              crossAxisSpacing: 16,
                              mainAxisSpacing: 16,
                              childAspectRatio: 0.65, // Adjust for mobile portrait cards
                            ),
                            itemCount: _filteredVideos.length,
                            itemBuilder: (context, index) {
                              final video = _filteredVideos[index];
                              return _buildVideoCard(video);
                            },
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildChip(String value, String label) {
    final isSelected = _filter == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8.0),
      child: ChoiceChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (selected) {
          if (selected) setState(() => _filter = value);
        },
        selectedColor: const Color(0xFFEF7A45),
        labelStyle: TextStyle(
          color: isSelected ? Colors.white : const Color(0xFF64748B),
          fontWeight: FontWeight.bold,
        ),
        backgroundColor: const Color(0xFFF1F5F9),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: isSelected ? const Color(0xFFEF7A45) : Colors.transparent),
        ),
      ),
    );
  }

  Widget _buildVideoCard(Map<String, dynamic> video) {
    final title = video['title']?.toString() ?? Trans.videoIntro;
    final product = video['product'] as Map<String, dynamic>?;
    final catObj = video['video_category'] ?? video['category'];
    String? desc = video['description']?.toString();
    if (desc == null || desc.isEmpty) {
      desc = product?['short_description']?.toString() ?? '';
    }
    
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => VideoDetailScreen(videoId: video['id'])),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(5),
           border: Border.all(color: Theme.of(context).colorScheme.onSurface, width: 0.5),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Thumbnail
            Expanded(
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(5)),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    Container(color: const Color(0xFFF1F5F9)),
                    Image.network(
                      _resolveImageUrl(video),
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const Center(child: Icon(Icons.videocam, color: Color(0xFFCBD5E1), size: 40)),
                    ),
                    Container(
                      color: Colors.black26,
                      child: Center(
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.surface,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.play_arrow, color: Colors.orange),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            // Info
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, height: 1.2),
                  ),
                  if (desc!.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      desc,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontSize: 11, height: 1.3),
                    ),
                  ],
                  const SizedBox(height: 8),
                  if (product != null)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0F9FF),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.link, size: 12, color: Color(0xFF0284C7)),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              product['name']?.toString() ?? '',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 10, color: Color(0xFF0284C7), fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                    )
                  else if (catObj != null)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.surface,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.folder_open, size: 12, color: Color(0xFF4B5563)),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              catObj['name']?.toString() ?? '',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontSize: 10, color: Theme.of(context).colorScheme.onSurface, fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
