import 'package:flutter/material.dart';

import '../../../services/auth_service.dart';

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
    return Scaffold(
      appBar: AppBar(
        title: const Text('Bảo mật tài khoản'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: Container(
        color: const Color(0xFFFAF1EB),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildTopCard(),
                const SizedBox(height: 20),
                _buildPasswordSection(),
                const SizedBox(height: 20),
                _buildTwoFaSection(),
                const SizedBox(height: 20),
                _buildSessionsSection(),
                const SizedBox(height: 20),
                _buildDangerSection(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTopCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          Text('Bảo mật tài khoản', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          SizedBox(height: 8),
          Text(
            'Quản lý mật khẩu, xác thực và các phiên đăng nhập để bảo vệ an toàn cho tài khoản của bạn.',
            style: TextStyle(fontSize: 14, color: Colors.grey),
          ),
        ],
      ),
    );
  }

  Widget _buildPasswordSection() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Icon(Icons.warning_amber_outlined, color: Color(0xFFEF7A45), size: 24),
              SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Thay đổi mật khẩu', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    SizedBox(height: 4),
                    Text('Cập nhật mật khẩu để an toàn hơn.', style: TextStyle(fontSize: 14, color: Colors.grey)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _currentPasswordController,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'Mật khẩu hiện tại'),
            onChanged: (value) => setState(() => _currentPassword = value),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _newPasswordController,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'Mật khẩu mới'),
            onChanged: (value) => setState(() => _newPassword = value),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _confirmPasswordController,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'Xác nhận mật khẩu mới'),
            onChanged: (value) => setState(() => _confirmPassword = value),
          ),
          const SizedBox(height: 16),
          if (_success != null)
            Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: const Color(0xFFDDF6E7), borderRadius: BorderRadius.circular(16)),
              child: Text(_success!, style: const TextStyle(color: Color(0xFF0F5132))),
            ),
          if (_error != null)
            Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: const Color(0xFFF8D7DA), borderRadius: BorderRadius.circular(16)),
              child: Text(_error!, style: const TextStyle(color: Color(0xFF842029))),
            ),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _busy ? null : _changePassword,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFEF7A45),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: Text(_busy ? 'Đang xử lý…' : 'Cập nhật mật khẩu'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTwoFaSection() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Icon(Icons.shield_outlined, color: Color(0xFFEF7A45), size: 24),
              SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Xác thực 2 lớp (2FA)', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    SizedBox(height: 4),
                    Text('Bật hoặc tắt bảo vệ 2FA cho tài khoản của bạn.', style: TextStyle(fontSize: 14, color: Colors.grey)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Text('Hiện tại ${_twoFaEnabled ? 'đang bật' : 'đang tắt'} bảo vệ 2FA.', style: const TextStyle(fontSize: 14)),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () => setState(() => _twoFaEnabled = !_twoFaEnabled),
              style: OutlinedButton.styleFrom(
                foregroundColor: _twoFaEnabled ? Colors.white : const Color(0xFFEF7A45),
                backgroundColor: _twoFaEnabled ? const Color(0xFFEF7A45) : Colors.transparent,
                side: const BorderSide(color: Color(0xFFEF7A45)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: Text(_twoFaEnabled ? 'Tắt 2FA' : 'Bật 2FA'),
            ),
          ),
          const SizedBox(height: 20),
          if (_twoFaEnabled)
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Mã backup', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _backupCodes
                      .map(
                        (code) => Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8F3EB),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Text(code, style: const TextStyle(fontWeight: FontWeight.w600)),
                        ),
                      )
                      .toList(),
                ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _buildSessionsSection() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Icon(Icons.device_hub_outlined, color: Color(0xFFEF7A45), size: 24),
              SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Quản lý phiên đăng nhập', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    SizedBox(height: 4),
                    Text('Xem và quản lý các thiết bị đang đăng nhập.', style: TextStyle(fontSize: 14, color: Colors.grey)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (_loadingSessions)
            const Center(child: CircularProgressIndicator())
          else ...[
            Text('Có ${_sessions.length} phiên đăng nhập đang hoạt động.', style: const TextStyle(fontSize: 14)),
            const SizedBox(height: 16),
            if (_sessions.isEmpty)
              const Text('Không có phiên đăng nhập nào.', style: TextStyle(color: Colors.grey))
            else
              ..._sessions.map(_buildSessionCard).toList(),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: _sessions.isEmpty ? null : _logoutAllSessions,
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.red,
                  side: const BorderSide(color: Colors.red),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: const Text('Đăng xuất khỏi tất cả thiết bị'),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSessionCard(Map<String, dynamic> session) {
    final isCurrent = session['is_current'] == true;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8F3EB),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(session['name']?.toString() ?? 'Thiết bị', style: const TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                Text('Đăng nhập: ${_formatDateTime(session['created_at']?.toString())}', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                const SizedBox(height: 4),
                Text('Hoạt động gần nhất: ${_formatDateTime(session['last_used_at']?.toString())}', style: const TextStyle(color: Colors.grey, fontSize: 12)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              if (isCurrent)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFD1FAE5),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text('Đang hoạt động', style: TextStyle(color: Color(0xFF0F5132), fontSize: 12)),
                ),
              const SizedBox(height: 8),
              if (!isCurrent)
                TextButton(
                  onPressed: () => _revokeSession(session['id']?.toString() ?? ''),
                  child: const Text('Thu hồi', style: TextStyle(color: Color(0xFFEF7A45))),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDangerSection() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF1F0),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Khu vực nguy hiểm', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFFB91C1C))),
          const SizedBox(height: 8),
          const Text('Thao tác dưới đây có thể làm ảnh hưởng tài khoản của bạn.', style: TextStyle(color: Colors.grey)),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () {
                showDialog<void>(
                  context: context,
                  builder: (context) => AlertDialog(
                    title: const Text('Chức năng chưa hoàn thiện'),
                    content: const Text('Chức năng sẽ được hoàn thiện ở bản sau.'),
                    actions: [
                      TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Đóng')),
                    ],
                  ),
                );
              },
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFFB91C1C),
                side: const BorderSide(color: Color(0xFFB91C1C)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: const Text('Xóa khỏi tài khoản'),
            ),
          ),
        ],
      ),
    );
  }
}
