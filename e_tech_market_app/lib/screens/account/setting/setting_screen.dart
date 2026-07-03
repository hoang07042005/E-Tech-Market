import 'package:flutter/material.dart';

import '../../../controllers/locale_controller.dart';
import '../../../controllers/theme_controller.dart';
import '../../../l10n/app_localizations.dart';
import '../../../main.dart' show navigatorKey;
import '../../../screens/auth/login_screen.dart';
import '../../../services/auth_service.dart';
import '../../../config/api_config.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:io';
import 'package:flutter/painting.dart';
import '../../../utils/app_snackbar.dart';
import '../../../utils/translation.dart';
import 'package:package_info_plus/package_info_plus.dart';
import '../../../config/dio_client.dart';
import 'package:url_launcher/url_launcher.dart';

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
              _buildActionTile(icon: Icons.delete_outline, iconColor: const Color(0xFFEF4444), iconBgColor: const Color(0xFFFEF2F2), title: l10n.clearCache, onTap: () => _handleClearCache(context)),
              const Divider(height: 1, indent: 56),
              _buildActionTile(icon: Icons.refresh, iconColor: const Color(0xFFF59E0B), iconBgColor: const Color(0xFFFFFBEB), title: l10n.refreshData, onTap: () => _handleRefreshData(context)),
            ]),
            const SizedBox(height: 24),
            _buildSectionTitle(l10n.appInfo),
            _buildCard(children: [
              ListTile(leading: Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: const Color(0xFFF3E8FF), borderRadius: BorderRadius.circular(8)), child: const Icon(Icons.info_outline, color: Color(0xFFA855F7), size: 20)), title: Text(l10n.appVersion, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500)), trailing: const Text('v1.0.0', style: TextStyle(color: Color(0xFF64748B), fontSize: 14))),
              const Divider(height: 1, indent: 56),
              _buildActionTile(icon: Icons.system_update_alt, iconColor: const Color(0xFFA855F7), iconBgColor: const Color(0xFFF3E8FF), title: l10n.checkUpdate, onTap: () => _handleCheckUpdate(context)),
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

  Future<void> _handleClearCache(BuildContext context) async {
    // Ask user whether to also clear login session
    bool clearSession = false;
    final confirm = await showDialog<bool>(
      context: context,
      builder: (dCtx) => StatefulBuilder(
        builder: (ctx, setState) => AlertDialog(
          title: Text(LocaleController.instance.locale.languageCode == 'vi' ? 'Xóa bộ nhớ đệm' : 'Clear cache'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(LocaleController.instance.locale.languageCode == 'vi'
                  ? 'Bạn có muốn xóa bộ nhớ đệm của ứng dụng không?'
                  : 'Do you want to clear the application cache?'),
              const SizedBox(height: 12),
              CheckboxListTile(
                value: clearSession,
                onChanged: (v) => setState(() => clearSession = v ?? false),
                title: Text(LocaleController.instance.locale.languageCode == 'vi' ? 'Xóa cả phiên đăng nhập (Đăng xuất)' : 'Also clear login session (log out)'),
                controlAffinity: ListTileControlAffinity.leading,
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.of(dCtx).pop(false), child: Text(Trans.cancel)),
            ElevatedButton(onPressed: () => Navigator.of(dCtx).pop(true), child: Text(Trans.confirm)),
          ],
        ),
      ),
    );

    if (confirm != true) return;

    final danger = LocaleController.instance.locale.languageCode == 'vi'
        ? 'Đang xóa bộ nhớ đệm...'
        : 'Clearing cache...';
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        content: Row(children: [const CircularProgressIndicator(), const SizedBox(width: 12), Expanded(child: Text(danger))]),
      ),
    );

    try {
      // Clear selected shared prefs entries
      final prefs = await SharedPreferences.getInstance();
      final keys = prefs.getKeys().toList();
      for (final k in keys) {
        if (!clearSession && k == 'auth_user') continue;
        if (clearSession) {
          await prefs.remove(k);
        } else {
          if (k.startsWith('cached') || k.contains('cache') || k.contains('temp')) {
            await prefs.remove(k);
          }
        }
      }

      // Clear temporary files
      try {
        final tempDir = await getTemporaryDirectory();
        if (await tempDir.exists()) {
          await tempDir.delete(recursive: true);
        }
      } catch (_) {}

      // Clear Flutter image cache
      try {
        PaintingBinding.instance.imageCache.clear();
        PaintingBinding.instance.imageCache.clearLiveImages();
      } catch (_) {}

      // If requested, also clear secure token + session
      if (clearSession) {
        try {
          await AuthService.clearSession();
        } catch (_) {}
      }

      Navigator.of(context, rootNavigator: true).pop();

      if (clearSession) {
        final successMsg = LocaleController.instance.locale.languageCode == 'vi' ? 'Đã xóa bộ nhớ đệm và đăng xuất' : 'Cache cleared and logged out';
        AppSnackBar.showSuccess(context, successMsg);
        // Navigate to login
        navigatorKey.currentState?.pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const LoginScreen()),
          (route) => false,
        );
      } else {
        final successMsg = LocaleController.instance.locale.languageCode == 'vi' ? 'Đã xóa bộ nhớ đệm' : 'Cache cleared';
        AppSnackBar.showSuccess(context, successMsg);
      }
    } catch (e) {
      Navigator.of(context, rootNavigator: true).pop();
      final errMsg = LocaleController.instance.locale.languageCode == 'vi' ? 'Xảy ra lỗi khi xóa bộ nhớ đệm' : 'Failed to clear cache';
      AppSnackBar.showError(context, errMsg);
    }
  }

  Future<void> _handleRefreshData(BuildContext context) async {
    final msg = LocaleController.instance.locale.languageCode == 'vi' ? 'Đang làm mới dữ liệu...' : 'Refreshing app data...';
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        content: Row(children: [const CircularProgressIndicator(), const SizedBox(width: 12), Expanded(child: Text(msg))]),
      ),
    );

    try {
      // Rediscover backend server (if applicable)
      await ApiConfig.rediscover();

      // Refresh current user from server if possible
      await AuthService.refreshUser();

      Navigator.of(context, rootNavigator: true).pop();
      final successMsg = LocaleController.instance.locale.languageCode == 'vi' ? 'Dữ liệu đã được làm mới' : 'App data refreshed';
      AppSnackBar.showSuccess(context, successMsg);
    } catch (e) {
      Navigator.of(context, rootNavigator: true).pop();
      final errMsg = LocaleController.instance.locale.languageCode == 'vi' ? 'Làm mới dữ liệu thất bại' : 'Failed to refresh data';
      AppSnackBar.showError(context, errMsg);
    }
  }

  Future<void> _handleCheckUpdate(BuildContext context) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        content: Row(children: [const CircularProgressIndicator(), const SizedBox(width: 12), Expanded(child: Text(LocaleController.instance.locale.languageCode == 'vi' ? 'Đang kiểm tra cập nhật...' : 'Checking for updates...'))]),
      ),
    );

    try {
      final info = await PackageInfo.fromPlatform();
      final current = info.version;

      // Candidate endpoints to discover latest version (best-effort)
      final candidates = [
        '/app/version',
        '/meta/version',
        '/version',
        '/latest',
      ];

      String? latest;
      String? updateUrl;

      for (final path in candidates) {
        try {
          final resp = await DioClient.instance.get(path);
          final data = resp.data;
          if (data == null) continue;
          if (data is String) {
            latest = data;
          } else if (data is Map) {
            latest = data['latest']?.toString() ?? data['version']?.toString() ?? data['tag_name']?.toString() ?? data['name']?.toString();
            updateUrl = data['url']?.toString() ?? data['download_url']?.toString() ?? data['html_url']?.toString();
          }
          if (latest != null) break;
        } catch (_) {
          // ignore and try next
        }
      }

      Navigator.of(context, rootNavigator: true).pop();

      if (latest == null) {
        AppSnackBar.showInfo(context, LocaleController.instance.locale.languageCode == 'vi' ? 'Không có thông tin cập nhật.' : 'No update information available.');
        return;
      }

      bool isNewer = _isVersionNewer(latest, current);
      if (isNewer) {
        final title = LocaleController.instance.locale.languageCode == 'vi' ? 'Cập nhật mới' : 'Update available';
        final body = LocaleController.instance.locale.languageCode == 'vi' ? 'Phiên bản mới $latest có sẵn. Bạn có muốn cập nhật?' : 'Version $latest is available. Do you want to update?';
        showDialog(
          context: context,
          builder: (_) => AlertDialog(
            title: Text(title),
            content: Text(body),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context), child: Text(Trans.cancel)),
              ElevatedButton(
                onPressed: () async {
                  Navigator.pop(context);
                  // Try to open updateUrl, fallback to API base host
                  final uri = updateUrl != null ? Uri.parse(updateUrl) : Uri.parse(ApiConfig.apiBaseUrl.replaceAll('/api/v1', ''));
                  if (await canLaunchUrl(uri)) await launchUrl(uri, mode: LaunchMode.externalApplication);
                },
                child: Text(LocaleController.instance.locale.languageCode == 'vi' ? 'Cập nhật' : 'Update'),
              ),
            ],
          ),
        );
      } else {
        AppSnackBar.showSuccess(context, LocaleController.instance.locale.languageCode == 'vi' ? 'Ứng dụng đã là phiên bản mới nhất' : 'App is up to date');
      }
    } catch (e) {
      Navigator.of(context, rootNavigator: true).pop();
      AppSnackBar.showError(context, LocaleController.instance.locale.languageCode == 'vi' ? 'Kiểm tra cập nhật thất bại' : 'Failed to check updates');
    }
  }

  bool _isVersionNewer(String latest, String current) {
    List<int> toInts(String v) => v.split(RegExp(r'[\.-]')).map((s) => int.tryParse(RegExp(r'\d+').stringMatch(s) ?? '') ?? 0).toList();
    final a = toInts(latest);
    final b = toInts(current);
    final n = a.length > b.length ? a.length : b.length;
    for (int i = 0; i < n; i++) {
      final ai = i < a.length ? a[i] : 0;
      final bi = i < b.length ? b[i] : 0;
      if (ai > bi) return true;
      if (ai < bi) return false;
    }
    return false;
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
