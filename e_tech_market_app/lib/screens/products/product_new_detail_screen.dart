import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart'; 
import 'package:e_tech_market_app/services/products_service.dart';

class ProductNews {
  final int id;
  final String title;
  final String? thumbnailUrl;
  final String? contentHtml;
  final String? createdAt;

  ProductNews({
    required this.id,
    required this.title,
    this.thumbnailUrl,
    this.contentHtml,
    this.createdAt,
  });

  factory ProductNews.fromJson(Map<String, dynamic> json) {
    return ProductNews(
      id: json['id'] ?? 0,
      title: json['title'] ?? '',
      thumbnailUrl: json['thumbnail_url'] ?? json['thumbnail_path'],
      contentHtml: json['content_html'] ?? json['content'] ?? '',
      createdAt: json['created_at'],
    );
  }
}

class ProductNewDetailScreen extends StatefulWidget {
  final String slug; // Nhận slug truyền sang từ danh sách tin tức hoặc trang chi tiết sản phẩm

  const ProductNewDetailScreen({Key? key, required this.slug}) : super(key: key);

  @override
  State<ProductNewDetailScreen> createState() => _ProductNewDetailScreenState();
}

class _ProductNewDetailScreenState extends State<ProductNewDetailScreen> {
  ProductNews? _news;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchNewsDetail();
  }

  // Hàm xử lý kết nối dữ liệu thực tế từ API thông qua ProductsService
  Future<void> _fetchNewsDetail() async {
    try {
      if (!mounted) return;
      setState(() {
        _isLoading = true;
        _error = null;
      });

      // Gọi hàm fetch dữ liệu thực từ service được đồng bộ hóa với hệ thống quản lý backend
      final Map<String, dynamic> responseData = await ProductsService.fetchProductNewsBySlug(widget.slug);
      
      if (mounted) {
        setState(() {
          _news = ProductNews.fromJson(responseData);
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          // Định dạng lại thông báo lỗi thân thiện để hiển thị lên màn hình ứng dụng
          _error = e.toString().replaceAll('Exception: ', '');
          _isLoading = false;
        });
      }
    }
  }

    String _resolveImageUrl(String? url) {
        if (url == null || url.isEmpty) return '';
        if (url.startsWith('http')) return url;

        // Đường dẫn gốc của API server
        const String baseUrl = 'http://192.168.24.14:8000'; 
        
        // Đảm bảo url không có dấu gạch chéo dư thừa ở đầu
        final cleanUrl = url.startsWith('/') ? url.substring(1) : url;

        // Nếu url bắt đầu bằng 'uploads', ghép trực tiếp vào baseUrl gốc (bỏ /api)
        if (cleanUrl.startsWith('uploads')) {
        return '$baseUrl/$cleanUrl';
        }

        // Nếu không phải ảnh (có thể là các endpoint API khác), mới ghép với /api
        return '$baseUrl/api/$cleanUrl';
    }

  @override
  Widget build(BuildContext context) {
    // 1. GIAO DIỆN CHỜ TẢI DỮ LIỆU THỰC TẾ
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: Colors.white,
        body: Center(
          child: CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFF26522)),
          ),
        ),
      );
    }

    // 2. GIAO DIỆN BÁO LỖI HOẶC KHÔNG TÌM THẤY BÀI VIẾT TRÊN SERVER
    if (_error != null || _news == null) {
      return Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          elevation: 0, 
          backgroundColor: Colors.white, 
          iconTheme: const IconThemeData(color: Colors.black),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.article_outlined, color: Color(0xFF94A3B8), size: 64),
                const SizedBox(height: 16),
                Text(
                  _error ?? 'Không tìm thấy nội dung tin tức sản phẩm này.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Color(0xFF4B5563), fontSize: 14.5, height: 1.4),
                ),
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFF26522),
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('Quay lại', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                )
              ],
            ),
          ),
        ),
      );
    }

    final newsItem = _news!;

    // 3. GIAO DIỆN CHI TIẾT TIN TỨC ĐỌC DỮ LIỆU THỰC
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text(
          'TIN TỨC SẢN PHẨM',
          style: TextStyle(color: Color(0xFF111827), fontSize: 15, fontWeight: FontWeight.bold, letterSpacing: 0.5),
        ),
        centerTitle: true,
        backgroundColor: Colors.white,
        elevation: 0.5,
        iconTheme: const IconThemeData(color: Color(0xFF111827)),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(18.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // TIÊU ĐỀ TIN TỨC THỰC TẾ
              Text(
                newsItem.title,
                style: const TextStyle(
                  fontSize: 22, 
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF111827),
                  height: 1.3,
                ),
              ),
              const SizedBox(height: 14),
              
              // ẢNH ĐẠI DIỆN TIN TỨC TRÊN SERVER (Nếu có)
              if (newsItem.thumbnailUrl != null && newsItem.thumbnailUrl!.isNotEmpty) ...[
                ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: Image.network(
                    _resolveImageUrl(newsItem.thumbnailUrl),
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                  ),
                ),
                const SizedBox(height: 18),
              ],

              const Divider(color: Color(0xFFE5E7EB), height: 1),
              const SizedBox(height: 14),

              // KHỐI HIỂN THỊ NỘI DUNG HTML CHI TIẾT
              SizedBox(
                width: MediaQuery.of(context).size.width - 36, // Khống chế độ rộng tuyệt đối chống lỗi tràn màn hình
                child: Html(
                  data: newsItem.contentHtml ?? '',
                  style: {
                    "body": Style(
                      margin: Margins.zero,
                      padding: HtmlPaddings.zero,
                      fontSize: FontSize(14.5),
                      lineHeight: const LineHeight(1.6),
                      color: const Color(0xFF374151),
                    ),
                    "p": Style(
                      margin: Margins.only(bottom: 12),
                    ),
                    "strong": Style(
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF111827),
                    ),
                    "img": Style(
                      width: Width(100, Unit.percent), // Ép ảnh co dãn 100% vùng chứa nội tuyến của thiết bị di động
                      height: Height.auto(),
                      margin: Margins.only(top: 8, bottom: 8),
                    ),
                    "ul": Style(
                      margin: Margins.only(bottom: 12),
                      padding: HtmlPaddings.only(left: 20),
                    ),
                    "li": Style(
                      margin: Margins.only(bottom: 4),
                    ),
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}