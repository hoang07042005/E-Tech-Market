import 'package:flutter/material.dart';

import 'controllers/theme_controller.dart';
import 'screens/auth/login_screen.dart';
import 'screens/home_screen.dart';
import 'services/auth_service.dart';

void main() {
  ThemeController.instance.initialize();
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
        return MaterialApp(
          title: '"'"'E-Tech Market'"'"',
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

  @override
  void initState() {
    super.initState();
    _loadSession();
  }

  Future<void> _loadSession() async {
    final hasSession = await AuthService.hasSession();
    if (mounted) {
      setState(() {
        _initialized = true;
        _hasSession = hasSession;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_initialized) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return _hasSession ? const HomeScreen() : const LoginScreen();
  }
}
