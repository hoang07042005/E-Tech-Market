import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ThemeController extends ChangeNotifier {
  ThemeController._();
  static final ThemeController _instance = ThemeController._();
  static ThemeController get instance => _instance;

  static const String _prefKeyIsDark = 'app_theme_is_dark';

  bool _isDark = false;
  bool _loaded = false;

  bool get isDark => _isDark;
  bool get loaded => _loaded;

  Future<void> _init() async {
    final prefs = await SharedPreferences.getInstance();
    _isDark = prefs.getBool(_prefKeyIsDark) ?? false;
    _loaded = true;
    notifyListeners();
  }

  void initialize() => _init();

  ThemeMode get themeMode => _isDark ? ThemeMode.dark : ThemeMode.light;

  Future<void> setDarkMode(bool value) async {
    _isDark = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_prefKeyIsDark, value);
    notifyListeners();
  }
}
