import 'dart:convert';
import 'package:flutter/material.dart';
import '../../../utils/network_utils.dart';
import '../../../config/api_config.dart';
import 'package:dio/dio.dart';
import '../../../config/dio_client.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:provider/provider.dart';
import '../../../providers/admin_dashboard_provider.dart';

class AdminDashboardScreen extends StatelessWidget {
  const AdminDashboardScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AdminDashboardProvider()..fetchDashboardData(),
      child: const _AdminDashboardView(),
    );
  }
}

class _AdminDashboardView extends StatelessWidget {
  const _AdminDashboardView({Key? key}) : super(key: key);

  String _formatVnd(dynamic value) {
    if (value == null) return '0';
    final val = value is num
        ? value.toDouble()
        : double.tryParse(value.toString()) ?? 0.0;
    return val
        .toStringAsFixed(0)
        .replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => '.');
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AdminDashboardProvider>();

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        title: const Text('Tổng quan hệ thống',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: Theme.of(context).colorScheme.surface,
        foregroundColor: Theme.of(context).colorScheme.onSurface,
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: Colors.grey.shade200, height: 1),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: provider.fetchDashboardData,
        child: _buildBody(context, provider),
      ),
    );
  }

  Widget _buildBody(BuildContext context, AdminDashboardProvider provider) {
    if (provider.isLoading) {
      return const Center(
          child: CircularProgressIndicator(color: Color(0xFFEF7A45)));
    }
    if (provider.error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text(provider.error!, style: const TextStyle(color: Colors.red)),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {
                provider.fetchDashboardData();
              },
              child: const Text('Thử lại'),
            ),
          ],
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
      children: [
        _buildAnalyticsSection(context, provider),
        const SizedBox(height: 20),
        _buildTopCategoriesSection(context, provider),
        const SizedBox(height: 20),
        _buildTopRatedProductsSection(context, provider),
        const SizedBox(height: 40),
        _buildPaymentGatewaysSection(context, provider),
        const SizedBox(height: 20),
      ],
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // 1. Phân tích & Thống kê (Line Chart + Summary)
  // ═══════════════════════════════════════════════════════════════
  Widget _buildAnalyticsSection(
      BuildContext context, AdminDashboardProvider provider) {
    final analytics =
        provider.dashboardData?['analytics'] as Map<String, dynamic>?;
    final revenue7d = (analytics?['revenue_7d'] as List<dynamic>?) ?? [];

    final kpi = provider.dashboardData?['kpi'] as Map<String, dynamic>?;
    final double revenue = kpi?['revenue_30d'] is num
        ? (kpi!['revenue_30d'] as num).toDouble()
        : 0.0;
    final int paidOrders = kpi?['paid_orders_30d'] ?? 0;
    final int todayOrders = kpi?['orders_today'] ?? 0;

    // Build chart data
    List<FlSpot> revenueSpots = [];
    List<FlSpot> ordersSpots = [];
    List<FlSpot> itemsSpots = [];
    List<String> labels = [];

    if (revenue7d.isNotEmpty) {
      for (int i = 0; i < revenue7d.length; i++) {
        final item = revenue7d[i] as Map<String, dynamic>;
        final val =
            item['value'] is num ? (item['value'] as num).toDouble() : 0.0;
        final ords =
            item['orders'] is num ? (item['orders'] as num).toDouble() : 0.0;
        final items = item['items_sold'] is num
            ? (item['items_sold'] as num).toDouble()
            : 0.0;

        revenueSpots.add(FlSpot(i.toDouble(), val / 1000000));
        ordersSpots.add(FlSpot(i.toDouble(), ords));
        itemsSpots.add(FlSpot(i.toDouble(), items));
        labels.add(item['label']?.toString() ?? '');
      }
    } else {
      labels = ['Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7', 'CN'];
      revenueSpots = [
        const FlSpot(0, 3.4),
        const FlSpot(1, 5.8),
        const FlSpot(2, 4.1),
        const FlSpot(3, 7.2),
        const FlSpot(4, 9.1),
        const FlSpot(5, 6.5),
        const FlSpot(6, 8.4)
      ];
      ordersSpots = [
        const FlSpot(0, 12),
        const FlSpot(1, 24),
        const FlSpot(2, 18),
        const FlSpot(3, 35),
        const FlSpot(4, 48),
        const FlSpot(5, 29),
        const FlSpot(6, 42)
      ];
      itemsSpots = [
        const FlSpot(0, 18),
        const FlSpot(1, 35),
        const FlSpot(2, 22),
        const FlSpot(3, 51),
        const FlSpot(4, 67),
        const FlSpot(5, 40),
        const FlSpot(6, 58)
      ];
    }

    final maxX = (labels.length - 1).toDouble();
    double maxRevenue = 1;
    for (var s in revenueSpots) {
      if (s.y > maxRevenue) maxRevenue = s.y;
    }
    double maxRight = 1;
    for (var s in ordersSpots) {
      if (s.y > maxRight) maxRight = s.y;
    }
    for (var s in itemsSpots) {
      if (s.y > maxRight) maxRight = s.y;
    }

    final double yMax = maxRevenue * 1.25;
    final double yInterval =
        (yMax / 4).ceilToDouble().clamp(1, double.infinity);
    final double rightMax = maxRight * 1.25;
    final double rightInterval =
        (rightMax / 4).ceilToDouble().clamp(1, double.infinity);

    // Smart X-axis label interval
    final int labelInterval =
        labels.length <= 7 ? 1 : (labels.length <= 14 ? 2 : 3);

    // Scale orders/items to fit left Y axis
    double scaleRight(double v) => rightMax > 0 ? v * (yMax / rightMax) : 0;

    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 10,
              offset: const Offset(0, 2))
        ],
        border: Border.all(
            color: Theme.of(context).colorScheme.outline, width: 0.15),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header + Legend
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Phân tích & Thống kê',
                    style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.onSurface)),
                const SizedBox(height: 4),
                Text('Hiệu suất doanh thu và số lượng giao dịch đơn hàng',
                    style: TextStyle(
                        fontSize: 11,
                        color: Theme.of(context).colorScheme.onSurface)),
                const SizedBox(height: 12),
                Row(
                  children: [
                    _legendDot(context, const Color(0xFF3B82F6), 'Doanh thu'),
                    const SizedBox(width: 16),
                    _legendDot(context, const Color(0xFFFB923C), 'Số đơn hàng'),
                    const SizedBox(width: 16),
                    _legendDot(context, const Color(0xFF10B981), 'SP bán ra'),
                  ],
                ),
              ],
            ),
          ),

          // Axis labels row
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('VND in Million',
                    style: TextStyle(
                        fontSize: 9,
                        color: Theme.of(context).colorScheme.onSurface,
                        fontWeight: FontWeight.w600)),
                Text('Số đơn hàng',
                    style: TextStyle(
                        fontSize: 9,
                        color: Theme.of(context).colorScheme.onSurface,
                        fontWeight: FontWeight.w600)),
              ],
            ),
          ),

          // Chart
          SizedBox(
            height: 240,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(4, 8, 4, 0),
              child: LineChart(
                LineChartData(
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
                    horizontalInterval: yInterval,
                    getDrawingHorizontalLine: (_) => FlLine(
                        color: Colors.grey.shade200,
                        strokeWidth: 0.8,
                        dashArray: [4, 4]),
                  ),
                  titlesData: FlTitlesData(
                    topTitles: const AxisTitles(
                        sideTitles: SideTitles(showTitles: false)),
                    rightTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 28,
                        interval: yInterval,
                        getTitlesWidget: (v, meta) {
                          if (v == meta.max || v == meta.min)
                            return const SizedBox.shrink();
                          final original =
                              rightMax > 0 ? v * (rightMax / yMax) : 0;
                          return Padding(
                            padding: const EdgeInsets.only(left: 4),
                            child: Text(original.toInt().toString(),
                                style: TextStyle(
                                    fontSize: 9,
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurface)),
                          );
                        },
                      ),
                    ),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 38,
                        interval: yInterval,
                        getTitlesWidget: (v, meta) {
                          if (v == meta.max || v == meta.min)
                            return const SizedBox.shrink();
                          return Padding(
                            padding: const EdgeInsets.only(right: 4),
                            child: Text('${v.toInt()}M',
                                style: TextStyle(
                                    fontSize: 9,
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurface)),
                          );
                        },
                      ),
                    ),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 26,
                        interval: 1,
                        getTitlesWidget: (v, _) {
                          final idx = v.toInt();
                          if (idx < 0 || idx >= labels.length)
                            return const SizedBox.shrink();
                          if (idx % labelInterval != 0 &&
                              idx != labels.length - 1)
                            return const SizedBox.shrink();
                          return Padding(
                            padding: const EdgeInsets.only(top: 6),
                            child: Text(labels[idx],
                                style: TextStyle(
                                    fontSize: 8,
                                    color:
                                        Theme.of(context).colorScheme.onSurface,
                                    fontWeight: FontWeight.w600)),
                          );
                        },
                      ),
                    ),
                  ),
                  borderData: FlBorderData(
                      show: true,
                      border: Border(
                          bottom: BorderSide(
                              color: Colors.grey.shade300, width: 0.8))),
                  minX: 0,
                  maxX: maxX,
                  minY: 0,
                  maxY: yMax,
                  lineTouchData: LineTouchData(
                    touchTooltipData: LineTouchTooltipData(
                      fitInsideHorizontally: true,
                      fitInsideVertically: true,
                      getTooltipItems: (spots) => spots.map((s) {
                        final c = s.bar.color ?? Colors.grey;
                        String label = '';
                        String val = '';

                        if (c == const Color(0xFF3B82F6)) {
                          label = 'Doanh thu: ';
                          val = '${_formatVnd(s.y * 1000000)} đ';
                        } else if (c == const Color(0xFFFB923C)) {
                          label = 'Đơn hàng: ';
                          val = rightMax > 0
                              ? (s.y * rightMax / yMax).round().toString()
                              : '0';
                        } else {
                          label = 'SP bán ra: ';
                          val = rightMax > 0
                              ? (s.y * rightMax / yMax).round().toString()
                              : '0';
                        }

                        return LineTooltipItem(
                            '$label$val',
                            TextStyle(
                                color: c,
                                fontWeight: FontWeight.bold,
                                fontSize: 11));
                      }).toList(),
                    ),
                  ),
                  lineBarsData: [
                    _line(revenueSpots, const Color(0xFF3B82F6)),
                    _line(
                        ordersSpots
                            .map((s) => FlSpot(s.x, scaleRight(s.y)))
                            .toList(),
                        const Color(0xFFFB923C)),
                    _line(
                        itemsSpots
                            .map((s) => FlSpot(s.x, scaleRight(s.y)))
                            .toList(),
                        const Color(0xFF10B981)),
                  ],
                ),
              ),
            ),
          ),

          // Summary
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('SUMMARY',
                    style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.onSurface,
                        letterSpacing: 1)),
                const SizedBox(height: 10),
                Row(
                  children: [
                    _summaryCol(context, 'Doanh thu',
                        '${_formatVnd(revenue)} đ', const Color(0xFF3B82F6)),
                    const SizedBox(width: 6),
                    _summaryCol(context, 'Đơn TT', paidOrders.toString(),
                        const Color(0xFFFB923C)),
                    const SizedBox(width: 6),
                    _summaryCol(context, 'Đơn ngày', todayOrders.toString(),
                        const Color(0xFF8B5CF6)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  LineChartBarData _line(List<FlSpot> spots, Color color) {
    return LineChartBarData(
      spots: spots,
      isCurved: true,
      color: color,
      barWidth: 2.5,
      isStrokeCapRound: true,
      dotData: FlDotData(
        show: true,
        getDotPainter: (_, __, ___, ____) => FlDotCirclePainter(
            radius: 3, color: Colors.white, strokeWidth: 2, strokeColor: color),
      ),
      belowBarData: BarAreaData(show: true, color: color.withOpacity(0.08)),
    );
  }

  Widget _legendDot(BuildContext context, Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
            width: 14,
            height: 3,
            decoration: BoxDecoration(
                color: color, borderRadius: BorderRadius.circular(2))),
        const SizedBox(width: 4),
        Text(label,
            style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: Theme.of(context).colorScheme.onSurface)),
      ],
    );
  }

  Widget _summaryCol(
      BuildContext context, String title, String value, Color accent) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.only(bottom: 4),
            decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: accent, width: 2))),
            child: Text(title,
                style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.onSurface)),
          ),
          const SizedBox(height: 6),
          Text(value,
              style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                  color: Theme.of(context).colorScheme.onSurface),
              maxLines: 1,
              overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. Danh mục bán chạy (Donut Pie + Grid)
  // ═══════════════════════════════════════════════════════════════
  Widget _buildTopCategoriesSection(
      BuildContext context, AdminDashboardProvider provider) {
    final categories = (provider.dashboardData?['analytics']
            ?['top_categories_30d'] as List<dynamic>?) ??
        [];

    final List<Color> catColors = [
      const Color(0xFF3B82F6),
      const Color(0xFF10B981),
      const Color(0xFFFB923C),
      const Color(0xFF8B5CF6),
      const Color(0xFFEC4899),
      const Color(0xFF06B6D4),
      const Color(0xFFF43F5E),
      const Color(0xFFEAB308),
      const Color(0xFF84CC16),
      const Color(0xFF14B8A6),
    ];

    List<PieChartSectionData> pieSections = [];
    if (categories.isEmpty) {
      pieSections.add(PieChartSectionData(
          value: 100,
          color: Colors.grey.shade300,
          radius: 25,
          showTitle: false));
    } else {
      for (int i = 0; i < categories.length; i++) {
        final cat = categories[i] as Map<String, dynamic>;
        final pct = cat['pct'] is num ? (cat['pct'] as num).toDouble() : 0.0;
        pieSections.add(PieChartSectionData(
            value: pct > 0 ? pct : 0.1,
            color: catColors[i % catColors.length],
            radius: 30,
            showTitle: false));
      }
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 10,
              offset: const Offset(0, 2))
        ],
        border: Border.all(
            color: Theme.of(context).colorScheme.outline, width: 0.15),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Danh mục bán chạy',
              style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.onSurface)),
          const SizedBox(height: 4),
          Text('Tỷ lệ doanh thu đóng góp của các danh mục sản phẩm hàng đầu',
              style: TextStyle(
                  fontSize: 11,
                  color: Theme.of(context).colorScheme.onSurface)),
          const SizedBox(height: 20),

          // Pie + List
          Column(
            children: [
              // Pie Chart
              Center(
                child: SizedBox(
                  height: 160,
                  width: 160,
                  child: Stack(
                    children: [
                      PieChart(PieChartData(
                          sectionsSpace: 3,
                          centerSpaceRadius: 45,
                          sections: pieSections)),
                      Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text('100%',
                                style: TextStyle(
                                    fontWeight: FontWeight.w900,
                                    fontSize: 18,
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurface)),
                            Text('DANH MỤC',
                                style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold,
                                    color:
                                        Theme.of(context).colorScheme.onSurface,
                                    letterSpacing: 0.5)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              // Category list
              categories.isEmpty
                  ? const Center(
                      child: Text('Chưa có dữ liệu',
                          style: TextStyle(color: Colors.grey)))
                  : LayoutBuilder(
                      builder: (context, constraints) {
                        final itemWidth = (constraints.maxWidth - 8) /
                            2; // 2 cột, khoảng cách 8px
                        return Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: categories.asMap().entries.map((entry) {
                            final idx = entry.key;
                            final cat = entry.value as Map<String, dynamic>;
                            final name = cat['name']?.toString() ?? 'Khác';
                            final pct = cat['pct'] is num
                                ? (cat['pct'] as num).toDouble()
                                : 0.0;
                            final color = catColors[idx % catColors.length];

                            return Container(
                              width: itemWidth,
                              clipBehavior: Clip
                                  .antiAlias, // Để thanh màu trái bo góc theo container
                              decoration: BoxDecoration(
                                color: Theme.of(context).colorScheme.surface,
                                borderRadius: BorderRadius.circular(5),
                                // Chỉ dùng viền đồng màu ở đây để không bị lỗi Flutter
                                border: Border.all(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurface
                                        .withOpacity(0.2),
                                    width: 0.5),
                              ),
                              child: IntrinsicHeight(
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment
                                      .stretch, // Kéo dài thanh màu trái hết chiều cao
                                  children: [
                                    // Thanh màu bên trái
                                    Container(width: 3.0, color: color),

                                    // Nội dung bên phải
                                    Expanded(
                                      child: Padding(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 8, vertical: 8),
                                        child: Row(
                                          children: [
                                            Expanded(
                                                child: Text(name,
                                                    style: TextStyle(
                                                        fontWeight:
                                                            FontWeight.w600,
                                                        fontSize: 11,
                                                        color: Theme.of(context)
                                                            .colorScheme
                                                            .onSurface),
                                                    maxLines: 1,
                                                    overflow:
                                                        TextOverflow.ellipsis)),
                                            const SizedBox(width: 4),
                                            Text('${pct.toStringAsFixed(0)}%',
                                                style: TextStyle(
                                                    fontWeight: FontWeight.w900,
                                                    fontSize: 11,
                                                    color: Theme.of(context)
                                                        .colorScheme
                                                        .onSurface)),
                                            const SizedBox(width: 4),
                                            Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                      horizontal: 4,
                                                      vertical: 1),
                                              decoration: BoxDecoration(
                                                  color: Theme.of(context)
                                                      .colorScheme
                                                      .surface,
                                                  border: Border.all(
                                                      color: Theme.of(context)
                                                          .colorScheme
                                                          .onSurface
                                                          .withOpacity(0.3)),
                                                  borderRadius:
                                                      BorderRadius.circular(3)),
                                              child: Text('Top ${idx + 1}',
                                                  style: TextStyle(
                                                      fontSize: 7,
                                                      fontWeight:
                                                          FontWeight.bold,
                                                      color: Theme.of(context)
                                                          .colorScheme
                                                          .onSurface
                                                          .withOpacity(0.6))),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }).toList(),
                        );
                      },
                    ),
            ],
          ),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. Top sản phẩm đánh giá cao
  // ═══════════════════════════════════════════════════════════════
  Widget _buildTopRatedProductsSection(
      BuildContext context, AdminDashboardProvider provider) {
    final products =
        (provider.dashboardData?['top_rated_products'] as List<dynamic>?) ?? [];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 10,
              offset: const Offset(0, 2))
        ],
        border: Border.all(
            color: Theme.of(context).colorScheme.outline, width: 0.15),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Top sản phẩm đánh giá cao',
              style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.onSurface)),
          const SizedBox(height: 4),
          Text('Dựa trên phản hồi khách hàng',
              style: TextStyle(
                  fontSize: 11,
                  color: Theme.of(context)
                      .colorScheme
                      .onSurface
                      .withOpacity(0.5))),
          const SizedBox(height: 16),
          if (products.isEmpty)
            Padding(
                padding: const EdgeInsets.all(16),
                child: Center(
                    child: Text('Chưa có dữ liệu đánh giá',
                        style: TextStyle(
                            color: Theme.of(context)
                                .colorScheme
                                .onSurface
                                .withOpacity(0.5)))))
          else
            ...products.map((p) {
              final prod = p as Map<String, dynamic>;
              final name = prod['name']?.toString() ?? 'Sản phẩm';
              final imageUrl = prod['main_image_url']?.toString();
              final rating = prod['avg_rating'] is num
                  ? (prod['avg_rating'] as num).toDouble()
                  : 0.0;
              final reviewsCount =
                  prod['reviews_count'] is int ? prod['reviews_count'] : 0;
              final int fullStars = rating.round().clamp(0, 5);

              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  border: Border.all(
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withOpacity(0.2)),
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: [
                    BoxShadow(
                        color: Colors.black.withOpacity(0.02),
                        blurRadius: 4,
                        offset: const Offset(0, 2))
                  ],
                ),
                child: Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: Container(
                        width: 50,
                        height: 50,
                        color: Colors.grey.shade100,
                        child: imageUrl != null && imageUrl.isNotEmpty
                            ? Image.network(NetworkUtils.fixDeviceUrl(imageUrl),
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => const Icon(
                                    Icons.image_not_supported,
                                    color: Colors.grey))
                            : const Icon(Icons.image_not_supported,
                                color: Colors.grey),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(name,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 13,
                                  color:
                                      Theme.of(context).colorScheme.onSurface)),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              // Star rating like React
                              Text(
                                '${'★' * fullStars}${'★' * (5 - fullStars)}',
                                style: TextStyle(
                                    fontSize: 12,
                                    color: fullStars > 0
                                        ? Colors.amber
                                        : Colors.grey.shade300),
                              ),
                              const SizedBox(width: 6),
                              Text(rating.toStringAsFixed(1),
                                  style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 12,
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onSurface)),
                              const SizedBox(width: 4),
                              Text('($reviewsCount)',
                                  style: TextStyle(
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onSurface
                                          .withOpacity(0.5),
                                      fontSize: 11)),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. Cổng thanh toán
  // ═══════════════════════════════════════════════════════════════
  Widget _buildPaymentGatewaysSection(
      BuildContext context, AdminDashboardProvider provider) {
    final payments =
        provider.settingsData?['payments'] as Map<String, dynamic>? ?? {};
    final bool momoEnabled = payments['momo']?['enabled'] == true;
    final bool vnpayEnabled = payments['vnpay']?['enabled'] == true;
    final bool codEnabled = payments['cod']?['enabled'] == true;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Cổng thanh toán',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 4),
        Text(
          'Quản lý các cổng thanh toán và phương thức giao dịch tích hợp.',
          style: TextStyle(
              fontSize: 12,
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6)),
        ),
        const SizedBox(height: 16),
        LayoutBuilder(
          builder: (context, constraints) {
            return Column(
              children: [
                _buildPaymentCard(
                  context: context,
                  provider: provider,
                  method: 'momo',
                  title: 'Ví Momo',
                  desc: 'Tích hợp ví điện tử phổ biến nhất Việt Nam.',
                  imagePath: 'assets/images/logo-momo.png',
                  enabled: momoEnabled,
                ),
                const SizedBox(height: 12),
                _buildPaymentCard(
                  context: context,
                  provider: provider,
                  method: 'vnpay',
                  title: 'Cổng VNPAY',
                  desc: 'Giải pháp thanh toán QR-Code và ATM nội địa.',
                  imagePath: 'assets/images/vnpay-logo.png',
                  enabled: vnpayEnabled,
                ),
                const SizedBox(height: 12),
                _buildPaymentCard(
                  context: context,
                  provider: provider,
                  method: 'cod',
                  title: 'COD (Thanh toán khi nhận)',
                  desc:
                      'Khách thanh toán tiền mặt cho shipper hoặc tại cửa hàng khi nhận hàng.\nGhi chú: Không cần Partner ID hay API — chỉ bật/tắt phương thức này cho đơn hàng.',
                  imagePath: 'assets/images/COD.png',
                  enabled: codEnabled,
                ),
              ],
            );
          },
        ),
      ],
    );
  }

  Widget _buildPaymentCard({
    required BuildContext context,
    required AdminDashboardProvider provider,
    required String method,
    required String title,
    required String desc,
    required String imagePath,
    required bool enabled,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
            color: Theme.of(context).colorScheme.outline.withOpacity(0.5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                width: 48,
                height: 48,
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Image.asset(imagePath, fit: BoxFit.contain),
              ),
              Switch(
                value: enabled,
                activeColor: Colors.white,
                activeTrackColor: Colors.green,
                inactiveThumbColor: Colors.white,
                inactiveTrackColor: Colors.grey.shade300,
                onChanged: (val) async {
                  final success =
                      await provider.updatePaymentGateway(method, val);
                  if (success) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text(
                              'Cập nhật trạng thái cổng thanh toán thành công',
                              style: TextStyle(color: Colors.white)),
                          backgroundColor: Colors.green,
                        ),
                      );
                    }
                  } else {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Có lỗi xảy ra, vui lòng thử lại',
                              style: TextStyle(color: Colors.white)),
                          backgroundColor: Colors.red,
                        ),
                      );
                    }
                  }
                },
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(title,
              style:
                  const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 4),
          Text(
            desc,
            style: TextStyle(
                fontSize: 12,
                color:
                    Theme.of(context).colorScheme.onSurface.withOpacity(0.6)),
          ),
        ],
      ),
    );
  }
}
