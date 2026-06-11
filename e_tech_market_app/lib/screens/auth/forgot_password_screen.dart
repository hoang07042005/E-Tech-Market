import 'package:flutter/material.dart';
import '../../services/auth_service.dart';
import '../../utils/translation.dart';
import 'reset_password_screen.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  bool _isLoading = false;
  String? _error;
  bool _success = false;

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _error = null;
      _success = false;
    });

    try {
      await AuthService.forgotPassword(_emailController.text.trim());
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

  InputDecoration _inputDecoration(String label) {
    return InputDecoration(
      hintText: label,
      hintStyle: const TextStyle(color: Color(0xFF9CA3AF)),
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(vertical: 12),
      enabledBorder: const UnderlineInputBorder(
        borderSide: BorderSide(color: Color(0xFFBDBDBD)),
      ),
      focusedBorder: const UnderlineInputBorder(
        borderSide: BorderSide(color: Color(0xFFEF7A45), width: 2),
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
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 360),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 20),
                  Text(
                    Trans.forgotPasswordTitle,
                    style: TextStyle(
                      color: accent,
                      fontSize: 30,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    Trans.forgotPasswordSubtitle,
                    style: TextStyle(color: Colors.black54, fontSize: 14, height: 1.5),
                  ),
                  const SizedBox(height: 32),
                  if (_success) ...[
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFD1FAE5),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF34D399)),
                      ),
                      child: Column(
                        children: [
                          const Icon(Icons.check_circle, color: Color(0xFF059669), size: 48),
                          const SizedBox(height: 12),
                          Text(
                            Trans.emailSentSuccess,
                            style: TextStyle(color: Color(0xFF065F46), fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            Trans.checkInbox,
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Color(0xFF064E3B)),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: () {
                        Navigator.of(context).pushReplacement(
                          MaterialPageRoute(
                            builder: (_) => ResetPasswordScreen(email: _emailController.text.trim()),
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: accent,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        elevation: 0,
                      ),
                      child: Text(Trans.enterVerificationCode, style: TextStyle(letterSpacing: 2, fontWeight: FontWeight.w700)),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: accent),
                        foregroundColor: accent,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: Text(Trans.backToLogin, style: TextStyle(fontWeight: FontWeight.w700)),
                    ),
                  ] else ...[
                    Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(Trans.email, style: TextStyle(color: Color(0xFF7C6B61), fontSize: 13)),
                          TextFormField(
                            style: TextStyle(color: Color(0xFF7C6B61)),
                            controller: _emailController,
                            keyboardType: TextInputType.emailAddress,
                            decoration: _inputDecoration('nguyenvana@gmail.com'),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) return Trans.pleaseEnterEmail;
                              if (!value.contains('@')) return Trans.invalidEmailFormat;
                              return null;
                            },
                          ),
                          const SizedBox(height: 24),
                          if (_error != null) ...[
                            Container(
                              decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(12)),
                              padding: const EdgeInsets.all(12),
                              child: Text(_error!, style: const TextStyle(color: Color(0xFFB91C1C))),
                            ),
                            const SizedBox(height: 24),
                          ],
                          ElevatedButton(
                            onPressed: _isLoading ? null : _submit,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFF26522),
                              foregroundColor: accent,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              elevation: 0,
                            ),
                            child: _isLoading
                                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: Color(0xFFEF7A45), strokeWidth: 2))
                                : Text(Trans.sendRequest, style: TextStyle(letterSpacing: 2, fontWeight: FontWeight.w700, color: Color(0xFFFFFFFF))),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
