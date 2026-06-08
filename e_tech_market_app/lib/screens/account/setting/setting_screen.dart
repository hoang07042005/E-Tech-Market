import 'package:flutter/material.dart';
import '../../../controllers/theme_controller.dart';

class SettingScreen extends StatefulWidget {
  const SettingScreen({super.key});

  @override
  State<SettingScreen> createState() => _SettingScreenState();
}

class _SettingScreenState extends State<SettingScreen> {
  bool _showPhoneNumber = true;
  bool _allowPersonalization = true;


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.surface,
        foregroundColor: Theme.of(context).colorScheme.onSurface,
        elevation: 1,
        title: const Text('Cài đặt', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSectionTitle('Giao diện'),
            _buildCard(children: [
              ListenableBuilder(
                listenable: ThemeController.instance,
                builder: (context, _) {
                  final isDark = ThemeController.instance.isDark;
                  return _buildSwitchTile(
                    icon: Icons.dark_mode_outlined,
                    title: 'Chế độ tối (Dark Mode)',
                    value: isDark,
                    onChanged: (val) => ThemeController.instance.setDarkMode(val),
                  );
                },
              ),
              const Divider(height: 1, indent: 56),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(8)),
                  child: const Icon(Icons.language, color: Color(0xFF3B82F6), size: 20),
                ),
                title: const Text('Ngôn ngữ', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500)),
                trailing: const Row(mainAxisSize: MainAxisSize.min, children: [
                  Text('Tiếng Việt', style: TextStyle(color: Color(0xFF64748B), fontSize: 14)),
                  SizedBox(width: 8),
                  Icon(Icons.chevron_right, color: Color(0xFFCBD5E1)),
                ]),
                onTap: () {},
              ),
            ]),
            const SizedBox(height: 24),
            _buildSectionTitle('Riêng tư'),
            _buildCard(children: [
              _buildSwitchTile(icon: Icons.phone_android_outlined, iconColor: const Color(0xFF10B981), iconBgColor: const Color(0xFFECFDF5), title: 'Hiện thị số điện thoại', value: _showPhoneNumber, onChanged: (val) => setState(() => _showPhoneNumber = val)),
              const Divider(height: 1, indent: 56),
              _buildSwitchTile(icon: Icons.recommend_outlined, iconColor: const Color(0xFF10B981), iconBgColor: const Color(0xFFECFDF5), title: 'Cho phép cá nhân hóa đề xuất sản phẩm', value: _allowPersonalization, onChanged: (val) => setState(() => _allowPersonalization = val)),
            ]),
            const SizedBox(height: 24),
            _buildSectionTitle('Dữ liệu'),
            _buildCard(children: [
              _buildActionTile(icon: Icons.delete_outline, iconColor: const Color(0xFFEF4444), iconBgColor: const Color(0xFFFEF2F2), title: 'Xóa bộ nhớ đệm', onTap: () {}),
              const Divider(height: 1, indent: 56),
              _buildActionTile(icon: Icons.refresh, iconColor: const Color(0xFFF59E0B), iconBgColor: const Color(0xFFFFFBEB), title: 'Làm mới dữ li���u ứng dụng', onTap: () {}),
            ]),
            const SizedBox(height: 24),
            _buildSectionTitle('Thông tin ứng dụng'),
            _buildCard(children: [
              ListTile(leading: Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: const Color(0xFFF3E8FF), borderRadius: BorderRadius.circular(8)), child: const Icon(Icons.info_outline, color: Color(0xFFA855F7), size: 20)), title: const Text('Phiên bản ứng dụng', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500)), trailing: const Text('v1.0.0', style: TextStyle(color: Color(0xFF64748B), fontSize: 14))),
              const Divider(height: 1, indent: 56),
              _buildActionTile(icon: Icons.system_update_alt, iconColor: const Color(0xFFA855F7), iconBgColor: const Color(0xFFF3E8FF), title: 'Kiểm tra cập nhật', onTap: () {}),
            ]),
            const SizedBox(height: 24),
            _buildSectionTitle('Khu vực nguy hiểm', color: const Color(0xFFEF4444)),
            _buildCard(children: [
              _buildActionTile(icon: Icons.delete_forever, iconColor: const Color(0xFFEF4444), iconBgColor: const Color(0xFFFEF2F2), titleColor: const Color(0xFFEF4444), title: 'Xóa tài khoản', onTap: () {}),
            ]),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title, {Color color = const Color(0xFF64748B)}) {
    return Padding(padding: const EdgeInsets.only(left: 4, bottom: 10), child: Text(title, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: color, letterSpacing: 0.5)));
  }

  Widget _buildCard({required List<Widget> children}) {
    return Container(
      decoration: BoxDecoration(color: Theme.of(context).colorScheme.surface, borderRadius: BorderRadius.circular(16), boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 10, offset: Offset(0, 4))]),
      child: Column(children: children),
    );
  }

  Widget _buildSwitchTile({required IconData icon, required String title, required bool value, required ValueChanged<bool> onChanged, Color iconColor = const Color(0xFF3B82F6), Color iconBgColor = const Color(0xFFEFF6FF)}) {
    return SwitchListTile(
      value: value,
      onChanged: onChanged,
      activeColor: const Color(0xFFF26522),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
      secondary: Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: iconBgColor, borderRadius: BorderRadius.circular(8)), child: Icon(icon, color: iconColor, size: 20)),
      title: Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500)),
    );
  }

  Widget _buildActionTile({required IconData icon, required String title, required VoidCallback onTap, Color iconColor = const Color(0xFF64748B), Color iconBgColor = const Color(0xFFF1F5F9), Color? titleColor}) {
    return ListTile(
      leading: Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: iconBgColor, borderRadius: BorderRadius.circular(8)), child: Icon(icon, color: iconColor, size: 20)),
      title: Text(title, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: titleColor)),
      trailing: Icon(Icons.chevron_right, color: Theme.of(context).colorScheme.outline),
      onTap: onTap,
    );
  }
}
