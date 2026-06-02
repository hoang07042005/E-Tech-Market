import 'package:flutter/material.dart';
import '../../services/blog_service.dart';
import '../../utils/network_utils.dart';
import 'blog_detail_screen.dart';

class BlogScreen extends StatefulWidget {
  const BlogScreen({Key? key}) : super(key: key);

  @override
  State<BlogScreen> createState() => _BlogScreenState();
}

class _BlogScreenState extends State<BlogScreen> {
  List<dynamic> _allPosts = [];
  bool _isLoading = true;
  String? _error;
  String _activeFilter = 'all';

  @override
  void initState() {
    super.initState();
    _loadBlogPosts();
  }

  Future<void> _loadBlogPosts() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await BlogService.fetchBlogPosts(perPage: 100);
      // Extract data from response - API returns Map with 'data' field containing posts
      List<dynamic> posts = [];
      if (response['data'] is List) {
        posts = response['data'] as List<dynamic>;
      } else if (response is List) {
        posts = response as List<dynamic>;
      }
      setState(() {
        _allPosts = posts;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load blog posts: $e';
        _isLoading = false;
      });
    }
  }

  List<dynamic> get _filteredPosts {
    if (_activeFilter == 'all') {
      return _allPosts.skip(1).toList();
    }
    return _allPosts
        .where((post) => post['category']?['slug'] == _activeFilter)
        .skip(1)
        .toList();
  }

  List<dynamic> get _trendingPosts {
    final sorted = [..._allPosts]..sort((a, b) {
      final aViews = (a['views'] as num?)?.toInt() ?? 0;
      final bViews = (b['views'] as num?)?.toInt() ?? 0;
      return bViews.compareTo(aViews);
    });
    return sorted.take(3).toList();
  }

  List<Map<String, dynamic>> get _categories {
    final categoriesMap = <String, Map<String, dynamic>>{};
    for (final post in _allPosts) {
      final category = post['category'];
      if (category != null) {
        final slug = category['slug'] as String;
        if (!categoriesMap.containsKey(slug)) {
          categoriesMap[slug] = {
            'id': category['id'],
            'name': category['name'],
            'slug': slug,
            'count': 0,
          };
        }
        categoriesMap[slug]!['count']++;
      }
    }
    return categoriesMap.values.toList();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Tin Tức')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CircularProgressIndicator(color: Color(0xFFEF7A45)),
              const SizedBox(height: 16),
              Text('Đang tải tin tức mới nhất...'),
            ],
          ),
        ),
      );
    }

    if (_error != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Tin Tức')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 64, color: Colors.grey),
              const SizedBox(height: 16),
              Text(_error!),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _loadBlogPosts,
                icon: const Icon(Icons.refresh),
                label: const Text('Thử lại'),
              ),
            ],
          ),
        ),
      );
    }

    final featuredPost = _allPosts.isNotEmpty ? _allPosts[0] : null;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tin Tức Công Nghệ'),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        foregroundColor: const Color(0xFF0F172A),
        elevation: 0,
      ),

      backgroundColor: Colors.white,
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Hero Section
            if (featuredPost != null && _activeFilter == 'all')
              _buildHeroSection(featuredPost),

            // Filters
            _buildFiltersSection(),

            // Main Content
            Padding(
              padding: const EdgeInsets.symmetric( vertical: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Section Title
                  Text(
                    'Tin tức mới nhất',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF0F172A),
                        ),
                  ),
                  const SizedBox(height: 20),

                  // Blog Posts Grid
                  if (_filteredPosts.isEmpty)
                    Center(
                      child: Padding(
                        padding: const EdgeInsets.all(32),
                        child: Column(
                          children: [
                            const Icon(Icons.article_outlined,
                                size: 64, color: Colors.grey),
                            const SizedBox(height: 16),
                            Text('Không có bài viết nào',
                                style: Theme.of(context)
                                    .textTheme
                                    .bodyLarge
                                    ?.copyWith(color: Colors.grey)),
                          ],
                        ),
                      ),
                    )
                  else
                    ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _filteredPosts.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, index) =>
                          _buildBlogCard(_filteredPosts[index]),
                    ),
                ],
              ),
            ),

            // Sidebar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
              child: Column(
                children: [
                  // Trending Posts
                  if (_trendingPosts.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    _buildTrendingSection(),
                  ],

                  // Categories
                  if (_categories.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    _buildCategoriesSection(),
                  ],
                ],
              ),
            ),

            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildHeroSection(dynamic post) {
    final imageUrl = NetworkUtils.fixDeviceUrl(post['thumbnail_url'] ?? '');
    final categoryName = post['category']?['name'] ?? 'Tin tức';
    final title = post['title'] ?? '';
    final excerpt = post['excerpt'] ?? '';
    final createdAt = post['published_at'] ?? '';
    final readingTime = post['reading_time'] ?? 5;

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => BlogDetailScreen(post: post),
          ),
        );
      },
      child: Container(
        margin: const EdgeInsets.symmetric( vertical: 16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
        ),
        clipBehavior: Clip.hardEdge,
        child: Stack(
          children: [
            // Image
            Image.network(
              imageUrl,
              width: double.infinity,
              height: 280,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                height: 280,
                color: Colors.grey[300],
                child: const Icon(Icons.image_not_supported),
              ),
            ),

            // Gradient overlay
            Container(
              height: 280,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    Colors.black.withValues(alpha: 0.7),
                  ],
                ),
              ),
            ),

            // Content
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Padding(
                padding: const EdgeInsets.all(16),
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
                        color: const Color(0xFFEF7A45),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        categoryName,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Title
                    Text(
                      title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Excerpt
                    Text(
                      excerpt,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Color(0xFFE2E8F0),
                        fontSize: 13,
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Meta
                    Row(
                      children: [
                        Text(
                          '📅 ${_formatDate(createdAt)}',
                          style: const TextStyle(
                            color: Color(0xFFCAD5E2),
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Text(
                          '⏱️ $readingTime phút đọc',
                          style: const TextStyle(
                            color: Color(0xFFCAD5E2),
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFiltersSection() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
      child: Row(
        children: [
          _buildFilterButton('all', 'Tất cả'),
          const SizedBox(width: 12),
          ..._categories.map((cat) {
            return Padding(
              padding: const EdgeInsets.only(right: 12),
              child: _buildFilterButton(cat['slug'], cat['name']),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildFilterButton(String slug, String label) {
    final isActive = _activeFilter == slug;
    return GestureDetector(
      onTap: () {
        setState(() => _activeFilter = slug);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? const Color(0xFFEF7A45) : Colors.white,
          border: Border.all(
            color: isActive ? const Color(0xFFEF7A45) : const Color(0xFFE2E8F0),
          ),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: isActive ? Colors.white : const Color(0xFF0F172A),
          ),
        ),
      ),
    );
  }

  Widget _buildBlogCard(dynamic post) {
    final imageUrl = NetworkUtils.fixDeviceUrl(post['thumbnail_url'] ?? '');
    final title = post['title'] ?? '';
    final excerpt = post['excerpt'] ?? '';
    final slug = post['slug'] ?? '';
    final categoryName = post['category']?['name'] ?? '';
    final createdAt = post['published_at'] ?? '';

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => BlogDetailScreen(post: post),
          ),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
        ),
        clipBehavior: Clip.hardEdge,
        child: Row(
          children: [
            // Thumbnail
            ClipRRect(
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(8),
                bottomLeft: Radius.circular(8),
              ),
              child: Image.network(
                imageUrl,
                width: 120,
                height: 120,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  width: 120,
                  height: 120,
                  color: Colors.grey[300],
                  child: const Icon(Icons.image_not_supported),
                ),
              ),
            ),

            // Content
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Category & Date
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        if (categoryName.isNotEmpty)
                          Container(
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
                                color: Color(0xFFEF7A45),
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        Text(
                          _formatDate(createdAt),
                          style: const TextStyle(
                            color: Color(0xFF94A3B8),
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),

                    // Title
                    Text(
                      title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF0F172A),
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 4),

                    // Excerpt
                    Text(
                      excerpt,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF64748B),
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Read more link
                    Text(
                      'Đọc tiếp →',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFFEF7A45),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTrendingSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Đọc nhiều nhất',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: const Color(0xFF0F172A),
              ),
        ),
        const SizedBox(height: 12),
        ..._trendingPosts.asMap().entries.map((entry) {
          final post = entry.value;
          final views = (post['views'] as num?)?.toInt() ?? 0;
          final imageUrl = NetworkUtils.fixDeviceUrl(post['thumbnail_url'] ?? '');
          final title = post['title'] ?? '';

          return GestureDetector(
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => BlogDetailScreen(post: post),
                ),
              );
            },
            child: Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: Image.network(
                      imageUrl,
                      width: 64,
                      height: 64,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        width: 64,
                        height: 64,
                        color: Colors.grey[300],
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF0F172A),
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '$views lượt xem',
                          style: const TextStyle(
                            fontSize: 11,
                            color: Color(0xFF94A3B8),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildCategoriesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Chuyên mục',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: const Color(0xFF0F172A),
              ),
        ),
        const SizedBox(height: 12),
        ..._categories.map((cat) {
          return GestureDetector(
            onTap: () {
              setState(() => _activeFilter = cat['slug']);
              // Scroll to top if needed
            },
            child: Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    cat['name'],
                    style: const TextStyle(
                      fontSize: 13,
                      color: Color(0xFF0F172A),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEF7A45).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      '${cat['count']}',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFFEF7A45),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
      ],
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
