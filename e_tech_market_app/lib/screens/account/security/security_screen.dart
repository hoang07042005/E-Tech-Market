import 'package:flutter/material.dart';

import '../../../services/auth_service.dart';
import '../../../utils/translation.dart';

class SecurityScreen extends StatefulWidget {
  const SecurityScreen({super.key});

  @override
  State<SecurityScreen> createState() => _SecurityScreenState();
}

class _SecurityScreenState extends State<SecurityScreen> {
  bool _twoFaEnabled = true;
  bool _busy = false;
  bool _loadingSessions = true;
  String? _error;
  String? _success;
  
  String _currentPassword = '';
  String _newPassword = '';
  String _confirmPassword = '';
  
  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;

  final TextEditingController _currentPasswordController = TextEditingController();
  final TextEditingController _newPasswordController = TextEditingController();
  final TextEditingController _confirmPasswordController = TextEditingController();
  List<Map<String, dynamic>> _sessions = [];

  final List<String> _backupCodes = const [
    'ABCD-1234-EFGH',
    'IJKL-5678-MNOP',
    'QRST-9012-UVWX',
    'YZAB-3456-CDEF',
    'GHIJ-7890-KLMN',
  ];

  // Màu sắc chủ đạo đồng bộ toàn màn hình
  final Color primaryColor = const Color(0xFFEF7A45);
  final Color dangerColor = const Color(0xFFB91C1C);

  @override
  void initState() {
    super.initState();
    _loadSessions();
  }

  Future<void> _loadSessions() async {
    final token = await AuthService.getToken();
    if (token == null) {
      setState(() {
        _loadingSessions = false;
        _error = 'Vui lòng đăng nhập lại để truy cập tính năng bảo mật.';
      });
      return;
    }

    try {
      final sessions = await AuthService.fetchSessions(token);
      if (!mounted) return;
      setState(() {
        _sessions = sessions;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _sessions = [];
      });
    } finally {
      if (!mounted) return;
      setState(() {
        _loadingSessions = false;
      });
    }
  }

  Future<void> _changePassword() async {
    setState(() {
      _error = null;
      _success = null;
    });

    if (_currentPassword.trim().isEmpty || _newPassword.trim().isEmpty || _confirmPassword.trim().isEmpty) {
      setState(() {
        _error = 'Vui lòng điền đủ các trường mật khẩu.';
      });
      return;
    }

    if (_newPassword.length < 8) {
      setState(() {
        _error = 'Mật khẩu mới cần tối thiểu 8 ký tự.';
      });
      return;
    }

    if (_newPassword != _confirmPassword) {
      setState(() {
        _error = 'Xác nhận mật khẩu mới không khớp.';
      });
      return;
    }

    final token = await AuthService.getToken();
    if (token == null) {
      setState(() {
        _error = 'Vui lòng đăng nhập lại để đổi mật khẩu.';
      });
      return;
    }

    setState(() {
      _busy = true;
    });

    try {
      await AuthService.changePassword(
        token: token,
        currentPassword: _currentPassword,
        newPassword: _newPassword,
      );
      if (!mounted) return;
      setState(() {
        _currentPassword = '';
        _newPassword = '';
        _confirmPassword = '';
        _currentPasswordController.clear();
        _newPasswordController.clear();
        _confirmPasswordController.clear();
        _success = 'Đổi mật khẩu thành công.';
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
      });
    } finally {
      if (!mounted) return;
      setState(() {
        _busy = false;
      });
    }
  }

  void _revokeSession(String id) {
    setState(() {
      _sessions = _sessions.where((session) => session['id'] != id).toList();
    });
  }

  void _logoutAllSessions() {
    setState(() {
      _sessions = [];
      _success = 'Đã đăng xuất khỏi tất cả thiết bị (hiển thị).';
    });
  }

  @override
  void dispose() {
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  String _formatDateTime(String? iso) {
    if (iso == null || iso.isEmpty) return '—';
    final dateTime = DateTime.tryParse(iso);
    if (dateTime == null) return '—';
    return '${dateTime.day}/${dateTime.month}/${dateTime.year} ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      appBar: AppBar(
        title: Text(Trans.accountSecurity, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: theme.colorScheme.surface,
        foregroundColor: theme.colorScheme.onSurface,
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: theme.colorScheme.outlineVariant.withOpacity(0.4), height: 1),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildTopCard(),
              const SizedBox(height: 16),
              
              // Thông báo lỗi/thành công tổng quát nếu có
              if (_success != null) _buildStatusAlert(_success!, const Color(0xFFDDF6E7), const Color(0xFF0F5132), Icons.check_circle_outline),
              if (_error != null) _buildStatusAlert(_error!, const Color(0xFFF8D7DA), const Color(0xFF842029), Icons.error_outline),
              if (_success != null || _error != null) const SizedBox(height: 16),

              _buildPasswordSection(),
              const SizedBox(height: 16),
              _buildTwoFaSection(),
              const SizedBox(height: 16),
              _buildSessionsSection(),
              const SizedBox(height: 16),
              _buildDangerSection(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTopCard() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(Trans.accountSecurity, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        const Text(
          'Quản lý mật khẩu, bảo mật 2 lớp và giám sát các phiên đăng nhập để giữ tài khoản luôn an toàn.',
          style: TextStyle(fontSize: 14, color: Colors.grey),
        ),
        const SizedBox(height: 8),
        const Divider(),
      ],
    );
  }

  Widget _buildSectionWrapper({required String title, required String subtitle, required IconData icon, required Widget child}) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: theme.colorScheme.outlineVariant.withOpacity(0.5), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: primaryColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: primaryColor, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 2),
                    Text(subtitle, style: const TextStyle(fontSize: 13, color: Colors.grey)),
                  ],
                ),
              ),
            ],
          ),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Divider(height: 1),
          ),
          child,
        ],
      ),
    );
  }

  Widget _buildPasswordSection() {
    return _buildSectionWrapper(
      title: Trans.changePassword,
      subtitle: Trans.updatePasswordSecurity,
      icon: Icons.lock_outline,
      child: Column(
        children: [
          _buildCustomTextField(
            controller: _currentPasswordController,
            label: 'Mật khẩu hiện tại',
            obscureText: _obscureCurrent,
            onChanged: (value) => _currentPassword = value,
            onToggleVisibility: () => setState(() => _obscureCurrent = !_obscureCurrent),
          ),
          const SizedBox(height: 12),
          _buildCustomTextField(
            controller: _newPasswordController,
            label: 'Mật khẩu mới',
            obscureText: _obscureNew,
            onChanged: (value) => _newPassword = value,
            onToggleVisibility: () => setState(() => _obscureNew = !_obscureNew),
          ),
          const SizedBox(height: 12),
          _buildCustomTextField(
            controller: _confirmPasswordController,
            label: 'Xác nhận mật khẩu mới',
            obscureText: _obscureConfirm,
            onChanged: (value) => _confirmPassword = value,
            onToggleVisibility: () => setState(() => _obscureConfirm = !_obscureConfirm),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 46,
            child: ElevatedButton(
              onPressed: _busy ? null : _changePassword,
              style: ElevatedButton.styleFrom(
                backgroundColor: primaryColor,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: _busy
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : const Text('Cập nhật mật khẩu', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTwoFaSection() {
    return _buildSectionWrapper(
      title: Trans.twoFactorAuth,
      subtitle: Trans.enableDisable2FA,
      icon: Icons.shield_outlined,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: _twoFaEnabled ? Colors.green : Colors.grey,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    _twoFaEnabled ? Trans.twoFAStatusOn : Trans.twoFAStatusOff,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                ],
              ),
              Switch.adaptive(
                activeColor: primaryColor,
                value: _twoFaEnabled,
                onChanged: (value) => setState(() => _twoFaEnabled = value),
              ),
            ],
          ),
          if (_twoFaEnabled) ...[
            const SizedBox(height: 16),
            Text(Trans.backupCode, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _backupCodes.map((code) => _buildCodeChip(code)).toList(),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSessionsSection() {
    return _buildSectionWrapper(
      title: Trans.manageLoginSessions,
      subtitle: Trans.manageDevicesDesc,
      icon: Icons.devices_outlined,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_loadingSessions)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 20),
              child: Center(child: CircularProgressIndicator()),
            )
          else ...[
            Text(
              Trans.activeSessions(_sessions.length),
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 12),
            if (_sessions.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Text(Trans.noSessions, style: const TextStyle(color: Colors.grey)),
              )
            else
              ..._sessions.map(_buildSessionCard).toList(),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              height: 44,
              child: OutlinedButton.icon(
                icon: const Icon(Icons.logout_outlined, size: 18),
                onPressed: _sessions.isEmpty ? null : _logoutAllSessions,
                style: OutlinedButton.styleFrom(
                  foregroundColor: dangerColor,
                  side: BorderSide(color: dangerColor.withOpacity(0.5)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                label: Text(Trans.logoutAllDevices, style: const TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSessionCard(Map<String, dynamic> session) {
    final isCurrent = session['is_current'] == true;
    final theme = Theme.of(context);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceVariant.withOpacity(0.3),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: theme.colorScheme.outlineVariant.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Icon(
            session['name'].toString().toLowerCase().contains('iphone') || 
            session['name'].toString().toLowerCase().contains('android') 
                ? Icons.phone_android_outlined 
                : Icons.computer_outlined,
            color: Colors.grey[600],
            size: 28,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        session['name']?.toString() ?? 'Thiết bị không rõ',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (isCurrent) const SizedBox(width: 6),
                    if (isCurrent)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFD1FAE5),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(Trans.active, style: const TextStyle(color: Color(0xFF0F5132), fontSize: 10, fontWeight: FontWeight.bold)),
                      ),
                  ],
                ),
                const SizedBox(height: 4),
                Text('Đăng nhập: ${_formatDateTime(session['created_at']?.toString())}', style: const TextStyle(color: Colors.grey, fontSize: 11)),
                Text('Hoạt động: ${_formatDateTime(session['last_used_at']?.toString())}', style: const TextStyle(color: Colors.grey, fontSize: 11)),
              ],
            ),
          ),
          if (!isCurrent)
            IconButton(
              icon: Icon(Icons.cancel_outlined, color: primaryColor, size: 20),
              onPressed: () => _revokeSession(session['id']?.toString() ?? ''),
              tooltip: Trans.revoke,
            ),
        ],
      ),
    );
  }

  Widget _buildDangerSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: dangerColor.withOpacity(0.04),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: dangerColor.withOpacity(0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.gpp_bad_outlined, color: dangerColor, size: 22),
              const SizedBox(width: 8),
              Text(Trans.dangerZone, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: dangerColor)),
            ],
          ),
          const SizedBox(height: 4),
          const Text('Thao tác này sẽ xóa vĩnh viễn toàn bộ dữ liệu tài khoản và không thể hoàn tác.', style: TextStyle(color: Colors.grey, fontSize: 13)),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            height: 44,
            child: ElevatedButton(
              onPressed: () {
                showDialog<void>(
                  context: context,
                  builder: (context) => AlertDialog(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    title: Text(Trans.featureNotReady),
                    content: const Text('Chức năng xóa tài khoản đang được phát triển và sẽ ra mắt ở phiên bản tiếp theo.'),
                    actions: [
                      TextButton(onPressed: () => Navigator.of(context).pop(), child: Text(Trans.close)),
                    ],
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: dangerColor,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: Text(Trans.deleteAccount, style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCustomTextField({
    required TextEditingController controller,
    required String label,
    required bool obscureText,
    required Function(String) onChanged,
    required VoidCallback onToggleVisibility,
  }) {
    return TextField(
      controller: controller,
      obscureText: obscureText,
      onChanged: onChanged,
      style: const TextStyle(fontSize: 14),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(fontSize: 13),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: Colors.grey.shade300),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: primaryColor, width: 1.5),
        ),
        suffixIcon: IconButton(
          icon: Icon(obscureText ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 18),
          onPressed: onToggleVisibility,
        ),
      ),
    );
  }

  Widget _buildCodeChip(String code) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceVariant.withOpacity(0.5),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: theme.colorScheme.outlineVariant.withOpacity(0.5)),
      ),
      child: Text(
        code,
        style: const TextStyle(fontWeight: FontWeight.w600, fontFamily: 'monospace', fontSize: 12, letterSpacing: 0.5),
      ),
    );
  }

  Widget _buildStatusAlert(String message, Color bgColor, Color textColor, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(8)),
      child: Row(
        children: [
          Icon(icon, color: textColor, size: 18),
          const SizedBox(width: 8),
          Expanded(child: Text(message, style: TextStyle(color: textColor, fontSize: 13, fontWeight: FontWeight.w500))),
        ],
      ),
    );
  }
}