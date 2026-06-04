import 'package:flutter/material.dart';
import '../products/products_screen.dart';
import '../../services/products_service.dart';
import '../../utils/network_utils.dart';
import '../products/product_detail_screen.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _focusNode = FocusNode();
  
  List<dynamic> _searchResults = [];
  bool _isLoading = false;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    // Auto focus search field
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _focusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _performSearch(String query) async {
    setState(() {
      _searchQuery = query;
    });
    
    if (query.trim().isEmpty) {
      setState(() {
        _searchResults = [];
        _isLoading = false;
      });
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final res = await ProductsService.fetchProducts(
        search: query,
        limit: 20,
      );
      if (mounted) {
        setState(() {
          _searchResults = res['data'] ?? [];
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }
  
  String _formatPrice(double price) {
    return price.toStringAsFixed(0).replaceAllMapped(
        RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]}.');
  }
  
  String _resolveProductImageUrl(Map<String, dynamic> product) {
    final rawMainImage = product['main_image_url']?.toString().trim();
    if (rawMainImage != null && rawMainImage.isNotEmpty) {
      return NetworkUtils.fixDeviceUrl(rawMainImage);
    }
    final images = product['images'] as List<dynamic>?;
    if (images != null && images.isNotEmpty) {
      for (var image in images) {
        final url = image['url']?.toString().trim() ?? image['image_url']?.toString().trim();
        if (url != null && url.isNotEmpty) {
          return NetworkUtils.fixDeviceUrl(url);
        }
      }
    }
    return '';
  }

  double _getDisplayPrice(Map<String, dynamic> product) {
    final variants = product['variants'] as List<dynamic>?;
    if (variants != null && variants.isNotEmpty) {
      final sortedVariants = List.from(variants);
      sortedVariants.sort((a, b) {
        final aPrice = double.tryParse(a['effective_price']?.toString() ?? '0') ?? 0;
        final bPrice = double.tryParse(b['effective_price']?.toString() ?? '0') ?? 0;
        return aPrice.compareTo(bPrice);
      });
      return double.tryParse(sortedVariants.first['effective_price']?.toString() ?? '0') ?? 0;
    }
    return double.tryParse(product['effective_price']?.toString() ?? '0') ?? 0;
  }

  void _navigateToProduct(Map<String, dynamic> product) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ProductDetailScreen(
          slug: product['slug'] ?? '',
          variantId: null,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 1,
        titleSpacing: 0,
        leading: const Icon(Icons.search, color: Colors.grey),
        title: TextField(
          controller: _searchController,
          focusNode: _focusNode,
          decoration: InputDecoration(
            hintText: 'Bạn muốn tìm gì?',
            hintStyle: const TextStyle(color: Colors.grey, fontSize: 16),
            border: InputBorder.none,
            suffixIcon: _searchController.text.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.clear, color: Colors.grey),
                    onPressed: () {
                      _searchController.clear();
                      _performSearch('');
                    },
                  )
                : null,
          ),
          textInputAction: TextInputAction.search,
          onSubmitted: _performSearch,
          onChanged: (val) {
            setState(() {}); // to update clear button
          },
        ),
      ),
      body: _buildBody(),
    );
  }
  
  Widget _buildBody() {
    if (_searchQuery.trim().isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.search, size: 80, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text(
              'Nhập tên sản phẩm để tìm kiếm',
              style: TextStyle(color: Colors.grey.shade500, fontSize: 16),
            ),
          ],
        ),
      );
    }
    
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: Color(0xFFF26522)),
      );
    }
    
    if (_searchResults.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.sentiment_dissatisfied, size: 80, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text(
              'Không tìm thấy kết quả nào cho "$_searchQuery"',
              style: TextStyle(color: Colors.grey.shade600, fontSize: 16),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }
    
    return ListView.separated(
      itemCount: _searchResults.length,
      padding: const EdgeInsets.all(16),
      separatorBuilder: (context, index) => const Divider(height: 32),
      itemBuilder: (context, index) {
        final product = _searchResults[index];
        final displayPrice = _getDisplayPrice(product);
        final imageUrl = _resolveProductImageUrl(product);
        
        return InkWell(
          onTap: () => _navigateToProduct(product),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: imageUrl.isEmpty
                      ? Icon(Icons.image, color: Colors.grey.shade300)
                      : Image.network(imageUrl, fit: BoxFit.contain),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product['name'] ?? '',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${_formatPrice(displayPrice)} đ',
                      style: const TextStyle(color: Color(0xFFF26522), fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
