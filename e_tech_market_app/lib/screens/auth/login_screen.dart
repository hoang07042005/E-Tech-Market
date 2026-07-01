import 'package:flutter/material.dart';

import '../../services/auth_service.dart';
import '../../utils/translation.dart';
import '../home_screen.dart';
import '../../main.dart';
import 'register_screen.dart';
import 'forgot_password_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _otpController = TextEditingController();
  bool _isLoading = false;
  String? _error;
  bool _obscurePassword = true;
  bool _requires2FA = false;

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    if (_requires2FA && _otpController.text.trim().isEmpty) {
      setState(() {
        _error = 'Vui lòng nhập mã 2FA.';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final result = await AuthService.login(
        email: _emailController.text.trim(),
        password: _passwordController.text,
        otp: _requires2FA ? _otpController.text.trim() : null,
      );

      if (result['requires_2fa'] == true) {
        if (!mounted) return;
        setState(() {
          _requires2FA = true;
          _error = result['message']?.toString() ?? 'Vui lòng nhập mã 2FA.';
        });
        return;
      }

      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const EntryPoint()),
      );
    } catch (exception) {
      setState(() {
        _requires2FA = false;
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

  Future<void> _signInWithGoogle() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      await AuthService.loginWithGoogle();
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const EntryPoint()),
      );
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

  Widget _buildHeroIntro(bool isWide, Color accent) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 18.0),
      child: isWide
          ? Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      RichText(
                        text: TextSpan(
                          children: [
                            TextSpan(
                              text: Trans.welcome + '\n',
                              style: TextStyle(color: Colors.black, fontSize: 42, fontWeight: FontWeight.w800),
                            ),
                            TextSpan(
                              text: 'trở lại.',
                              style: TextStyle(color: accent, fontSize: 42, fontWeight: FontWeight.w800),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        Trans.subtitle,
                        style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 14, height: 1.6),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                SizedBox(
                  width: 140,
                  height: 140,
                  child: Image.asset(
                    'assets/images/mascot.png',
                    width: 140,
                    height: 140,
                    fit: BoxFit.contain,
                    errorBuilder: (context, error, stack) {
                      return const Center(child: Icon(Icons.pets, size: 86, color: Color(0xFFEF7A45)));
                    },
                  ),
                ),
              ],
            )
          : Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      RichText(
                        text: TextSpan(
                          children: [
                            TextSpan(text: Trans.welcome + '\n', style: TextStyle(color: Colors.black, fontSize: 34, fontWeight: FontWeight.w800)),
                            TextSpan(text: 'trở lại.', style: TextStyle(color: accent, fontSize: 34, fontWeight: FontWeight.w800)),
                          ],
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        Trans.subtitle,
                        style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 13, height: 1.6),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                SizedBox(
                  width: 120,
                  height: 120,
                  child: Image.asset(
                    'assets/images/mascot.png',
                    width: 120,
                    height: 120,
                    fit: BoxFit.contain,
                    errorBuilder: (context, error, stack) {
                      return const Center(child: Icon(Icons.pets, size: 72, color: Color(0xFFEF7A45)));
                    },
                  ),
                ),
              ],
            ),
    );
  }

  @override
  Widget build(BuildContext context) {
    const accent = Color(0xFFEF7A45);
    return Scaffold(
      backgroundColor: const Color(0xFFFAF1EB),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 360),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 8),
                  Center(
                    child: Text(
                      'E-TECH MARKET',
                      style: const TextStyle(
                        color: Color(0xFFBFAF9F),
                        fontWeight: FontWeight.w700,
                        letterSpacing: 2,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  // Hero intro (welcome headline + mascot)
                  Builder(builder: (ctx) {
                    final width = MediaQuery.of(ctx).size.width;
                    final isWide = width >= 600;
                    return _buildHeroIntro(isWide, accent);
                  }),
                  const SizedBox(height: 10),
                  Center(
                    child: Text(
                      Trans.loginTitle,
                      style: TextStyle(
                        color: accent,
                        fontSize: 30,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Center(
                    child: Text(
                      Trans.loginSubtitle,
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.black54, fontSize: 14),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFFFAF1EB),
                      
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Form(
                          key: _formKey,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Text(Trans.email, style: TextStyle(color: Color(0xFF7C6B61), fontSize: 13)),
                              TextFormField(
                                style: TextStyle(color: Colors.black),
                                controller: _emailController,
                                keyboardType: TextInputType.emailAddress,
                                decoration: _inputDecoration(''),
                                validator: (value) {
                                  if (value == null || value.trim().isEmpty) return Trans.pleaseEnterEmail;
                                  if (!value.contains('@')) return Trans.invalidEmailFormat;
                                  return null;
                                },
                              ),
                              const SizedBox(height: 16),
                              Text(Trans.password, style: TextStyle(color: Color(0xFF7C6B61), fontSize: 13)),
                              TextFormField(
                                style: TextStyle(color: Colors.black),
                                controller: _passwordController,
                                obscureText: _obscurePassword,
                                decoration: _inputDecoration('').copyWith(
                                  suffixIcon: IconButton(
                                    icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility, color: Colors.grey, size: 20),
                                    onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                                  ),
                                ),
                                validator: (value) {
                                  if (value == null || value.isEmpty) return Trans.pleaseEnterPassword;
                                  return null;
                                },
                              ),
                              if (_requires2FA) ...[
                                const SizedBox(height: 16),
                                Text('Mã 2FA', style: TextStyle(color: Color(0xFF7C6B61), fontSize: 13)),
                                TextFormField(
                                  style: TextStyle(color: Colors.black),
                                  controller: _otpController,
                                  keyboardType: TextInputType.number,
                                  maxLength: 6,
                                  decoration: _inputDecoration('Nhập mã 6 chữ số').copyWith(
                                    prefixIcon: const Icon(Icons.lock_clock, color: Colors.grey, size: 20),
                                  ),
                                  validator: (value) {
                                    if (_requires2FA && (value == null || value.trim().isEmpty)) {
                                      return 'Vui lòng nhập mã 2FA';
                                    }
                                    return null;
                                  },
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Nhập mã từ ứng dụng Google Authenticator hoặc Authy.',
                                  style: TextStyle(color: Color(0xFF6B7280), fontSize: 12),
                                ),
                              ],
                              const SizedBox(height: 8),
                              Align(
                                alignment: Alignment.centerRight,
                                child: TextButton(
                                  onPressed: () {
                                    Navigator.of(context).push(
                                      MaterialPageRoute(builder: (_) => const ForgotPasswordScreen()),
                                    );
                                  },
                                  child: Text(Trans.forgotPassword + '?', style: TextStyle(color: Color(0xFF6B7280))),
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (_error != null) ...[
                          const SizedBox(height: 16),
                          Container(
                            decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(12)),
                            padding: const EdgeInsets.all(12),
                            child: Text(_error!, style: const TextStyle(color: Color(0xFFB91C1C))),
                          ),
                        ],
                        const SizedBox(height: 30),
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
                              ? Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: Color(0xFFFFFFFF), strokeWidth: 2)),
                                    const SizedBox(width: 8),
                                    Text(_requires2FA ? 'ĐANG XÁC NHẬN...' : 'ĐANG ĐĂNG NHẬP...', style: TextStyle(letterSpacing: 1, fontWeight: FontWeight.w700, color: Color(0xFFFFFFFF))),
                                  ],
                                )
                              : Text(_requires2FA ? 'XÁC NHẬN' : Trans.loginButton, style: TextStyle(letterSpacing: 2, fontWeight: FontWeight.w700, color: Color(0xFFFFFFFF))),
                        ),
                        const SizedBox(height: 20),
                        Row(children: [Expanded(child: Divider(color: Color(0xFFEDE6E0))), Padding(padding: EdgeInsets.symmetric(horizontal: 12), child: Text(Trans.orText, style: TextStyle(color: Color(0xFFBDBDBD), fontWeight: FontWeight.w600, fontSize: 12))), Expanded(child: Divider(color: Color(0xFFEDE6E0))) ]),
                        const SizedBox(height: 20),
                        OutlinedButton.icon(
                          onPressed: _isLoading ? null : _signInWithGoogle,
                          icon: Image.network('https://www.google.com/favicon.ico', width: 20, height: 20),
                          label: Padding(
                            padding: EdgeInsets.symmetric(vertical: 12),
                            child: Text(Trans.continueWithGoogle, style: TextStyle(color: Color(0xFF1F2937), fontWeight: FontWeight.w600)),
                          ),
                          style: OutlinedButton.styleFrom(
                            backgroundColor: Colors.white,
                            side: const BorderSide(color: Color(0xFFE6E6E6)),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                        const SizedBox(height: 4),
                        OutlinedButton(
                          onPressed: _isLoading
                              ? null
                              : () {
                                  Navigator.of(context).push(MaterialPageRoute(builder: (_) => const RegisterScreen()));
                                },
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Color(0x00FFFFFF)),
                            foregroundColor: const Color(0xFF374151),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: Text(Trans.registerLink, style: TextStyle(fontWeight: FontWeight.w600)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _otpController.dispose();
    super.dispose();
  }
}

