import 'package:flutter/material.dart';

import '../../../controllers/locale_controller.dart';
import '../../../controllers/theme_controller.dart';
import '../../../l10n/app_localizations.dart';
import '../../../main.dart' show navigatorKey;
import '../../../screens/auth/login_screen.dart';
import '../../../services/auth_service.dart';
import '../../../utils/app_snackbar.dart';
import '../../../utils/translation.dart';

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
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        title: Text(l10n.settings, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: Theme.of(context).colorScheme.surface,
        foregroundColor: Theme.of(context).colorScheme.onSurface,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSectionTitle('Interface'),
            _buildCard(children: [
              ListenableBuilder(
                listenable: ThemeController.instance,
                builder: (context, _) {
                  final isDark = ThemeController.instance.isDark;
                  return _buildSwitchTile(
                    icon: Icons.dark_mode_outlined,
                    title: l10n.darkMode,
                    value: isDark,
                    onChanged: (val) => ThemeController.instance.setDarkMode(val),
                  );
                },
              ),
              const Divider(height: 1, indent: 56),
              ListenableBuilder(
                listenable: LocaleController.instance,
                builder: (context, _) {
                  return ListTile(
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(8)),
                      child: const Icon(Icons.language, color: Color(0xFF3B82F6), size: 20),
                    ),
                    title: Text(l10n.language, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500)),
                    trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                      Text(LocaleController.instance.getLanguageName(), style: const TextStyle(color: Color(0xFF64748B), fontSize: 14)),
                      const SizedBox(width: 8),
                      const Icon(Icons.chevron_right, color: Color(0xFFCBD5E1)),
                    ]),
                    onTap: () => _showLanguageDialog(context),
                  );
                },
              ),
            ]),
            const SizedBox(height: 24),
            _buildSectionTitle(l10n.privacy),
            _buildCard(children: [
              _buildSwitchTile(icon: Icons.phone_android_outlined, iconColor: const Color(0xFF10B981), iconBgColor: const Color(0xFFECFDF5), title: l10n.displayPhoneNumber, value: _showPhoneNumber, onChanged: (val) {
                setState(() => _showPhoneNumber = val);
                _showComingSoon(context);
              }),
              const Divider(height: 1, indent: 56),
              _buildSwitchTile(icon: Icons.recommend_outlined, iconColor: const Color(0xFF10B981), iconBgColor: const Color(0xFFECFDF5), title: l10n.allowPersonalization, value: _allowPersonalization, onChanged: (val) {
                setState(() => _allowPersonalization = val);
                _showComingSoon(context);
              }),
            ]),
            const SizedBox(height: 24),
            _buildSectionTitle(l10n.data),
            _buildCard(children: [
              _buildActionTile(icon: Icons.delete_outline, iconColor: const Color(0xFFEF4444), iconBgColor: const Color(0xFFFEF2F2), title: l10n.clearCache, onTap: () => _showComingSoon(context)),
              const Divider(height: 1, indent: 56),
              _buildActionTile(icon: Icons.refresh, iconColor: const Color(0xFFF59E0B), iconBgColor: const Color(0xFFFFFBEB), title: l10n.refreshData, onTap: () => _showComingSoon(context)),
            ]),
            const SizedBox(height: 24),
            _buildSectionTitle(l10n.appInfo),
            _buildCard(children: [
              ListTile(leading: Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: const Color(0xFFF3E8FF), borderRadius: BorderRadius.circular(8)), child: const Icon(Icons.info_outline, color: Color(0xFFA855F7), size: 20)), title: Text(l10n.appVersion, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500)), trailing: const Text('v1.0.0', style: TextStyle(color: Color(0xFF64748B), fontSize: 14))),
              const Divider(height: 1, indent: 56),
              _buildActionTile(icon: Icons.system_update_alt, iconColor: const Color(0xFFA855F7), iconBgColor: const Color(0xFFF3E8FF), title: l10n.checkUpdate, onTap: () => _showComingSoon(context)),
            ]),
            const SizedBox(height: 24),
            _buildSectionTitle(l10n.dangerZone, color: const Color(0xFFEF4444)),
            _buildCard(children: [
              _buildActionTile(icon: Icons.delete_forever, iconColor: const Color(0xFFEF4444), iconBgColor: const Color(0xFFFEF2F2), titleColor: const Color(0xFFEF4444), title: l10n.deleteAccount, onTap: () => _showDeleteAccountDialog(context)),
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

  Widget _buildSwitchTile({
    required IconData icon,
    required String title,
    required bool value,
    required ValueChanged<bool> onChanged,
    Color iconColor = const Color(0xFF3B82F6),
    Color iconBgColor = const Color(0xFFEFF6FF),
  }) {
    return SwitchListTile(
      value: value,
      onChanged: onChanged,
      activeColor: Colors.white, 
      activeTrackColor: const Color(0xFF34C759),         
      inactiveThumbColor: const Color(0xFF94A3B8),
      inactiveTrackColor: Theme.of(context).colorScheme.surface,
      trackOutlineColor: WidgetStateProperty.resolveWith<Color?>(
        (Set<WidgetState> states) {
          if (states.contains(WidgetState.selected)) {
            return const Color(0xFF34C759); 
          }
          return const Color(0xFFE2E8F0);
        },
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
      secondary: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: iconBgColor, 
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, color: iconColor, size: 20),
      ),
      title: Text(
        title, 
        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
      ),
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

  void _showLanguageDialog(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.selectLanguage),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: Text(l10n.vietnamese),
              leading: Radio<String>(
                value: 'vi',
                groupValue: LocaleController.instance.locale.languageCode,
                onChanged: (value) {
                  LocaleController.instance.setLocale(Locale(value!));
                  Navigator.pop(context);
                },
              ),
              onTap: () {
                LocaleController.instance.setLocale(const Locale('vi'));
                Navigator.pop(context);
              },
            ),
            ListTile(
              title: Text(l10n.english),
              leading: Radio<String>(
                value: 'en',
                groupValue: LocaleController.instance.locale.languageCode,
                onChanged: (value) {
                  LocaleController.instance.setLocale(Locale(value!));
                  Navigator.pop(context);
                },
              ),
              onTap: () {
                LocaleController.instance.setLocale(const Locale('en'));
                Navigator.pop(context);
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showDeleteAccountDialog(BuildContext context) {
    final passwordController = TextEditingController();
    bool deleting = false;
    bool agreed = false;
    String password = '';
    final dangerColor = const Color(0xFFEF4444);

    showDialog<void>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          title: Text(Trans.deleteAccountConfirmTitle),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(Trans.deleteAccountWarning,
                    style: TextStyle(fontSize: 13, color: dangerColor, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                Text(Trans.deleteAccountCannotRecover,
                    style: const TextStyle(fontSize: 13, color: Colors.grey)),
                const SizedBox(height: 16),
                TextField(
                  controller: passwordController,
                  obscureText: true,
                  onChanged: (value) => setDialogState(() => password = value),
                  decoration: InputDecoration(
                    labelText: Trans.password,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Checkbox(
                      value: agreed,
                      onChanged: (value) => setDialogState(() => agreed = value ?? false),
                      activeColor: dangerColor,
                    ),
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setDialogState(() => agreed = !agreed),
                        child: Text(Trans.iAgreeDelete,
                            style: TextStyle(fontSize: 13, color: agreed ? dangerColor : Colors.grey)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: Text(Trans.cancel),
            ),
            ElevatedButton(
              onPressed: deleting || !agreed || password.isEmpty
                  ? null
                  : () async {
                      setDialogState(() => deleting = true);
                      try {
                        await AuthService.deleteAccount(
                          password: password,
                        );
                        if (context.mounted) {
                          Navigator.of(dialogContext).pop();
                          AppSnackBar.showSuccess(
                            context,
                            Trans.deleteAccountSuccess,
                          );
                          // Navigate to login using navigatorKey (app uses conditional rendering)
                          navigatorKey.currentState?.pushAndRemoveUntil(
                            MaterialPageRoute(builder: (_) => const LoginScreen()),
                            (route) => false,
                          );
                        }
                      } catch (e) {
                        setDialogState(() => deleting = false);
                      }
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: dangerColor,
                foregroundColor: Colors.white,
              ),
              child: deleting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : Text(Trans.delete),
            ),
          ],
        ),
      ),
    );
  }

  void _showComingSoon(BuildContext context) {
    AppSnackBar.showInfo(
      context,
      Trans.featureComingSoon,
    );
  }
}
