import 'package:flutter/material.dart';
import '../../services/newsletter_service.dart';

class NewsletterSection extends StatefulWidget {
  const NewsletterSection({Key? key}) : super(key: key);

  @override
  State<NewsletterSection> createState() => _NewsletterSectionState();
}

class _NewsletterSectionState extends State<NewsletterSection> {
  final _emailController = TextEditingController();
  bool _isLoading = false;
  String? _message;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) {
      setState(() => _message = 'Vui lòng nhập email');
      return;
    }

    setState(() {
      _isLoading = true;
      _message = null;
    });

    try {
      await NewsletterService.subscribeToNewsletter(email: email);
      setState(() {
        _message = 'Đăng ký thành công! Cảm ơn bạn.';
        _emailController.clear();
      });

      // Clear message after 3 seconds
      await Future.delayed(const Duration(seconds: 3));
      if (mounted) {
        setState(() => _message = null);
      }
    } catch (e) {
      setState(() => _message = e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 16),
      color: Theme.of(context).colorScheme.surface,
      child: SingleChildScrollView(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 600),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Title
                Text(
                  'Luôn cập nhật tin tức',
                  style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                        fontSize: 28,
                        fontWeight: FontWeight.w600,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),

                // Description
                Text(
                  'Tham gia cộng đồng ưu tiên: ưu đãi sớm cho phiên bản giới hạn và tài liệu kỹ thuật chọn lọc.',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        fontSize: 16,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                        height: 1.6,
                      ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 48),

                // Form
                Container(
                  decoration: BoxDecoration(
                    border: Border.all(color: Theme.of(context).colorScheme.outline),
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.04),
                        blurRadius: 20,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      // Email Input
                      Expanded(
                        child: TextField(
                          controller: _emailController,
                          keyboardType: TextInputType.emailAddress,
                          enabled: !_isLoading,
                          decoration: InputDecoration(
                            hintText: 'ĐỊA CHỈ EMAIL',
                            hintStyle: TextStyle(
                              color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.4),
                              fontWeight: FontWeight.w600,
                              letterSpacing: 0.05,
                            ),
                            border: InputBorder.none,
                            contentPadding:
                                const EdgeInsets.symmetric(horizontal: 22),
                            isDense: true,
                          ),
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.05,
                            color: Theme.of(context).colorScheme.onSurface,
                          ),
                          onSubmitted: (_) => _handleSubmit(),
                        ),
                      ),

                      // Subscribe Button
                      Container(
                        height: 60,
                        width: 120,
                        decoration: const BoxDecoration(
                          color: Color(0xFFEF7A45),
                          borderRadius: BorderRadius.only(
                            topRight: Radius.circular(12),
                            bottomRight: Radius.circular(12),
                          ),
                        ),
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: _isLoading ? null : _handleSubmit,
                            borderRadius: const BorderRadius.only(
                              topRight: Radius.circular(12),
                              bottomRight: Radius.circular(12),
                            ),
                            child: Center(
                              child: _isLoading
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        valueColor:
                                            AlwaysStoppedAnimation<Color>(
                                          Colors.white,
                                        ),
                                        strokeWidth: 2,
                                      ),
                                    )
                                  : Text(
                                      'ĐĂNG KÝ',
                                      style: Theme.of(context)
                                          .textTheme
                                          .labelLarge
                                          ?.copyWith(
                                            color: Theme.of(context).colorScheme.surface,
                                            fontWeight: FontWeight.w700,
                                            letterSpacing: 0.05,
                                          ),
                                    ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Message
                if (_message != null) ...[
                  const SizedBox(height: 16),
                  Text(
                    _message!,
                    style: TextStyle(
                      fontSize: 13,
                      color: _message!.contains('thành công')
                          ? Color(0xFF10B981)
                          : Color(0xFFEF4444),
                      fontWeight: FontWeight.w500,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
