import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LocaleController extends ChangeNotifier {
  LocaleController._();
  static final LocaleController _instance = LocaleController._();
  static LocaleController get instance => _instance;

  static const String _prefKeyLocale = 'app_locale';
  static const Locale _localeVi = Locale('vi');
  static const Locale _localeEn = Locale('en');

  static const List<Locale> supportedLocales = [
    _localeVi,
    _localeEn,
  ];

  Locale _locale = _localeVi;
  bool _loaded = false;

  Locale get locale => _locale;
  bool get loaded => _loaded;
  bool get isVietnamese => _locale.languageCode == 'vi';
  bool get isEnglish => _locale.languageCode == 'en';

  Future<void> _init() async {
    final prefs = await SharedPreferences.getInstance();
    final localeCode = prefs.getString(_prefKeyLocale) ?? 'vi';
    _locale = Locale(localeCode);
    _loaded = true;
    notifyListeners();
  }

  Future<void> initialize() => _init();

  Future<void> setLocale(Locale newLocale) async {
    if (_locale == newLocale) return;
    _locale = newLocale;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefKeyLocale, newLocale.languageCode);
    notifyListeners();
  }

  void toggleLocale() {
    if (isVietnamese) {
      setLocale(_localeEn);
    } else {
      setLocale(_localeVi);
    }
  }

  String getLanguageName() {
    return isVietnamese ? 'Tiếng Việt' : 'English';
  }
}