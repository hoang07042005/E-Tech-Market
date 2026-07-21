import 'dart:async';
import 'package:flutter/material.dart';

class FlashSaleBanner extends StatefulWidget {
  final String endAt;
  final int discountPercent;

  const FlashSaleBanner({required this.endAt, required this.discountPercent});

  @override
  State<FlashSaleBanner> createState() => FlashSaleBannerState();
}

class FlashSaleBannerState extends State<FlashSaleBanner> {
  late Timer _timer;
  String _hours = "00";
  String _minutes = "00";
  String _seconds = "00";

  @override
  void initState() {
    super.initState();
    _computeTime();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      _computeTime();
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  void _computeTime() {
    final endDate = DateTime.tryParse(widget.endAt);
    if (endDate == null) return;
    final distance = endDate.difference(DateTime.now());
    if (distance.isNegative) {
      if (mounted) {
        setState(() {
          _hours = "00";
          _minutes = "00";
          _seconds = "00";
        });
      }
      return;
    }

    final h = distance.inHours.toString().padLeft(2, '0');
    final m = (distance.inMinutes % 60).toString().padLeft(2, '0');
    final s = (distance.inSeconds % 60).toString().padLeft(2, '0');

    if (mounted) {
      setState(() {
        _hours = h;
        _minutes = m;
        _seconds = s;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 36,
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFFED1C24), Color(0xFFFA4B2A)],
        ),
        boxShadow: [
          BoxShadow(
              color: Colors.black12, offset: Offset(0, -2), blurRadius: 4),
        ],
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final width = constraints.maxWidth;
          return Stack(
            clipBehavior: Clip.none,
            children: [
              // Middle Block: Timer
              Positioned(
                left: width * 0.36,
                right: width * 0.24,
                top: 0,
                bottom: 0,
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text("KẾT THÚC SAU:",
                          style: TextStyle(
                              fontSize: 7.5,
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.2)),
                      const SizedBox(height: 1),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          buildTimeBox(_hours),
                          const SizedBox(width: 1),
                          const Text(":",
                              style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 8,
                                  fontWeight: FontWeight.bold)),
                          const SizedBox(width: 1),
                          buildTimeBox(_minutes),
                          const SizedBox(width: 1),
                          const Text(":",
                              style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 8,
                                  fontWeight: FontWeight.bold)),
                          const SizedBox(width: 1),
                          buildTimeBox(_seconds),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              // Left Block (Flash Sale) - 38% width, slanted right
              Positioned(
                left: -2,
                top: -3,
                bottom: 1,
                width: width * 0.38,
                child: CustomPaint(
                  painter: SlantLeftPainter(),
                  child: Container(
                    padding: const EdgeInsets.only(left: 3, top: 4),
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          const Icon(Icons.flash_on,
                              color: Color(0xFFFFEB3B), size: 14),
                          const SizedBox(width: 1),
                          const Text(
                            "FLASH\nSALE",
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w900,
                              fontSize: 10,
                              height: 1.05,
                              fontStyle: FontStyle.italic,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),

              // Right Block (Discount) - 26% width, slanted left
              Positioned(
                right: 0,
                top: -3,
                bottom: 1,
                width: width * 0.26,
                child: CustomPaint(
                  painter: SlantRightPainter(),
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.only(left: 4.0),
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Text(
                          "-${widget.discountPercent}%",
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget buildTimeBox(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 1),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(2),
      ),
      child: Text(
        text,
        style: const TextStyle(
          color: Color(0xFFCC0000),
          fontSize: 9,
          fontWeight: FontWeight.bold,
          height: 1.1,
        ),
      ),
    );
  }
}

class SlantLeftPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // shadow
    final shadowPaint = Paint()..color = const Color(0xFFFFEB3B);
    final shadowPath = Path()
      ..moveTo(2, 2)
      ..lineTo(size.width + 2, 2)
      ..lineTo(size.width * 0.85 + 2, size.height + 2)
      ..lineTo(2, size.height + 2)
      ..close();
    canvas.drawPath(shadowPath, shadowPaint);

    // main
    final paint = Paint()
      ..shader = const LinearGradient(
        colors: [Color(0xFFFF1A1A), Color(0xFFCC0000)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));

    final path = Path()
      ..lineTo(size.width, 0)
      ..lineTo(size.width * 0.85, size.height)
      ..lineTo(0, size.height)
      ..close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class SlantRightPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // shadow
    final shadowPaint = Paint()..color = const Color(0xFFFFEB3B);
    final shadowPath = Path()
      ..moveTo(size.width * 0.25 - 2, 2)
      ..lineTo(size.width - 2, 2)
      ..lineTo(size.width - 2, size.height + 2)
      ..lineTo(-2, size.height + 2)
      ..close();
    canvas.drawPath(shadowPath, shadowPaint);

    // main
    final paint = Paint()
      ..shader = const LinearGradient(
        colors: [Color(0xFFFFB800), Color(0xFFFF8800)],
        begin: Alignment.centerLeft,
        end: Alignment.centerRight,
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));

    final path = Path()
      ..moveTo(size.width * 0.25, 0)
      ..lineTo(size.width, 0)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class StockBar extends StatelessWidget {
  final bool isFlashSale;
  final int? flashSaleSold;
  final int? flashSaleLimit;
  final int? normalStock;

  const StockBar({
    required this.isFlashSale,
    this.flashSaleSold,
    this.flashSaleLimit,
    this.normalStock,
  });

  @override
  Widget build(BuildContext context) {
    if (isFlashSale) {
      if (flashSaleLimit == null || flashSaleLimit == 0) return const SizedBox();
      final sold = flashSaleSold ?? 0;
      final limit = flashSaleLimit!;
      final pct = (sold / limit * 100).clamp(0, 100).toDouble();

      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "Đã bán $sold/$limit",
                style: const TextStyle(
                  color: Color(0xFFFF4B2B),
                  fontWeight: FontWeight.w600,
                  fontSize: 10,
                ),
              ),
              Text(
                "${pct.round()}%",
                style: const TextStyle(
                  color: Color(0xFF999999),
                  fontSize: 10,
                ),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Container(
            height: 4,
            decoration: BoxDecoration(
              color: const Color(0xFFF0F0F0),
              borderRadius: BorderRadius.circular(99),
            ),
            alignment: Alignment.centerLeft,
            child: LayoutBuilder(
              builder: (context, constraints) {
                return Container(
                  width: constraints.maxWidth * (pct / 100),
                  height: 4,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFFF4B2B), Color(0xFFF21B24)],
                    ),
                    borderRadius: BorderRadius.circular(99),
                  ),
                );
              },
            ),
          ),
        ],
      );
    } else {
      if (normalStock == null) return const SizedBox();
      final stock = normalStock!;
      final pct = (stock / 100 * 100).clamp(0, 100).toDouble(); // STOCK_MAX = 100
      final isOut = stock <= 0;
      final isLow = stock > 0 && stock <= 10;

      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                isOut 
                    ? "❌ Hết hàng" 
                    : isLow 
                        ? "⚠️ Sắp hết hàng (còn $stock)" 
                        : "Còn $stock sản phẩm",
                style: TextStyle(
                  color: isOut ? const Color(0xFF9E9E9E) : isLow ? const Color(0xFFE53E3E) : const Color(0xFFFF4B2B),
                  fontWeight: (isLow || isOut) ? FontWeight.w700 : FontWeight.w600,
                  fontSize: 10,
                ),
              ),
              Text(
                "${pct.round()}%",
                style: const TextStyle(
                  color: Color(0xFF999999),
                  fontSize: 10,
                ),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Container(
            height: 4,
            decoration: BoxDecoration(
              color: const Color(0xFFF0F0F0),
              borderRadius: BorderRadius.circular(99),
            ),
            alignment: Alignment.centerLeft,
            child: LayoutBuilder(
              builder: (context, constraints) {
                return Container(
                  width: constraints.maxWidth * (pct / 100),
                  height: 4,
                  decoration: BoxDecoration(
                    gradient: isOut
                        ? const LinearGradient(
                            colors: [Color(0xFFE0E0E0), Color(0xFFBDBDBD)],
                          )
                        : isLow
                            ? const LinearGradient(
                                colors: [Color(0xFFF59E0B), Color(0xFFE53E3E)],
                              )
                            : const LinearGradient(
                                colors: [Color(0xFF34D399), Color(0xFF059669)],
                              ),
                    borderRadius: BorderRadius.circular(99),
                  ),
                );
              },
            ),
          ),
        ],
      );
    }
  }
}
