import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../services/auth_service.dart';
import '../../utils/network_utils.dart';
import '../../services/chatbot_service.dart';
import '../products/product_detail_screen.dart';
import '../products/flash_sale_product_screen.dart';
import 'widgets/chat_bubble.dart';
import 'widgets/product_card_bubble.dart';
import 'widgets/order_status_card.dart';
import 'widgets/quick_action_chips.dart';
import 'widgets/typing_indicator.dart';

class ChatbotScreen extends StatefulWidget {
  const ChatbotScreen({super.key});

  @override
  State<ChatbotScreen> createState() => _ChatbotScreenState();
}

class _ChatbotScreenState extends State<ChatbotScreen>
    with TickerProviderStateMixin {
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FocusNode _focusNode = FocusNode();

  final List<ChatMessage> _messages = [];
  bool _isLoading = false;
  bool _showQuickActions = true;

  late AnimationController _fabController;
  late Animation<double> _fabAnimation;

  @override
  void initState() {
    super.initState();
    _fabController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _fabAnimation = CurvedAnimation(
      parent: _fabController,
      curve: Curves.easeOut,
    );
    _fabController.forward();

    // Welcome message
    _messages.add(ChatMessage(
      role: 'model',
      text:
          'Xin chào! 👋 Mình là **E-Tech Bot**, trợ lý tư vấn công nghệ của E-Tech Market.\n\nMình có thể giúp bạn:\n📱 Tư vấn chọn sản phẩm phù hợp\n🔍 So sánh cấu hình sản phẩm\n📦 Tra cứu trạng thái đơn hàng\n🛡️ Giải đáp chính sách bảo hành\n\nBạn cần mình hỗ trợ gì nào?',
    ));
    _loadUserAvatar();
  }

  String? _avatarUrl;

  Future<void> _loadUserAvatar() async {
    final user = await AuthService.getCurrentUser();
    if (user != null && mounted) {
      final url = user['avatar'] ?? user['avatar_url'] ?? user['profile_image'] ?? user['image'];
      if (url != null) {
        setState(() {
          _avatarUrl = NetworkUtils.fixDeviceUrl(url.toString());
        });
      }
    }
  }

  @override
  void dispose() {
    _textController.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    _fabController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage(String text) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty || _isLoading) return;

    _textController.clear();

    // Add user message
    setState(() {
      _messages.add(ChatMessage(role: 'user', text: trimmed));
      _isLoading = true;
      _showQuickActions = false;
    });
    _scrollToBottom();

    // Build history for context (last 10 messages)
    final history = _messages
        .where((m) => m.role == 'user' || m.role == 'model')
        .toList();
    final historyForApi = history
        .skip(history.length > 11 ? history.length - 11 : 0)
        .take(10)
        .where((m) => m != _messages.last) // exclude current message
        .map((m) => {'role': m.role, 'text': m.text})
        .toList();

    // Send to API
    final response = await ChatbotService.sendMessage(
      message: trimmed,
      history: historyForApi,
    );

    if (!mounted) return;

    setState(() {
      _messages.add(response);
      _isLoading = false;
    });
    _scrollToBottom();
  }

  void _onProductTap(Map<String, dynamic> product) {
    final slug = product['slug']?.toString();
    if (slug == null || slug.isEmpty) return;

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ProductDetailScreen(slug: slug, variantId: null),
      ),
    );
  }

  void _clearChat() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Xóa lịch sử chat'),
        content: const Text(
            'Bạn có muốn xóa toàn bộ lịch sử cuộc trò chuyện không?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Hủy'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              setState(() {
                _messages.clear();
                _showQuickActions = true;
                _messages.add(ChatMessage(
                  role: 'model',
                  text:
                      'Xin chào! 👋 Mình là **E-Tech Bot**, trợ lý tư vấn công nghệ của E-Tech Market.\n\nBạn cần mình hỗ trợ gì nào?',
                ));
              });
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Xóa'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bottomPadding = MediaQuery.of(context).viewInsets.bottom;

    return Scaffold(
      appBar: _buildAppBar(isDark),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark
                ? [const Color(0xFF0F172A), const Color(0xFF1E293B)]
                : [const Color(0xFFF8FAFC), const Color(0xFFFFFFFF)],
          ),
        ),
        child: Column(
          children: [
            // Chat messages
            Expanded(
              child: ListView.builder(
                controller: _scrollController,
                padding: EdgeInsets.only(
                  top: 16,
                  bottom: bottomPadding > 0 ? 8 : 16,
                ),
                itemCount: _messages.length +
                    (_isLoading ? 1 : 0) +
                    (_showQuickActions ? 1 : 0),
                itemBuilder: (context, index) {
                  // Welcome message + quick actions
                  if (_showQuickActions && index == _messages.length) {
                    return QuickActionChips(
                      onChipTap: (message) {
                        _textController.text = message;
                        _focusNode.requestFocus();
                      },
                    );
                  }

                  // Typing indicator
                  if (_isLoading && index == _messages.length + (_showQuickActions ? 1 : 0) - ((_showQuickActions && !_isLoading) ? 0 : 0)) {
                    // Show typing at end
                  }

                  if (index >= _messages.length) {
                    if (_isLoading &&
                        index ==
                            _messages.length +
                                (_showQuickActions ? 1 : 0)) {
                      return const TypingIndicator();
                    }
                    if (_showQuickActions && index == _messages.length) {
                      return QuickActionChips(
                        onChipTap: (message) {
                          _textController.text = message;
                          _focusNode.requestFocus();
                        },
                      );
                    }
                    return const SizedBox.shrink();
                  }

                  final msg = _messages[index];
                  final timeText =
                      DateFormat('HH:mm').format(msg.timestamp);

                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ChatBubble(
                        text: msg.text,
                        isUser: msg.isUser,
                        timeText: timeText,
                        avatarUrl: _avatarUrl,
                      ),
                      // Product cards (if any)
                      if (msg.hasProducts)
                        ProductCardBubble(
                          products: msg.products!,
                          onProductTap: _onProductTap,
                        ),
                      // Order status card (if any)
                      if (msg.hasOrder)
                        OrderStatusCard(order: msg.order!),
                      // Coupon badge (if any)
                      if (msg.hasCoupon)
                        _buildCouponBadge(msg.couponCode!, isDark),
                      // Action to navigate to Flashsale
                      if (msg.intent == 'flashsale')
                        _buildFlashSaleAction(context, isDark),
                    ],
                  );
                },
              ),
            ),
            // Input area
            _buildInputArea(isDark),
          ],
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(bool isDark) {
    return AppBar(
      flexibleSpace: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFF26522), Color(0xFFFF8A50)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
      ),
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios_new_rounded,
            color: Colors.white, size: 20),
        onPressed: () => Navigator.pop(context),
      ),
      title: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.smart_toy_rounded,
                color: Colors.white, size: 22),
          ),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'E-Tech Bot',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
              Row(
                children: [
                  Container(
                    width: 6,
                    height: 6,
                    decoration: const BoxDecoration(
                      color: Color(0xFF4ADE80),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Online',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.85),
                      fontSize: 11,
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.delete_outline_rounded,
              color: Colors.white, size: 22),
          onPressed: _clearChat,
          tooltip: 'Xóa lịch sử chat',
        ),
        const SizedBox(width: 4),
      ],
      backgroundColor: Colors.transparent,
      elevation: 0,
    );
  }

  Widget _buildInputArea(bool isDark) {
    return Container(
      padding: EdgeInsets.only(
        left: 16,
        right: 8,
        top: 12,
        bottom: MediaQuery.of(context).viewPadding.bottom + 12,
      ),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 12,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color:
                    isDark ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: isDark
                      ? const Color(0xFF334155)
                      : const Color(0xFFE2E8F0),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _textController,
                      focusNode: _focusNode,
                      textCapitalization: TextCapitalization.sentences,
                      maxLines: 3,
                      minLines: 1,
                      style: TextStyle(
                        fontSize: 14,
                        color: isDark
                            ? const Color(0xFFE2E8F0)
                            : const Color(0xFF1E293B),
                      ),
                      decoration: InputDecoration(
                        hintText: 'Nhập tin nhắn...',
                        hintStyle: TextStyle(
                          color: isDark
                              ? const Color(0xFF64748B)
                              : const Color(0xFF94A3B8),
                          fontSize: 14,
                        ),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 10,
                        ),
                      ),
                      onSubmitted: (text) => _sendMessage(text),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 8),
          // Send button
          ScaleTransition(
            scale: _fabAnimation,
            child: Container(
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFF26522), Color(0xFFFF8A50)],
                ),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFFF26522).withValues(alpha: 0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  borderRadius: BorderRadius.circular(24),
                  onTap: _isLoading
                      ? null
                      : () => _sendMessage(_textController.text),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: _isLoading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor:
                                  AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          )
                        : const Icon(Icons.send_rounded,
                            color: Colors.white, size: 20),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCouponBadge(String couponCode, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(left: 56, right: 16, top: 4, bottom: 4),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF10B981), Color(0xFF34D399)],
        ),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF10B981).withValues(alpha: 0.3),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.card_giftcard_rounded,
              color: Colors.white, size: 18),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Mã giảm giá dành cho bạn!',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Text(
                couponCode,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.5,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFlashSaleAction(BuildContext context, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(left: 56, right: 16, top: 4, bottom: 8),
      child: ElevatedButton.icon(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => const FlashSaleProductScreen(),
            ),
          );
        },
        icon: const Icon(Icons.flash_on_rounded, size: 18),
        label: const Text(
          'Vào trang Flash Sale',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFFF26522),
          foregroundColor: Colors.white,
          elevation: 4,
          shadowColor: const Color(0xFFF26522).withValues(alpha: 0.4),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }
}
