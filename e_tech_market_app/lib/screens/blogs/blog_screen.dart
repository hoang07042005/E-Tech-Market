import 'package:flutter/material.dart';
import '../../config/dio_client.dart';
import '../../services/blog_service.dart';
import '../../utils/network_utils.dart';
import '../../utils/translation.dart';
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
      List<dynamic> blogPosts = [];
      if (response['data'] is List) {
        blogPosts = response['data'] as List<dynamic>;
      } else if (response is List) {
        blogPosts = response as List<dynamic>;
      }

      // Fetch product news
      List<dynamic> productNews = [];
      try {
        final newsResponse = await DioClient.instance.get('/product-news');
        final newsData = newsResponse.data['data'] as List<dynamic>? ?? [];
        productNews = newsData.map((news) {
          final id = news['id'] ?? 1;
          String contentHtml = news['content_html'] ?? '';
          String excerpt = contentHtml.replaceAll(RegExp(r'<[^>]*>'), '');
          if (excerpt.length > 120) {
            excerpt = excerpt.substring(0, 120) + '...';
          }
          if (excerpt.isEmpty) excerpt = 'Thông tin mới về sản phẩm';

          return {
            'id': int.tryParse('999$id') ?? id,
            'title': news['title'],
            'slug': news['slug'],
            'excerpt': excerpt,
            'thumbnail_url': news['thumbnail_url'] ?? news['thumbnail_path'],
            'published_at': news['published_at'] ?? news['created_at'],
            'reading_time': 3,
            'views': (id * 83) % 400 + 150,
            'category': {
              'id': 9999,
              'name': 'Tin Sản Phẩm',
              'slug': 'tin-san-pham',
            },
            'author': null,
            'isProductNews': true,
          };
        }).toList();
      } catch (e) {
        // Ignore product news fetch error
      }

      final allPosts = [...blogPosts, ...productNews];
      allPosts.sort((a, b) {
        final dateA = DateTime.tryParse(a['published_at']?.toString() ?? '') ??
            DateTime.now();
        final dateB = DateTime.tryParse(b['published_at']?.toString() ?? '') ??
            DateTime.now();
        return dateB.compareTo(dateA); // Newest first
      });

      setState(() {
        _allPosts = allPosts;
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
        body: Stack(
          children: [
            Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(color: const Color(0xFFF26522)),
                  const SizedBox(height: 16),
                  Text(Trans.loadingNews),
                ],
              ),
            ),
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(8.0),
                child: CircleAvatar(
                  backgroundColor: Colors.black.withOpacity(0.4),
                  child: IconButton(
                    icon: const Icon(Icons.arrow_back, color: Colors.white),
                    onPressed: () => Navigator.pop(context),
                  ),
                ),
              ),
            ),
          ],
        ),
      );
    }

    if (_error != null) {
      return Scaffold(
        body: Stack(
          children: [
            Center(
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
                    label: Text(Trans.retryButton),
                  ),
                ],
              ),
            ),
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(8.0),
                child: CircleAvatar(
                  backgroundColor: Colors.black.withOpacity(0.4),
                  child: IconButton(
                    icon: const Icon(Icons.arrow_back, color: Colors.white),
                    onPressed: () => Navigator.pop(context),
                  ),
                ),
              ),
            ),
          ],
        ),
      );
    }

    final featuredPost = _allPosts.isNotEmpty ? _allPosts[0] : null;

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
              child: Row(
                children: [
                  CircleAvatar(
                    backgroundColor: Colors.black.withOpacity(0.1),
                    child: IconButton(
                      icon: Icon(Icons.arrow_back,
                          color: Theme.of(context).colorScheme.onSurface),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Text(
                    Trans.newsTitleFull,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Hero Section
                    if (featuredPost != null && _activeFilter == 'all')
                      _buildHeroSection(featuredPost),

                    // Filters
                    _buildFiltersSection(),

                    // Main Content
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Section Title
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
                                    Text(Trans.noArticles,
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
                              separatorBuilder: (_, __) =>
                                  const SizedBox(height: 12),
                              itemBuilder: (context, index) =>
                                  _buildBlogCard(_filteredPosts[index]),
                            ),
                        ],
                      ),
                    ),

                    // Sidebar
                    Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 12),
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
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeroSection(dynamic post) {
    final imageUrl = NetworkUtils.fixDeviceUrl(post['thumbnail_url'] ?? '');
    final categoryName = post['category']?['name'] ?? Trans.newsCategory;
    final title = post['title'] ?? '';
    final excerpt = post['excerpt'] ?? '';
    final createdAt = post['published_at'] ?? '';
    final readingTime = post['reading_time'] ?? 5;
    final catColor = _getCategoryColor(categoryName);

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
        margin: const EdgeInsets.symmetric(vertical: 16),
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
                        color: catColor,
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
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
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
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.outline,
                        fontSize: 12,
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Meta
                    Row(
                      children: [
                        Text(
                          '📅 ${_formatDate(createdAt)}',
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.outlineVariant,
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Text(
                          Trans.readingTime(readingTime),
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.outlineVariant,
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
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: Colors.grey.shade300,
            width: 0.5,
          ),
        ),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            _buildFilterButton('all', Trans.all),
            ..._categories.map((cat) {
              return _buildFilterButton(cat['slug'], cat['name']);
            }),
          ],
        ),
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
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: isActive ? const Color(0xFFF26522) : Colors.transparent,
              width: 2.0,
            ),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 15,
            fontWeight: isActive ? FontWeight.bold : FontWeight.w500,
            color: isActive ? const Color(0xFFF26522) : const Color(0xFF555555),
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
    final catColor = _getCategoryColor(categoryName);

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
                              color: catColor.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              categoryName,
                              style: TextStyle(
                                color: catColor,
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        Text(
                          _formatDate(createdAt),
                          style: TextStyle(
                            color:
                                Theme.of(context).colorScheme.onSurfaceVariant,
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
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Theme.of(context).colorScheme.onSurface,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 4),

                    // Excerpt
                    Text(
                      excerpt,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Read more link
                    Text(
                      Trans.readMore,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Colors.orange,
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
          Trans.readMost,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: Theme.of(context).colorScheme.onSurface,
              ),
        ),
        const SizedBox(height: 12),
        ..._trendingPosts.asMap().entries.map((entry) {
          final post = entry.value;
          final views = (post['views'] as num?)?.toInt() ?? 0;
          final imageUrl =
              NetworkUtils.fixDeviceUrl(post['thumbnail_url'] ?? '');
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
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Theme.of(context).colorScheme.onSurface,
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          Trans.views(views),
                          style: TextStyle(
                            fontSize: 11,
                            color:
                                Theme.of(context).colorScheme.onSurfaceVariant,
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
          Trans.categoryLabel,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: Theme.of(context).colorScheme.onSurface,
              ),
        ),
        const SizedBox(height: 12),
        ..._categories.map((cat) {
          final catColor = _getCategoryColor(cat['name'] ?? '');
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
                    style: TextStyle(
                      fontSize: 13,
                      color: Theme.of(context).colorScheme.onSurface,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: catColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      '${cat['count']}',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: catColor,
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

  Color _getCategoryColor(String categoryName) {
    if (categoryName.isEmpty) return Colors.grey;

    // Explicit mappings for common categories to ensure distinct colors
    final lowerName = categoryName.toLowerCase();
    if (lowerName.contains('đánh giá')) return const Color(0xFFE91E63); // Pink
    if (lowerName.contains('công nghệ')) return const Color(0xFF2196F3); // Blue
    if (lowerName.contains('tư vấn')) return const Color(0xFF4CAF50); // Green
    if (lowerName.contains('tin tức')) return const Color(0xFFFF9800); // Orange
    if (lowerName.contains('khuyến mãi')) return const Color(0xFFF44336); // Red

    final colors = [
      const Color(0xFF9C27B0), // Purple
      const Color(0xFF3F51B5), // Indigo
      const Color(0xFF00BCD4), // Cyan
      const Color(0xFF009688), // Teal
      const Color(0xFFFF5722), // Deep Orange
      const Color(0xFF795548), // Brown
      const Color(0xFF607D8B), // Blue Grey
    ];

    // Improved hash to reduce collisions
    int hash = 0;
    for (int i = 0; i < categoryName.length; i++) {
      hash = (hash * 31 + categoryName.codeUnitAt(i)) & 0x7FFFFFFF;
    }
    return colors[hash % colors.length];
  }
}
