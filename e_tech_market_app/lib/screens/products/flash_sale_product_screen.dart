import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import '../../services/flash_sale_service.dart';
import '../../utils/network_utils.dart';
import 'product_detail_screen.dart';

class FlashSaleProductScreen extends StatefulWidget {
  const FlashSaleProductScreen({super.key});
  @override
  State<FlashSaleProductScreen> createState() => _FlashSaleProductScreenState();
}

class _FlashSaleProductScreenState extends State<FlashSaleProductScreen> {
  List<Map<String, dynamic>> _allSales = [];
  int _currentSaleIndex = 0;
  bool _isLoading = true;
  String? _error;
  int _hours = 0, _minutes = 0, _seconds = 0;
  Timer? _timer;
  String _searchQuery = '';
  String _sortBy = 'popular';
  bool _isSearching = false;
  final _searchCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();

  Map<String, dynamic>? _sale;

  List<dynamic> get _items {
    var items = (_sale?['items'] as List<dynamic>?)
            ?.where((i) => i != null && i['product'] != null)
            .toList() ??
        [];
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      items = items.where((i) {
        final p = i['product'] as Map<String, dynamic>? ?? {};
        final v = i['variant'] as Map<String, dynamic>?;
        return (p['name']?.toString().toLowerCase() ?? '').contains(q) ||
            (v?['variant_name']?.toString().toLowerCase() ?? '').contains(q);
      }).toList();
    }
    items.sort((a, b) {
      final da = _disc(a), db = _disc(b);
      switch (_sortBy) {
        case 'discount':
          return db.compareTo(da);
        case 'priceAsc':
          return _sp(a).compareTo(_sp(b));
        case 'priceDesc':
          return _sp(b).compareTo(_sp(a));
        default:
          return (b['sold_quantity'] as num? ?? 0)
              .compareTo(a['sold_quantity'] as num? ?? 0);
      }
    });
    return items;
  }

  double _sp(dynamic i) =>
      double.tryParse(i['flash_sale_price']?.toString() ?? '0') ?? 0;
  double _op(dynamic i) {
    final v = i['variant'] as Map<String, dynamic>?;
    return double.tryParse(
            (v?['price'] ?? i['product']?['price'])?.toString() ?? '0') ??
        0;
  }

  int _disc(dynamic i) {
    final o = _op(i), s = _sp(i);
    return o > 0 ? ((1 - s / o) * 100).round() : 0;
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _searchCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final data = await FlashSaleService.fetchCurrentFlashSale();
      if (!mounted) return;
      if (data is List)
        _allSales = data.whereType<Map<String, dynamic>>().toList();
      else if (data is Map<String, dynamic>) _allSales = [data];

      final now = DateTime.now().millisecondsSinceEpoch;
      int activeIdx = _allSales.indexWhere((s) {
        final st = DateTime.tryParse(
                    (s['start_at'] ?? '').toString().replaceAll(' ', 'T'))
                ?.millisecondsSinceEpoch ??
            0;
        final en = DateTime.tryParse(
                    (s['end_at'] ?? '').toString().replaceAll(' ', 'T'))
                ?.millisecondsSinceEpoch ??
            0;
        return now >= st && now <= en;
      });

      _currentSaleIndex = activeIdx != -1 ? activeIdx : 0;
      if (_allSales.isNotEmpty) _sale = _allSales[_currentSaleIndex];

      setState(() => _isLoading = false);
      if (_allSales.isNotEmpty) _startTimer();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  String _status(Map<String, dynamic> s) {
    final now = DateTime.now().millisecondsSinceEpoch;
    final st =
        DateTime.tryParse((s['start_at'] ?? '').toString().replaceAll(' ', 'T'))
                ?.millisecondsSinceEpoch ??
            0;
    final en =
        DateTime.tryParse((s['end_at'] ?? '').toString().replaceAll(' ', 'T'))
                ?.millisecondsSinceEpoch ??
            0;
    if (now >= st && now <= en) return 'active';
    return now < st ? 'upcoming' : 'ended';
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted || _sale == null) return;
      final st = _status(_sale!);
      final key = st == 'upcoming' ? 'start_at' : 'end_at';
      final t =
          DateTime.tryParse((_sale![key] ?? '').toString().replaceAll(' ', 'T'))
                  ?.millisecondsSinceEpoch ??
              0;
      final d = t - DateTime.now().millisecondsSinceEpoch;
      if (d <= 0) {
        if (_allSales.length > 1 && _currentSaleIndex < _allSales.length - 1) {
          _currentSaleIndex++;
          _sale = _allSales[_currentSaleIndex];
          _startTimer();
        } else {
          setState(() {
            _hours = 0;
            _minutes = 0;
            _seconds = 0;
            _sale = null;
          });
          _timer?.cancel();
        }
        return;
      }
      setState(() {
        _hours = (d ~/ 3600000) % 24;
        _minutes = (d ~/ 60000) % 60;
        _seconds = (d ~/ 1000) % 60;
      });
    });
  }

  String _f(int v) => v.toString().padLeft(2, '0');
  String _fp(double p) => p.toStringAsFixed(0).replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.');
  String _fdt(String d) {
    final t = DateTime.tryParse(d.replaceAll(' ', 'T'));
    return t == null
        ? ''
        : '${t.day}/${t.month} ${t.hour}:${t.minute.toString().padLeft(2, '0')}';
  }

  void _nav(Map<String, dynamic> item) {
    final p = item['product'] as Map<String, dynamic>? ?? {};
    final v = item['variant'] as Map<String, dynamic>?;
    final slug = p['slug']?.toString() ?? '';
    if (slug.isEmpty) return;
    Navigator.push(
        context,
        MaterialPageRoute(
            builder: (_) => ProductDetailScreen(
                slug: slug,
                variantId: v?['id']?.toString(),
                flashSalePrice:
                    double.tryParse(item['flash_sale_price']?.toString() ?? ''),
                showFlashSale: true)));
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) return _loading();
    if (_error != null) return _errWidget();
    final st = _sale != null ? _status(_sale!) : 'ended';
    if (_allSales.isEmpty || st == 'ended') return _empty();
    return Scaffold(
        backgroundColor: Theme.of(context).colorScheme.surface,
        body: CustomScrollView(controller: _scrollCtrl, slivers: [
          _appBar(),
          SliverToBoxAdapter(child: _banner(st)),
          if (_allSales.length > 1) SliverToBoxAdapter(child: _progInfo(st)),
          SliverToBoxAdapter(child: _sortBar()),
          _grid(st),
          const SliverToBoxAdapter(child: SizedBox(height: 32)),
        ]));
  }

  // --- Loading / Error / Empty ---
  Widget _loading() => const Scaffold(
      backgroundColor: Color(0xFF121212),
      body: Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
        CircularProgressIndicator(color: const Color(0xFFF26522), strokeWidth: 3),
        SizedBox(height: 16),
        Text('\u0110ang t\u1EA3i Flash Sale...',
            style: TextStyle(color: Color(0xFFE4BEB4), fontSize: 14)),
      ])));

  Widget _errWidget() => Scaffold(
      backgroundColor: const Color(0xFF121212),
      appBar: AppBar(
          backgroundColor: Colors.transparent, foregroundColor: Colors.white),
      body: Center(
          child: Text('L\u1ED7i: $_error',
              style: const TextStyle(color: Colors.redAccent))));

  Widget _empty() => Scaffold(
      backgroundColor: const Color(0xFFF9F9FC),
      appBar: AppBar(
          backgroundColor: Colors.transparent,
          foregroundColor: Colors.black87,
          elevation: 0),
      body: Center(
          child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Container(
                    padding: const EdgeInsets.all(20),
                    decoration: const BoxDecoration(
                        color: Color(0xFFFFF3E0), shape: BoxShape.circle),
                    child: const Icon(Icons.flash_on,
                        size: 48, color: Color(0xFFFF5722))),
                const SizedBox(height: 24),
                const Text('Ch\u01B0a C\u00F3 Flash Sale',
                    style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF1A1C1E))),
                const SizedBox(height: 12),
                const Text(
                    'H\u00E3y quay l\u1EA1i sau!\nCh\u00FAng t\u00F4i s\u1EBD s\u1EDBm c\u00F3 nh\u1EEFng \u01B0u \u0111\u00E3i s\u1ED1c d\u00E0nh ri\u00EAng cho b\u1EA1n.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                        color: Color(0xFF5B4039), fontSize: 14, height: 1.6)),
                const SizedBox(height: 28),
                ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1A1C1E),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 32, vertical: 14),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12))),
                    child: const Text('Về trang chủ',
                        style: TextStyle(fontWeight: FontWeight.w700))),
              ]))));

  // --- App Bar ---
  Widget _appBar() => SliverAppBar(
        floating: true,
        snap: true,
        elevation: 0,
        backgroundColor:  Colors.red,
        foregroundColor: Theme.of(context).colorScheme.onSurface,
        title: _isSearching
            ? TextField(
                controller: _searchCtrl,
                autofocus: true,
                style: const TextStyle(color: Colors.white, fontSize: 16),
                cursorColor: const Color(0xFFFF5722),
                decoration: InputDecoration(
                  hintText: 'Tìm sản phẩm flash sale...',
                  hintStyle: TextStyle(
                      color: Colors.white.withValues(alpha: 0.5), fontSize: 15),
                  border: InputBorder.none,
                ),
                onChanged: (v) => setState(() => _searchQuery = v),
              )
            : const Text('⚡ FLASH SALE',
                style: TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 18,
                    letterSpacing: 1)),
        actions: [
          if (_isSearching)
            IconButton(
              icon: const Icon(Icons.close, size: 24),
              onPressed: () => setState(() {
                _isSearching = false;
                _searchQuery = '';
                _searchCtrl.clear();
              }),
            )
          else
            IconButton(
              icon: const Icon(Icons.search, size: 24),
              onPressed: () => setState(() => _isSearching = true),
            ),
        ],
      );

  // --- Banner ---
  Widget _banner(String st) => Container(
      width: double.infinity,
      decoration: BoxDecoration(
        image: const DecorationImage(
          image: AssetImage('assets/images/flash_sale_banner_bg.png'),
          fit: BoxFit.cover,
          alignment: Alignment.center,
        ),
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            const Color(0xFF121212).withValues(alpha: 0.0),
            const Color(0xFF121212).withValues(alpha: 0.0)
          ],
        ),
      ),
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              const Color(0xFF121212).withValues(alpha: 0.72),
              const Color(0xFF1A0A00).withValues(alpha: 0.80),
            ],
          ),
        ),
        child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 36),
            child: Column(children: [
              Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                const Icon(Icons.flash_on, color: Color(0xFFFF2424), size: 36),
                const SizedBox(width: 10),
                Flexible(
                    child: Text(
                  _allSales.length == 1
                      ? (_sale?['name']?.toString() ?? 'FLASH SALE')
                      : 'FLASH SALE',
                  style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFFE5E2E1),
                      letterSpacing: 1.5),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                )),
              ]),
              const SizedBox(height: 12),
              Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  child: Text(
                      'Hệ thống thương mại tốc độ cao của E-Tech Market mang đến cho bạn những sản phẩm độc quyền với mức giá đột phá.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                          color: Color(0xFFE4BEB4),
                          fontSize: 13,
                          height: 1.5))),
              const SizedBox(height: 24),
              _timerRow(),
              if (_allSales.length > 1) ...[
                const SizedBox(height: 20),
                _progBtns()
              ],
              const SizedBox(height: 24),
            ])),
      ));

  Widget _timerRow() =>
      Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        _tBox(_hours, 'GIỜ'),
        _tSep(),
        _tBox(_minutes, 'PHÚT'),
        _tSep(),
        _tBox(_seconds, 'GIÂY'),
      ]);

  Widget _tBox(int v, String l) => Column(children: [
        ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                child: Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                        color: const Color(0xFF1E1E1E).withValues(alpha: 0.6),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                            color: Colors.white.withValues(alpha: 0.08)),
                        boxShadow: [
                          BoxShadow(
                              color: const Color(0xFFFF5722)
                                  .withValues(alpha: 0.3),
                              blurRadius: 24)
                        ]),
                    alignment: Alignment.center,
                    child: Text(_f(v),
                        style: const TextStyle(
                            fontFamily: 'monospace',
                            fontSize: 32,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFFFF5722)))))),
        const SizedBox(height: 6),
        Text(l,
            style: const TextStyle(
                fontSize: 9,
                fontWeight: FontWeight.w600,
                color: Color(0xFFE4BEB4),
                letterSpacing: 1)),
      ]);

  Widget _tSep() => Padding(
      padding: const EdgeInsets.only(bottom: 22, left: 8, right: 8),
      child: Text(':',
          style: TextStyle(
              fontFamily: 'monospace',
              fontSize: 32,
              fontWeight: FontWeight.w700,
              color: const Color(0xFFFF5722).withValues(alpha: 0.4))));

  Widget _progBtns() => SizedBox(
      height: 70,
      child: ListView.separated(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 4),
          itemCount: _allSales.length,
          separatorBuilder: (_, __) => const SizedBox(width: 10),
          itemBuilder: (_, i) {
            final s = _allSales[i];
            final a = i == _currentSaleIndex;
            final st = _status(s);
            return GestureDetector(
                onTap: () => setState(() {
                      _currentSaleIndex = i;
                      _sale = _allSales[i];
                      _startTimer();
                    }),
                child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 18, vertical: 10),
                    decoration: BoxDecoration(
                        color: a
                            ? const Color(0xFFFF5722)
                            : const Color(0xFF201F1F),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                            color: a
                                ? const Color(0xFFFF5722)
                                : const Color(0xFF5B4039)
                                    .withValues(alpha: 0.3)),
                        boxShadow: [
                          BoxShadow(
                              color: const Color(0xFFFF5722)
                                  .withValues(alpha: a ? 0.4 : 0.15),
                              blurRadius: 16)
                        ]),
                    child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(s['name']?.toString() ?? 'Flash Sale',
                              style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: a
                                      ? Colors.white
                                      : const Color(0xFFE5E2E1)),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis),
                          const SizedBox(height: 3),
                          Text(
                              '${st == 'active' ? 'Kết thúc: ' : 'Bắt đầu: '}${_fdt(s['end_at']?.toString() ?? '')}',
                              style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w600,
                                  color: a
                                      ? Colors.white.withValues(alpha: 0.9)
                                      : const Color(0xFFE4BEB4))),
                        ])));
          }));

  // --- Program Info ---
  Widget _progInfo(String st) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          border: Border(
              bottom: BorderSide(
                  color: const Color(0xFFE4BEB4).withValues(alpha: 0.3)))),
      child: Row(children: [
        const Icon(Icons.flash_on, color: Color(0xF5FC351B), size: 22),
        const SizedBox(width: 8),
        Expanded(
            child: Text(_sale?['name']?.toString() ?? '',
                style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: Theme.of(context).colorScheme.onSurface))),
        Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
                color: const Color(0xFFFA2D00),
                borderRadius: BorderRadius.circular(8)),
            child: Text(
                '${st == 'active' ? 'Kết thức: ' : 'Bắt đầu: '}${_fdt(_sale?['end_at']?.toString() ?? '')}',
                style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFFFAF9F8)))),
      ]));

  // --- Sort Bar ---
  Widget _sortBar() {
    const s = [
      {'k': 'popular', 'l': 'Bán chạy'},
      {'k': 'priceAsc', 'l': 'Giá tăng dần'},
      {'k': 'discount', 'l': 'Giảm nhiều nhất'},
      {'k': 'priceDesc', 'l': 'Mới nhất'}
    ];
    return Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
                children: s.map((x) {
              final a = _sortBy == x['k'];
              return Padding(
                  padding: const EdgeInsets.only(right: 10),
                  child: GestureDetector(
                      onTap: () => setState(() => _sortBy = x['k']!),
                      child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 20, vertical: 9),
                          decoration: BoxDecoration(
                              color: a ? const Color(0xFFFF5722) : Theme.of(context).colorScheme.surface,
                              borderRadius: BorderRadius.circular(999),
                              border: Border.all(
                                  color: a
                                      ? const Color(0xFFFF5722)
                                      : const Color(0xFFE4BEB4))),
                          child: Text(x['l']!,
                              style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                  color: a
                                      ? Colors.white
                                      : Theme.of(context).colorScheme.onSurface)))));
            }).toList())));
  }

  // --- Product Grid ---
  Widget _grid(String st) {
    final items = _items;
    if (items.isEmpty)
      return SliverToBoxAdapter(
          child: Padding(
              padding: const EdgeInsets.all(40),
              child: Center(
                  child: Text(
                      _searchQuery.isNotEmpty
                          ? 'Không tìm thấy sản phẩm nào'
                          : 'Không có sản phẩm',
                      style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontSize: 14)))));
    return SliverPadding(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        sliver: SliverGrid(
            delegate: SliverChildBuilderDelegate(
                (_, i) => _card(items[i] as Map<String, dynamic>, st),
                childCount: items.length),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 0.47,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10)));
  }

  Widget _card(Map<String, dynamic> item, String st) {
    final p = item['product'] as Map<String, dynamic>? ?? {};
    final v = item['variant'] as Map<String, dynamic>?;
    final nm = v != null
        ? '${p['name']} - ${v['variant_name'] ?? ''}'
        : p['name']?.toString() ?? '';
    final img = v?['image_url'] != null
        ? NetworkUtils.fixDeviceUrl(v!['image_url'].toString())
        : p['main_image_url'] != null
            ? NetworkUtils.fixDeviceUrl(p['main_image_url'].toString())
            : '';
    final sp = _sp(item), op = _op(item), d = _disc(item);
    final sold = (item['sold_quantity'] as num?)?.toInt() ?? 0;
    final lim = (item['quantity_limit'] as num?)?.toInt() ?? 100;
    final pct = lim > 0 ? (sold / lim * 100).clamp(0.0, 100.0) : 0.0;
    final hot = pct >= 80;
    final isSoldOut = lim > 0 && sold >= lim;

    return GestureDetector(
        onTap: isSoldOut ? null : () => _nav(item),
        child: Opacity(
            opacity: isSoldOut ? 0.6 : 1.0,
            child: Container(
                decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    borderRadius: BorderRadius.circular(5),
                    border: Border.all(
                        color: hot
                            ? const Color(0xFFBC0000).withValues(alpha: 0.3)
                            : const Color(0xFFE4BEB4).withValues(alpha: 0.3)),
                    boxShadow: [
                      BoxShadow(
                          color: Colors.black.withValues(alpha: 0.04),
                          blurRadius: 6,
                          offset: const Offset(0, 2))
                    ]),
                child:
                    Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Stack(children: [
                    AspectRatio(
                        aspectRatio: 1,
                        child: ClipRRect(
                            borderRadius: const BorderRadius.vertical(
                                top: Radius.circular(5)),
                            child: Container(
                                color: Theme.of(context).colorScheme.surface,
                                padding: const EdgeInsets.all(0),
                                child: img.isNotEmpty
                                    ? Image.network(img,
                                        fit: BoxFit.contain,
                                        errorBuilder: (_, __, ___) => const Icon(
                                            Icons.image_not_supported,
                                            color: Colors.grey,
                                            size: 40))
                                    :  Icon(Icons.image_not_supported,
                                        color: Theme.of(context).colorScheme.surface, size: 40)))),
                    if (d > 0)
                      Positioned(
                          top: 0,
                          left: 0,
                          child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 6, vertical: 4),
                              decoration: const BoxDecoration(
                                  color: Color(0xFFFF2424),
                                  borderRadius: BorderRadius.only(
                                      topLeft: Radius.circular(5),
                                      bottomRight: Radius.circular(8))),
                              child: Text('-$d%',
                                  style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700)))),
                    if (isSoldOut)
                      Positioned.fill(
                        child: Container(
                          color: Colors.black.withValues(alpha: 0.5),
                          alignment: Alignment.center,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.7),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text('ĐÃ BÁN HẾT', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                          ),
                        ),
                      ),
                  ]),
                  Expanded(
                      child: Padding(
                          padding: const EdgeInsets.all(8),
                          child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(nm,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        height: 1.3,
                                        color: Theme.of(context).colorScheme.onSurface)),
                                // Description
                                const SizedBox(height: 5),
                                Text('${_fp(sp)}\u0111',
                                    style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w700,
                                        color: Color(0xFFFF5722))),
                                if (op > 0)
                                  Text('${_fp(op)}\u0111',
                                      style: const TextStyle(
                                          fontSize: 10,
                                          color: Color(0xFFD7D7D7),
                                          decoration: TextDecoration.lineThrough,
                                          decorationThickness: 2.0,
                                          decorationColor: Color(0xFFC4C4C4))),
                                Builder(builder: (_) {
                                  final desc = p['description']?.toString() ?? '';
                                  return desc.isNotEmpty
                                      ? Padding(
                                          padding: const EdgeInsets.only(top: 4),
                                          child: Text(desc,
                                              maxLines: 2,
                                              overflow: TextOverflow.ellipsis,
                                              style: TextStyle(
                                                  fontSize: 11,
                                                  color: Theme.of(context).colorScheme.onSurface)),
                                        )
                                      : const SizedBox.shrink();
                                }),
    
                                const SizedBox(height: 10),
                                _prog(pct, hot, sold, st),
                                const SizedBox(height: 10),
                                Container(
                                    width: double.infinity,
                                    padding:
                                        const EdgeInsets.symmetric(vertical: 8),
                                    decoration: BoxDecoration(
                                        color: isSoldOut ? Colors.grey : const Color(0xFFFF5722),
                                        borderRadius: BorderRadius.circular(5),
                                        boxShadow: [
                                          BoxShadow(
                                              color: (isSoldOut ? Colors.grey : const Color(0xFFFF5722))
                                                  .withValues(alpha: 0.4),
                                              blurRadius: 10,
                                              offset: const Offset(0, 3))
                                        ]),
                                    child: Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Icon(isSoldOut ? Icons.remove_shopping_cart : Icons.shopping_cart_outlined,
                                              color: Colors.white, size: 14),
                                          const SizedBox(width: 4),
                                          Text(isSoldOut ? 'HẾT HÀNG' : 'MUA NGAY',
                                              style: const TextStyle(
                                                  color: Colors.white,
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.w700)),
                                        ])),
                              ]))),
                ]))));
  }

  Widget _prog(double pct, bool hot, int sold, String st) =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text(
              st == 'upcoming'
                  ? 'Ch\u01B0a m\u1EDF b\u00E1n'
                  : sold == 0
                      ? 'V\u1EEBa m\u1EDF b\u00E1n'
                      : '\u0110\u00E3 b\u00E1n $sold',
              style: TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.w700,
                  color:
                      hot ? const Color(0xFFFA0606) : const Color(0xFFFD6A25))),
          Text(hot ? 'CH\u00C1Y H\u00C0NG!' : 'C\u00F2n h\u00E0ng',
              style: const TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFFBC0000))),
        ]),
        const SizedBox(height: 3),
        ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: SizedBox(
                height: 3,
                child: LinearProgressIndicator(
                    value: pct / 100,
                    backgroundColor:
                        const Color(0xFFE4BEB4).withValues(alpha: 0.3),
                    valueColor: AlwaysStoppedAnimation(hot
                        ? const Color(0xFFBC0000)
                        : const Color(0xFFFF5722))))),
      ]);
}
