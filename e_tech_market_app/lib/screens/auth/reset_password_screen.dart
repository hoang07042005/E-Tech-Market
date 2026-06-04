import 'package:flutter/material.dart';
import '../../services/auth_service.dart';
import 'login_screen.dart';

class ResetPasswordScreen extends StatefulWidget {
  final String email;

  const ResetPasswordScreen({super.key, required this.email});

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _tokenController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _isLoading = false;
  String? _error;
  bool _success = false;
  bool _obscurePassword = true;
  bool _obscureConfirm = true;

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      await AuthService.resetPassword(
        email: widget.email,
        token: _tokenController.text.trim(),
        password: _passwordController.text,
      );
      setState(() {
        _success = true;
      });
    } catch (exception) {
      setState(() {
        _error = exception.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  InputDecoration _inputDecoration(String hint, {Widget? suffixIcon}) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 14),
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      suffixIcon: suffixIcon,
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.grey.shade300),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFEF7A45), width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFEF4444)),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFEF4444), width: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    const accent = Color(0xFFEF7A45);
    return Scaffold(
      backgroundColor: const Color(0xFFFAF1EB),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.black87),
        title: const Text(
          'Đặt lại mật khẩu',
          style: TextStyle(color: Colors.black87, fontWeight: FontWeight.w700, fontSize: 18),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: _success ? _buildSuccessView(accent) : _buildFormView(accent),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSuccessView(Color accent) {
    return Column(
      children: [
        const SizedBox(height: 40),
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: const Color(0xFFD1FAE5),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF34D399)),
          ),
          child: Column(
            children: [
              const Icon(Icons.check_circle, color: Color(0xFF059669), size: 56),
              const SizedBox(height: 16),
              const Text(
                'Đổi mật khẩu thành công!',
                style: TextStyle(color: Color(0xFF065F46), fontWeight: FontWeight.bold, fontSize: 18),
              ),
              const SizedBox(height: 10),
              const Text(
                'Bạn đã đặt lại mật khẩu thành công. Hãy đăng nhập với mật khẩu mới.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Color(0xFF064E3B), height: 1.5),
              ),
            ],
          ),
        ),
        const SizedBox(height: 32),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () {
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const LoginScreen()),
                (route) => false,
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: accent,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              elevation: 0,
            ),
            child: const Text('ĐĂNG NHẬP NGAY', style: TextStyle(letterSpacing: 2, fontWeight: FontWeight.w700)),
          ),
        ),
      ],
    );
  }

  Widget _buildFormView(Color accent) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 8),
          // Info card
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF7ED),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFFED7AA)),
            ),
            child: Row(
              children: [
                const Icon(Icons.info_outline, color: Color(0xFFEA580C), size: 22),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Mở email trên điện thoại, sao chép mã xác nhận rồi dán vào ô bên dưới.',
                    style: TextStyle(color: Colors.orange.shade800, fontSize: 13, height: 1.4),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Email (read-only)
          const Text('Email', style: TextStyle(color: Color(0xFF7C6B61), fontSize: 13, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: const Color(0xFFF3F4F6),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade300),
            ),
            child: Row(
              children: [
                const Icon(Icons.email_outlined, color: Color(0xFF6B7280), size: 18),
                const SizedBox(width: 10),
                Text(widget.email, style: const TextStyle(color: Color(0xFF6B7280), fontSize: 14)),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Token
          const Text('Mã xác nhận', style: TextStyle(color: Color(0xFF7C6B61), fontSize: 13, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          TextFormField(
            controller: _tokenController,
            decoration: _inputDecoration('Dán mã xác nhận từ email vào đây'),
            maxLines: 2,
            style: const TextStyle(fontSize: 13, fontFamily: 'monospace'),
            validator: (value) {
              if (value == null || value.trim().isEmpty) return 'Vui lòng nhập mã xác nhận.';
              return null;
            },
          ),
          const SizedBox(height: 20),

          // New password
          const Text('Mật khẩu mới', style: TextStyle(color: Color(0xFF7C6B61), fontSize: 13, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          TextFormField(
            controller: _passwordController,
            obscureText: _obscurePassword,
            decoration: _inputDecoration(
              'Nhập mật khẩu mới',
              suffixIcon: IconButton(
                icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility, color: Colors.grey, size: 20),
                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
              ),
            ),
            validator: (value) {
              if (value == null || value.isEmpty) return 'Vui lòng nhập mật khẩu.';
              if (value.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự.';
              return null;
            },
          ),
          const SizedBox(height: 20),

          // Confirm password
          const Text('Xác nhận mật khẩu', style: TextStyle(color: Color(0xFF7C6B61), fontSize: 13, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          TextFormField(
            controller: _confirmPasswordController,
            obscureText: _obscureConfirm,
            decoration: _inputDecoration(
              'Nhập lại mật khẩu mới',
              suffixIcon: IconButton(
                icon: Icon(_obscureConfirm ? Icons.visibility_off : Icons.visibility, color: Colors.grey, size: 20),
                onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
              ),
            ),
            validator: (value) {
              if (value == null || value.isEmpty) return 'Vui lòng xác nhận mật khẩu.';
              if (value != _passwordController.text) return 'Mật khẩu không khớp.';
              return null;
            },
          ),
          const SizedBox(height: 24),

          if (_error != null) ...[
            Container(
              decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(12)),
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  const Icon(Icons.error_outline, color: Color(0xFFB91C1C), size: 20),
                  const SizedBox(width: 10),
                  Expanded(child: Text(_error!, style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 13))),
                ],
              ),
            ),
            const SizedBox(height: 24),
          ],

          ElevatedButton(
            onPressed: _isLoading ? null : _submit,
            style: ElevatedButton.styleFrom(
              backgroundColor: accent,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              elevation: 0,
            ),
            child: _isLoading
                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Text('ĐẶT LẠI MẬT KHẨU', style: TextStyle(letterSpacing: 2, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }
}
