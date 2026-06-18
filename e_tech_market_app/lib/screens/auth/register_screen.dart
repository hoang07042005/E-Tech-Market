import 'package:flutter/material.dart';

import '../../services/auth_service.dart';
import '../../utils/translation.dart';
import '../home_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _agree = true;
  bool _isLoading = false;
  String? _error;
  bool _obscurePassword = true;
  bool _obscureConfirm = true;

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_passwordController.text != _confirmController.text) {
      setState(() {
        _error = Trans.passwordNotMatch;
      });
      return;
    }
    if (!_agree) {
      setState(() {
        _error = Trans.agreeToTerms;
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      await AuthService.register(
        name: _nameController.text.trim(),
        email: _emailController.text.trim(),
        password: _passwordController.text,
        phone: _phoneController.text.trim(),
      );
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const HomeScreen()),
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
                              text: 'đến E-TECH MARKET',
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
                            TextSpan(text: 'Cùng\n', style: TextStyle(color: Colors.black, fontSize: 34, fontWeight: FontWeight.w800)),
                            TextSpan(text: 'đồng hành.', style: TextStyle(color: accent, fontSize: 34, fontWeight: FontWeight.w800)),
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
                  Builder(builder: (ctx) {
                    final width = MediaQuery.of(ctx).size.width;
                    final isWide = width >= 600;
                    return _buildHeroIntro(isWide, accent);
                  }),
                  const SizedBox(height: 10),
                  Center(
                    child: Text(
                      Trans.registerTitle,
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
                      Trans.registerSubtitle,
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
                              Text(Trans.fullName, style: TextStyle(color: Color(0xFF7C6B61), fontSize: 13)),
                              TextFormField(
                                style: TextStyle(color: Colors.black),
                                controller: _nameController,
                                decoration: _inputDecoration(''),
                                validator: (value) {
                                  if (value == null || value.trim().isEmpty) return Trans.pleaseEnterName;
                                  return null;
                                },
                              ),
                              const SizedBox(height: 16),
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
                              Text(Trans.phoneNumber, style: TextStyle(color: Color(0xFF7C6B61), fontSize: 13)),
                              TextFormField(
                                style: TextStyle(color: Colors.black),
                                controller: _phoneController,
                                keyboardType: TextInputType.phone,
                                decoration: _inputDecoration(''),
                                validator: (value) {
                                  if (value == null || value.trim().isEmpty) return Trans.pleaseEnterPhone;
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
                                  if (value.length < 6) return Trans.passwordMinLength;
                                  return null;
                                },
                              ),
                              const SizedBox(height: 16),
                              Text(Trans.confirmPassword, style: TextStyle(color: Color(0xFF7C6B61), fontSize: 13)),
                              TextFormField(
                                style: TextStyle(color: Colors.black),
                                controller: _confirmController,
                                obscureText: _obscureConfirm,
                                decoration: _inputDecoration('').copyWith(
                                  suffixIcon: IconButton(
                                    icon: Icon(_obscureConfirm ? Icons.visibility_off : Icons.visibility, color: Colors.grey, size: 20),
                                    onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
                                  ),
                                ),
                                validator: (value) {
                                  if (value == null || value.isEmpty) return Trans.pleaseConfirmPassword;
                                  return null;
                                },
                              ),
                              const SizedBox(height: 12),
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.center,
                                children: [
                                  Checkbox(
                                    value: _agree,
                                    onChanged: _isLoading
                                        ? null
                                        : (value) {
                                            setState(() {
                                              _agree = value ?? false;
                                            });
                                          },
                                    activeColor: accent,
                                  ),
                                  Expanded(
                                    child: Text(
                                      Trans.agreeToTermsText,
                                      style: TextStyle(color: Color(0xFF6B7280), fontSize: 13),
                                    ),
                                  ),
                                ],
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
                        const SizedBox(height: 28),
                        ElevatedButton(
                          onPressed: (_isLoading || !_agree) ? null : _submit,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFF26522),
                            foregroundColor: accent,
                            disabledBackgroundColor: const Color(0xFFEDEDED),
                            disabledForegroundColor: const Color(0xFF9CA3AF),
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            elevation: 0,
                          ),
                          child: _isLoading
                              ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: Color(0xFFFFFFFF), strokeWidth: 2))
                              : Text(Trans.registerButton, style: TextStyle(letterSpacing: 2, fontWeight: FontWeight.w700, color: Color(0xFFFFFFFF))),
                        ),
                        const SizedBox(height: 16),
                        OutlinedButton(
                          onPressed: _isLoading ? null : () => Navigator.of(context).pop(),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Color(0x00FFFFFF)),
                            foregroundColor: const Color(0xFF374151),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: Text(Trans.alreadyHaveAccountLogin, style: TextStyle(fontWeight: FontWeight.w600)),
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
}
