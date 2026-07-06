import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'controllers/locale_controller.dart';
import 'l10n/app_localizations.dart';
import 'controllers/theme_controller.dart';
import 'screens/auth/login_screen.dart';
import 'screens/home_screen.dart';
import 'services/auth_service.dart';
import 'config/api_config.dart';

import 'screens/maintenance_screen.dart';
import 'services/store_service.dart';

/// Global navigator key — dùng để navigate từ bên ngoài widget tree (vd: DioClient interceptor)
final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ThemeController.instance.initialize();
  await LocaleController.instance.initialize();
  await ApiConfig.initialize(); // Tự động tìm IP server trong mạng LAN
  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  @override
  Widget build(BuildContext context) {
    final colorSchemeLight = ColorScheme.fromSeed(seedColor: Colors.blue);
    final colorSchemeDark = ColorScheme.fromSeed(
      seedColor: Colors.blue,
      brightness: Brightness.dark,
    );

    return ListenableBuilder(
      listenable: ThemeController.instance,
      builder: (context, _) {
        return ListenableBuilder(
          listenable: LocaleController.instance,
          builder: (context, _) {
            return MaterialApp(
              title: 'E-Tech Market',
              navigatorKey: navigatorKey,
              locale: LocaleController.instance.locale,
              supportedLocales: LocaleController.supportedLocales,
              localizationsDelegates: AppLocalizations.localizationsDelegates,
              theme: ThemeData(
                colorScheme: colorSchemeLight,
                useMaterial3: true,
              ),
              darkTheme: ThemeData(
                colorScheme: colorSchemeDark,
                useMaterial3: true,
              ),
              themeMode: ThemeController.instance.themeMode,
              home: const EntryPoint(),
            );
          },
        );
      },
    );
  }
}

class EntryPoint extends StatefulWidget {
  const EntryPoint({super.key});

  @override
  State<EntryPoint> createState() => _EntryPointState();
}

class _EntryPointState extends State<EntryPoint> {
  bool _initialized = false;
  bool _hasSession = false;
  bool _isAdmin = false;
  bool _isMaintenanceMode = false;

  @override
  void initState() {
    super.initState();
    _loadSession();
  }

  Future<void> _loadSession() async {
    bool isMaintenance = false;
    bool isAdmin = false;
    bool hasSession = false;

    await Future.wait([
      Future.delayed(const Duration(milliseconds: 1500)),
      Future(() async {
        try {
          final config = await StoreService.fetchConfig();
          isMaintenance = config['maintenance_mode'] == true;
        } catch (_) {}

        hasSession = await AuthService.hasSession();
        if (hasSession) {
          final user = await AuthService.getCurrentUser();
          if (user != null) {
            final roles = user['roles'];
            if (roles is List) {
              isAdmin = roles.any((r) => r is Map && r['slug'] == 'admin');
            }
          }
        }
      }),
    ]);

    if (mounted) {
      setState(() {
        _isMaintenanceMode = isMaintenance;
        _isAdmin = isAdmin;
        _initialized = true;
        _hasSession = hasSession;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_initialized) {
      return Scaffold(
        backgroundColor: Theme.of(context).colorScheme.surface,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Image.asset(
                Theme.of(context).brightness == Brightness.dark
                    ? 'assets/images/logo-trang.png'
                    : 'assets/images/logo.png',
                width: 220,
                fit: BoxFit.contain,
              ),
              const SizedBox(height: 16),
              Text(
                'Thế giới công nghệ trong tầm tay',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 48),
              const CircularProgressIndicator(color: Color(0xFFF26522)),
            ],
          ),
        ),
      );
    }

    if (_isMaintenanceMode && !_isAdmin) {
      return const MaintenanceScreen();
    }

    return const HomeScreen();
  }
}
