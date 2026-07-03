import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';
import '../../utils/network_utils.dart';
import '../../utils/translation.dart';
import '../../utils/app_snackbar.dart';
import '../../services/blog_service.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Widget tải ảnh với HttpClient tự-bypass SSL (self-signed cert), fallback về
// Image.network nếu thất bại.
// ─────────────────────────────────────────────────────────────────────────────
class _TrustAllImage extends StatefulWidget {
  final String url;
  final double? width;
  final double? height;
  final BoxFit fit;

  const _TrustAllImage({
    required this.url,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
  });

  @override
  State<_TrustAllImage> createState() => _TrustAllImageState();
}

class _TrustAllImageState extends State<_TrustAllImage> {
  Uint8List? _bytes;
  bool _failed = false;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (widget.url.isEmpty) {
      if (mounted) setState(() { _failed = true; _loading = false; });
      return;
    }
    try {
      final uri = Uri.parse(widget.url);
      final client = HttpClient()
        ..badCertificateCallback = (_, __, ___) => true;
      final req = await client.getUrl(uri);
      req.headers.set('user-agent', 'Mozilla/5.0 (Flutter)');
      final res = await req.close();
      if (res.statusCode == 200) {
        final chunks = <int>[];
        await for (final chunk in res) {
          chunks.addAll(chunk);
        }
        if (mounted) setState(() { _bytes = Uint8List.fromList(chunks); _loading = false; });
      } else {
        if (mounted) setState(() { _failed = true; _loading = false; });
      }
      client.close(force: true);
    } catch (_) {
      if (mounted) setState(() { _failed = true; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return SizedBox(
        width: widget.width ?? double.infinity,
        height: widget.height ?? 200,
        child: const Center(
          child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFFF26522)),
        ),
      );
    }
    if (_failed || _bytes == null) {
      return Image.network(
        widget.url,
        width: widget.width ?? double.infinity,
        height: widget.height,
        fit: widget.fit,
        errorBuilder: (_, __, ___) => Container(
          width: widget.width ?? double.infinity,
          height: widget.height ?? 200,
          color: Colors.grey[200],
          child: const Icon(Icons.image_not_supported, size: 48, color: Colors.grey),
        ),
      );
    }
    return Image.memory(
      _bytes!,
      width: widget.width ?? double.infinity,
      height: widget.height,
      fit: widget.fit,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────
class BlogDetailScreen extends StatefulWidget {
  final dynamic post;

  const BlogDetailScreen({
    super.key,
    required this.post,
  });

  @override
  State<BlogDetailScreen> createState() => _BlogDetailScreenState();
}

class _BlogDetailScreenState extends State<BlogDetailScreen> {
  late dynamic post;
  List<dynamic> comments = [];
  bool isSubmitting = false;
  final TextEditingController _commentController = TextEditingController();

  @override
  void initState() {
    super.initState();
    post = widget.post;
    if (post['comments'] != null && post['comments'] is List) {
      comments = List.from(post['comments']);
    }
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _submitComment() async {
    final text = _commentController.text.trim();
    if (text.isEmpty) return;

    final slug = post['slug'];
    if (slug == null) return;

    setState(() { isSubmitting = true; });

    try {
      final newComment = await BlogService.addComment(slug, text);
      setState(() {
        comments.insert(0, newComment);
        _commentController.clear();
      });
      if (mounted) {
        AppSnackBar.showSuccess(context, 'Bình luận đã được gửi.');
      }
    } catch (e) {
      if (mounted) {
        AppSnackBar.showError(context, e.toString().replaceFirst('Exception: ', ''));
      }
    } finally {
      setState(() { isSubmitting = false; });
    }
  }

  // Resolve và fix URLs ảnh trong HTML content (cả single & double quote)
  String _fixImageUrls(String html) {
    if (html.trim().isEmpty) return html;
    return html.replaceAllMapped(
      RegExp(r'<img[^>]*>', caseSensitive: false),
      (tagMatch) {
        var tag = tagMatch.group(0)!;
        // double-quoted src
        tag = tag.replaceFirstMapped(
          RegExp(r'src="([^"]*)"', caseSensitive: false),
          (m) {
            final raw = m.group(1) ?? '';
            if (raw.trim().startsWith('data:') || raw.trim().isEmpty) return m.group(0)!;
            return 'src="${NetworkUtils.fixDeviceUrl(raw.trim())}"';
          },
        );
        // single-quoted src
        tag = tag.replaceFirstMapped(
          RegExp(r"src='([^']*)'", caseSensitive: false),
          (m) {
            final raw = m.group(1) ?? '';
            if (raw.trim().startsWith('data:') || raw.trim().isEmpty) return m.group(0)!;
            return 'src="${NetworkUtils.fixDeviceUrl(raw.trim())}"';
          },
        );
        return tag;
      },
    );
  }

  String _formatDate(String dateString) {
    try {
      final date = DateTime.parse(dateString);
      return '${date.day.toString().padLeft(2, '0')}/'
          '${date.month.toString().padLeft(2, '0')}/'
          '${date.year}';
    } catch (_) {
      return 'N/A';
    }
  }

  @override
  Widget build(BuildContext context) {
    final imageUrl = NetworkUtils.fixDeviceUrl(post['thumbnail_url'] ?? '');
    final title = post['title'] ?? '';
    final excerpt = post['excerpt'] ?? '';
    final content = post['content'] ?? post['content_html'] ?? '';
    final categoryName = post['category']?['name'] ?? 'News';
    final authorName = post['author']?['name'] ?? 'E-Tech Market';
    final createdAt = post['published_at'] ?? '';
    final readingTime = post['reading_time'] ?? 5;
    final views = (post['views'] as num?)?.toInt() ?? 0;

    final processedHtml = _fixImageUrls(content);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          Trans.articleDetail,
          style: TextStyle(color: Theme.of(context).colorScheme.onSurface),
        ),
        centerTitle: true,
        backgroundColor: Theme.of(context).colorScheme.surface,
        foregroundColor: Theme.of(context).colorScheme.onSurface,
        elevation: 1,
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // ── Thumbnail header
            if (imageUrl.isNotEmpty)
              _TrustAllImage(
                url: imageUrl,
                width: double.infinity,
                height: 280,
                fit: BoxFit.cover,
              )
            else
              Container(
                height: 280,
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                child: Icon(
                  Icons.image_not_supported,
                  size: 64,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),

            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Category badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(
                        color: Theme.of(context).colorScheme.primary,
                        width: 1,
                      ),
                    ),
                    child: Text(
                      categoryName,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onPrimaryContainer,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // ── Title
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                      color: Theme.of(context).colorScheme.onSurface,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 16),

                  // ── Author + date
                  Row(
                    children: [
                      Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Theme.of(context).colorScheme.primaryContainer,
                        ),
                        child: Center(
                          child: Text(
                            authorName.isNotEmpty ? authorName[0] : 'E',
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.onPrimaryContainer,
                              fontWeight: FontWeight.w700,
                              fontSize: 14,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            authorName,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Theme.of(context).colorScheme.onSurface,
                            ),
                          ),
                          Text(
                            _formatDate(createdAt),
                            style: TextStyle(
                              fontSize: 11,
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // ── Meta: reading time + views
                  Row(
                    children: [
                      _buildMetaItem(Trans.readingTimeLabel(readingTime), context),
                      const SizedBox(width: 16),
                      _buildMetaItem(Trans.viewsLabel(views), context),
                    ],
                  ),
                  const SizedBox(height: 24),

                  Container(height: 1, color: Theme.of(context).colorScheme.outline),
                  const SizedBox(height: 24),

                  // ── Excerpt
                  if (excerpt.isNotEmpty) ...[
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primaryContainer.withAlpha(13),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: Theme.of(context).colorScheme.primary.withAlpha(51),
                        ),
                      ),
                      child: Text(
                        excerpt,
                        style: TextStyle(
                          fontSize: 14,
                          fontStyle: FontStyle.italic,
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                          height: 1.6,
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],

                  // ── HTML content với custom image rendering (bypass SSL)
                  SizedBox(
                  width: double.infinity,
                  child: Html(
                    data: processedHtml,
                    style: {
                      'body': Style(
                        margin: Margins.zero,
                        padding: HtmlPaddings.zero,
                        fontSize: FontSize(15),
                        lineHeight: const LineHeight(1.8),
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                      'p': Style(margin: Margins.only(bottom: 12)),
                      'h1': Style(fontSize: FontSize(22), fontWeight: FontWeight.bold),
                      'h2': Style(fontSize: FontSize(19), fontWeight: FontWeight.bold),
                      'h3': Style(fontSize: FontSize(16), fontWeight: FontWeight.bold),
                      'img': Style(
                        width: Width(100, Unit.percent),
                        margin: Margins.only(top: 8, bottom: 8),
                      ),
                      'table': Style(
                        backgroundColor: Theme.of(context).colorScheme.surfaceContainerLow,
                        border: Border.all(color: Theme.of(context).colorScheme.outline),
                      ),
                      'th': Style(
                        padding: HtmlPaddings.all(6),
                        backgroundColor: Theme.of(context).colorScheme.surfaceContainerLow,
                      ),
                      'td': Style(
                        padding: HtmlPaddings.all(6),
                        border: Border.all(color: Theme.of(context).colorScheme.outline),
                      ),
                    },
                    extensions: [
                      // Override <img> rendering → dùng _TrustAllImage (bypass SSL cert)
                      TagExtension(
                        tagsToExtend: {'img'},
                        builder: (extensionContext) {
                          final src = extensionContext.attributes['src'] ?? '';
                          if (src.isEmpty) return const SizedBox.shrink();
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 6),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(6),
                              child: _TrustAllImage(
                                url: src,
                                width: double.infinity,
                                fit: BoxFit.contain,
                              ),
                            ),
                          );
                        },
                      ),
                    ],
                  ), // Html
                  ), // SizedBox

                  const SizedBox(height: 32),
                  const Divider(),
                  const SizedBox(height: 16),

                  // ── Comments
                  Text(
                    'Bình luận (${comments.length})',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  _buildCommentForm(),
                  const SizedBox(height: 24),
                  _buildCommentList(),
                  const SizedBox(height: 40),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCommentForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _commentController,
          maxLines: 3,
          decoration: InputDecoration(
            hintText: 'Viết bình luận của bạn...',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            filled: true,
            fillColor: Theme.of(context).colorScheme.surfaceContainerHighest.withAlpha(50),
          ),
        ),
        const SizedBox(height: 12),
        ElevatedButton(
          onPressed: isSubmitting ? null : _submitComment,
          style: ElevatedButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 12),
            backgroundColor: Theme.of(context).colorScheme.primary,
            foregroundColor: Theme.of(context).colorScheme.onPrimary,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          ),
          child: isSubmitting
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                )
              : const Text('Gửi bình luận'),
        ),
      ],
    );
  }

  Widget _buildCommentList() {
    if (comments.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(24),
        alignment: Alignment.center,
        child: Text(
          'Chưa có bình luận nào. Hãy là người đầu tiên!',
          style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
        ),
      );
    }

    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: comments.length,
      separatorBuilder: (_, __) => const Divider(),
      itemBuilder: (context, index) {
        final comment = comments[index];
        final author = comment['author_name'] ?? 'Khách';
        final commentContent = comment['content'] ?? '';
        final date = _formatDate(comment['created_at'] ?? '');

        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                child: Text(
                  author.isNotEmpty ? author[0].toUpperCase() : 'U',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onPrimaryContainer,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          author,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                        Text(
                          date,
                          style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(commentContent, style: const TextStyle(fontSize: 14)),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildMetaItem(String text, BuildContext context) {
    return Text(
      text,
      style: TextStyle(
        fontSize: 12,
        color: Theme.of(context).colorScheme.onSurfaceVariant,
        fontWeight: FontWeight.w500,
      ),
    );
  }
}