import 'package:flutter/material.dart';
import '../../services/auth_service.dart';
import '../../services/cart_service.dart';
import '../../services/checkout_service.dart';
import '../../services/voucher_service.dart';
import '../../utils/app_snackbar.dart';
import '../../utils/translation.dart';
import '../account/clause/payment_security_policy_screen.dart';
import 'payment_webview_screen.dart';
import 'payment_result_screen.dart';
import 'package:flutter/gestures.dart';
import '../../config/dio_client.dart';
import '../../config/api_config.dart';

class CheckoutScreen extends StatefulWidget {
  final List<CartItem>? selectedItems;

  const CheckoutScreen({Key? key, this.selectedItems}) : super(key: key);

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  CartState _cart = CartState.empty();
  bool _isLoading = true;
  bool _isSubmitting = false;
  String? _error;

  final TextEditingController _nameCtrl = TextEditingController();
  final TextEditingController _phoneCtrl = TextEditingController();
  final TextEditingController _addressCtrl = TextEditingController();
  final TextEditingController _notesCtrl = TextEditingController();
  final TextEditingController _couponCtrl = TextEditingController();

  PaymentAvailability _payAvail = const PaymentAvailability();
  List<ShippingMethod> _shippingMethods = [];
  List<ShippingZone> _shippingZones = [];
  ShippingPolicy? _shipPolicy;

  int? _selectedShipMethodId;
  int? _selectedShipZoneId;
  String _selectedPayment = 'cod';

  Map<String, dynamic>? _appliedCoupon;
  String? _couponError;
  bool _couponLoading = false;
  bool _acceptedPolicy = false;

  Map<String, dynamic>? _loyaltyData;
  int _pointsToUse = 0;
  final TextEditingController _pointsCtrl = TextEditingController();
  bool _hasAuth = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _addressCtrl.dispose();
    _notesCtrl.dispose();
    _couponCtrl.dispose();
    _pointsCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final user = await AuthService.getCurrentUser();
      if (user != null) {
        _hasAuth = true;
        _nameCtrl.text = user['name']?.toString() ?? '';
        _phoneCtrl.text = user['phone']?.toString() ?? '';

        final base = (user['address_line']?.toString() ?? '').trim();
        final ward = (user['ward']?.toString() ?? '').trim();
        final district = (user['district']?.toString() ?? '').trim();
        final province = (user['province']?.toString() ?? '').trim();

        final parts =
            [ward, district, province].where((p) => p.isNotEmpty).toList();

        if (base.isEmpty && parts.isEmpty) {
          _addressCtrl.text = '';
        } else if (base.isEmpty) {
          _addressCtrl.text = parts.join(', ');
        } else if (parts.isEmpty) {
          _addressCtrl.text = base;
        } else {
          _addressCtrl.text = '$base, ${parts.join(', ')}';
        }
      }

      final cart = await CartService.fetchCart();
      final payAvail = await CheckoutService.fetchPaymentConfig();
      final shipData = await CheckoutService.fetchShippingConfig();
      
      Map<String, dynamic>? loyaltyData;
      if (_hasAuth) {
        loyaltyData = await CheckoutService.fetchLoyaltyData();
      }

      if (!mounted) return;

      setState(() {
        _cart = widget.selectedItems != null && widget.selectedItems!.isNotEmpty
            ? CartState(id: cart.id, items: widget.selectedItems!)
            : cart;
        _payAvail = payAvail;
        _loyaltyData = loyaltyData;

        if (shipData['policy'] != null) {
          _shipPolicy = ShippingPolicy.fromJson(shipData['policy']);
        }
        if (shipData['methods'] is List) {
          _shippingMethods = (shipData['methods'] as List)
              .map((e) => ShippingMethod.fromJson(e))
              .toList();
        }
        if (shipData['zones'] is List) {
          _shippingZones = (shipData['zones'] as List)
              .map((e) => ShippingZone.fromJson(e))
              .toList();
        }

        if (_selectedShipMethodId == null && _shippingMethods.isNotEmpty) {
          _selectedShipMethodId = _shippingMethods
              .firstWhere((m) => m.isActive,
                  orElse: () => _shippingMethods.first)
              .id;
        }
        if (_selectedShipZoneId == null && _shippingZones.isNotEmpty) {
          _selectedShipZoneId = _shippingZones
              .firstWhere((z) => z.isActive, orElse: () => _shippingZones.first)
              .id;
        }

        if (!_payAvail.isAvailable(_selectedPayment)) {
          if (_payAvail.cod)
            _selectedPayment = 'cod';
          else if (_payAvail.vnpay)
            _selectedPayment = 'vnpay';
          else if (_payAvail.momo) _selectedPayment = 'momo';
        }

        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  double get _totalPrice => _cart.totalPrice;

  bool get _isFreeShipping {
    if (_shipPolicy == null) return false;
    return _shipPolicy!.applyGlobal &&
        _shipPolicy!.freeShippingMin > 0 &&
        _totalPrice >= _shipPolicy!.freeShippingMin;
  }

  double get _shippingFee {
    if (_isFreeShipping) return 0;
    final method = _shippingMethods
        .cast<ShippingMethod?>()
        .firstWhere((m) => m?.id == _selectedShipMethodId, orElse: () => null);
    final zone = _shippingZones
        .cast<ShippingZone?>()
        .firstWhere((z) => z?.id == _selectedShipZoneId, orElse: () => null);
    return (method?.baseFee ?? 0) + (zone?.fee ?? 0);
  }

  double get _discountAmount => _toDouble(_appliedCoupon?['discount_amount']);

  double get _pointsDiscountAmount => _pointsToUse * 500.0;
  
  int get _maxPointsAllowed {
    final baseForPoints = (_totalPrice - _discountAmount + _shippingFee).clamp(0, double.infinity);
    return (baseForPoints * 0.20 / 500).floor();
  }

  double get _grandTotal =>
      (_totalPrice - _discountAmount + _shippingFee - _pointsDiscountAmount).clamp(0, double.infinity);

  void _applyPoints() {
    final points = int.tryParse(_pointsCtrl.text.trim()) ?? 0;
    final currentPoints = (_loyaltyData?['current_points'] as num?)?.toInt() ?? 0;
    final maxAllowed = _maxPointsAllowed;
    
    if (points <= 0) {
      AppSnackBar.showError(context, 'Số điểm không hợp lệ');
      return;
    }
    
    if (points > currentPoints) {
      AppSnackBar.showError(context, 'Bạn không đủ điểm');
      return;
    }
    
    if (points > maxAllowed) {
      AppSnackBar.showError(context, 'Chỉ được dùng tối đa $maxAllowed điểm cho đơn hàng này');
      return;
    }
    
    setState(() {
      _pointsToUse = points;
      _pointsCtrl.clear();
      FocusScope.of(context).unfocus();
    });
  }
  
  void _removePoints() {
    setState(() {
      _pointsToUse = 0;
      _pointsCtrl.clear();
    });
  }

  Future<void> _applyCoupon() async {
    final code = _couponCtrl.text.trim();
    if (code.isEmpty) return;

    setState(() {
      _couponLoading = true;
      _couponError = null;
    });

    try {
      final res = await CheckoutService.applyCoupon(
        code: code,
        orderAmount: _totalPrice,
      );
      if (!mounted) return;
      setState(() {
        _appliedCoupon = {
          'code': code,
          'discount_amount': res['discount_amount'] ?? 0,
        };
        _couponCtrl.clear();
        _couponLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _appliedCoupon = null;
        _couponError = e.toString().replaceFirst('Exception: ', '');
        _couponLoading = false;
      });
    }
  }

  void _removeCoupon() {
    setState(() {
      _appliedCoupon = null;
      _couponCtrl.clear();
      _couponError = null;
    });
  }

  Future<void> _submitOrder() async {
    if (_cart.items.isEmpty) {
      AppSnackBar.showError(context, Trans.emptyCartError);
      return;
    }
    if (_nameCtrl.text.trim().isEmpty ||
        _phoneCtrl.text.trim().isEmpty ||
        _addressCtrl.text.trim().isEmpty) {
      AppSnackBar.showError(context, Trans.fillFullInfo);
      return;
    }

    setState(() {
      _isSubmitting = true;
      _error = null;
    });

    try {
      final items = _cart.items
          .map((i) => {
                'product_id': i.productId,
                'variant_id': i.variantId,
                'quantity': i.quantity,
              })
          .toList();

      final orderRes = await CheckoutService.createOrder(
        shippingName: _nameCtrl.text.trim(),
        shippingPhone: _phoneCtrl.text.trim(),
        shippingAddress: _addressCtrl.text.trim(),
        notes: _notesCtrl.text.trim(),
        couponCode: _appliedCoupon?['code']?.toString(),
        paymentMethod: _selectedPayment,
        items: items,
        shippingMethodId: _selectedShipMethodId,
        shippingZoneId: _selectedShipZoneId,
        pointsUsed: _pointsToUse,
      );

      final orderId = _toInt(orderRes['id']);
      final orderCode = orderRes['order_code']?.toString() ?? '';

      void navigateToResult(bool isSuccess) {
        if (isSuccess) {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (_) => PaymentResultScreen(
                isSuccess: true,
                orderCode: orderCode,
                orderId: orderId,
              ),
            ),
          );
        } else {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => PaymentResultScreen(
                isSuccess: false,
                orderCode: orderCode,
                orderId: orderId,
              ),
            ),
          );
        }
      }

      if (_selectedPayment == 'cod') {
        // success
        await CartService.removeItems(_cart.items, currentCart: _cart);
        if (!mounted) return;
        navigateToResult(true);
        return;
      }

      // online payment
      final payUrl = await CheckoutService.createPaymentLink(
        paymentMethod: _selectedPayment,
        orderId: orderId,
      );

      if (payUrl.isNotEmpty) {
        final resultUrl = await Navigator.push<String?>(
          context,
          MaterialPageRoute(
            builder: (context) => PaymentWebViewScreen(url: payUrl),
          ),
        );

        if (!mounted) return;

        if (resultUrl != null && resultUrl.isNotEmpty) {
          // Bắn background request tới backend để xử lý IPN cập nhật trạng thái đơn hàng (do WebView bị intercept)
          // TRÁNH dùng Uri.parse().toString() vì Dart sẽ re-encode query string làm hỏng chữ ký vnp_SecureHash.
          try {
            String fixedUrl = resultUrl;
            final baseUri = Uri.parse(ApiConfig.apiBaseUrl);
            final uri = Uri.parse(resultUrl);

            // Chỉ replace phần origin (scheme + authority)
            if (uri.host == 'localhost' ||
                uri.host == '127.0.0.1' ||
                uri.host.startsWith('192.168.') ||
                uri.host.startsWith('10.')) {
              final origin = '${uri.scheme}://${uri.authority}';
              final targetOrigin = '${baseUri.scheme}://${baseUri.authority}';
              fixedUrl = resultUrl.replaceFirst(origin, targetOrigin);
            }

            // Gửi GET request để kích hoạt callback cập nhật DB
            await DioClient.instance.get(fixedUrl);
          } catch (e) {
            // Có thể phớt lờ lỗi này vì backend xử lý xong sẽ quăng 302 Redirect về frontend dev server, gây lỗi mạng ở App
          }

          final uri = Uri.parse(resultUrl);
          final vnpResponseCode = uri.queryParameters['vnp_ResponseCode'];
          final momoResultCode = uri.queryParameters['resultCode'];

          bool isSuccess = false;
          if (vnpResponseCode != null) {
            isSuccess = vnpResponseCode == '00';
          } else if (momoResultCode != null) {
            isSuccess = momoResultCode == '0';
          }

          if (isSuccess) {
            await CartService.removeItems(_cart.items, currentCart: _cart);
            if (!mounted) return;
            navigateToResult(true);
          } else {
            await CheckoutService.cancelOrder(orderId);
            if (!mounted) return;
            navigateToResult(false);
          }
        } else {
          // User manually closed the webview using the 'X' button
          final result = await showDialog<bool>(
            context: context,
            barrierDismissible: false,
            builder: (ctx) => AlertDialog(
              title: Text(Trans.closePaymentTitle,
                  style: TextStyle(fontWeight: FontWeight.bold)),
              content: Text(Trans.closePaymentMessage),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx, false),
                  child: Text(Trans.cancelOrderButton,
                      style: TextStyle(color: Colors.red)),
                ),
                ElevatedButton(
                  onPressed: () => Navigator.pop(ctx, true),
                  style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFF26522),
                      foregroundColor: Colors.white),
                  child: Text(Trans.paidButton),
                ),
              ],
            ),
          );

          if (result == true) {
            await CartService.removeItems(_cart.items, currentCart: _cart);
            if (!mounted) return;
            navigateToResult(true);
          } else {
            await CheckoutService.cancelOrder(orderId);
            if (!mounted) return;
            navigateToResult(false);
          }
        }
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
      });
      AppSnackBar.showError(context, _error!);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  void _showVoucherModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          height: MediaQuery.of(ctx).size.height * 0.7,
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
          ),
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(Trans.selectCoupon,
                        style: TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 18)),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              Expanded(
                child: FutureBuilder(
                  future: VoucherService.fetchMyCoupons(),
                  builder: (ctx, snap) {
                    if (snap.connectionState == ConnectionState.waiting) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    if (snap.hasError) {
                      return Center(child: Text('Lỗi: ${snap.error}'));
                    }
                    final vouchers = snap.data ?? [];
                    if (vouchers.isEmpty) {
                      return const Center(
                          child: Text('Bạn chưa có mã giảm giá nào.'));
                    }
                    return ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: vouchers.length,
                      itemBuilder: (ctx, index) {
                        final v = vouchers[index] as Map<String, dynamic>;
                        final code = v['code']?.toString() ?? '';
                        final type = v['coupon_type'];
                        final val = v['value'];
                        final min = v['min_order_amount'];
                        final endAt =
                            v['end_at']?.toString().split('T').first ?? '';

                        final valStr = type == 'percentage'
                            ? 'Giảm $val%'
                            : 'Giảm ${_formatCurrency(_toDouble(val))}';
                        final minStr = min != null
                            ? 'Đơn tối thiểu: ${_formatCurrency(_toDouble(min))}'
                            : '';

                        return Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.grey.shade200),
                            boxShadow: [
                              BoxShadow(
                                  color: Colors.black.withOpacity(0.05),
                                  blurRadius: 4,
                                  offset: const Offset(0, 2)),
                            ],
                          ),
                          child: InkWell(
                            onTap: () {
                              Navigator.pop(ctx);
                              _couponCtrl.text = code;
                              _applyCoupon();
                            },
                            child: Row(
                              children: [
                                Container(
                                  width: 80,
                                  height: 80,
                                  decoration: const BoxDecoration(
                                    color: Color(0xFFF26522),
                                    borderRadius: BorderRadius.only(
                                        topLeft: Radius.circular(8),
                                        bottomLeft: Radius.circular(8)),
                                  ),
                                  child: const Icon(Icons.local_activity,
                                      color: Colors.white, size: 32),
                                ),
                                Expanded(
                                  child: Padding(
                                    padding: const EdgeInsets.all(12),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(valStr,
                                            style: const TextStyle(
                                                fontWeight: FontWeight.bold,
                                                fontSize: 16)),
                                        if (minStr.isNotEmpty)
                                          Padding(
                                            padding:
                                                const EdgeInsets.only(top: 4),
                                            child: Text(minStr,
                                                style: const TextStyle(
                                                    color: Colors.grey,
                                                    fontSize: 13)),
                                          ),
                                        const SizedBox(height: 4),
                                        Row(
                                          mainAxisAlignment:
                                              MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(code,
                                                style: const TextStyle(
                                                    color: Color(0xFFF26522),
                                                    fontWeight:
                                                        FontWeight.bold)),
                                            if (endAt.isNotEmpty)
                                              Text('HSD: $endAt',
                                                  style: const TextStyle(
                                                      color: Colors.red,
                                                      fontSize: 12)),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: Text(Trans.checkoutTitle)),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null && _cart.items.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: Text(Trans.checkoutTitle)),
        body: Center(child: Text(_error!)),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Thanh toán',
            style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Theme.of(context).colorScheme.surface,
        foregroundColor: Theme.of(context).colorScheme.onSurface,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSectionTitle(Trans.shippingInfo),
            _buildTextField(Trans.fullName, _nameCtrl),
            _buildTextField(Trans.phone, _phoneCtrl,
                keyboardType: TextInputType.phone),
            _buildTextField(Trans.address, _addressCtrl,
                hintText: Trans.addressHint),
            _buildTextField(Trans.orderNote, _notesCtrl,
                maxLines: 3, hintText: Trans.noteHint),
            const SizedBox(height: 16),
            _buildShippingMethod(),
            const SizedBox(height: 24),
            _buildSectionTitle(Trans.paymentSection),
            _buildPaymentMethods(),
            const SizedBox(height: 24),
            const SizedBox(height: 8),
            Text(
                '${Trans.orderSummaryLabel} (${_cart.totalQuantity} ${Trans.productsCount})',
                style:
                    const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 16),
            _buildOrderSummary(),
            const SizedBox(height: 20),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 24,
                  height: 24,
                  child: Checkbox(
                    value: _acceptedPolicy,
                    onChanged: (v) =>
                        setState(() => _acceptedPolicy = v ?? false),
                    activeColor: const Color(0xFFF26522),
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: GestureDetector(
                    onTap: () =>
                        setState(() => _acceptedPolicy = !_acceptedPolicy),
                    child: RichText(
                      text: TextSpan(
                        style: TextStyle(
                          fontSize: 13,
                          color: Theme.of(context).colorScheme.onSurface,
                          height: 1.4,
                        ),
                        children: [
                          TextSpan(text: Trans.iHaveRead),
                          TextSpan(
                            text: Trans.paymentSecurityPolicy,
                            style: const TextStyle(
                              fontSize: 13,
                              color: Color(0xFFF26522),
                              fontWeight: FontWeight.bold,
                              decoration: TextDecoration.underline,
                              decorationColor: Color(0xFFF26522),
                            ),
                            // Sử dụng TapGestureRecognizer để bắt sự kiện click riêng cho đoạn này
                            recognizer: TapGestureRecognizer()
                              ..onTap = () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) =>
                                        const PaymentSecurityPolicyScreen(),
                                  ),
                                );
                              },
                          ),
                          const TextSpan(text: ' của E-TECH MARKET.'),
                        ],
                      ),
                    ),
                  ),
                )
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed:
                    _isSubmitting || _cart.items.isEmpty || !_acceptedPolicy
                        ? null
                        : _submitOrder,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.error,
                  foregroundColor: Theme.of(context).colorScheme.onError,
                  disabledBackgroundColor:
                      Theme.of(context).colorScheme.surface,
                  side: BorderSide(
                    color: Theme.of(context).colorScheme.error,
                    width: 1,
                  ),
                ),
                child: _isSubmitting
                    ? CircularProgressIndicator(
                        color: Theme.of(context).colorScheme.error)
                    : Text(Trans.confirmOrder,
                        style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(width: 4, height: 16, color: const Color(0xFFF26522)),
          const SizedBox(width: 8),
          Text(title,
              style:
                  const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        ],
      ),
    );
  }

  Widget _buildTextField(String label, TextEditingController controller,
      {int maxLines = 1, TextInputType? keyboardType, String? hintText}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: const TextStyle(
                  color: Colors.grey,
                  fontSize: 12,
                  fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          TextField(
            controller: controller,
            maxLines: maxLines,
            keyboardType: keyboardType,
            decoration: InputDecoration(
              hintText: hintText,
              hintStyle: const TextStyle(color: Colors.grey, fontSize: 13),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide:
                    const BorderSide(color: Color(0xFFD1D5DB), width: 1.0),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide:
                    const BorderSide(color: Color(0xFFD1D5DB), width: 1.0),
              ),
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            ),
          ),
        ],
      ),
    );
  }

  void _showSelectionBottomSheet(
      {required String title, required List<Widget> items}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: ConstrainedBox(
            constraints: BoxConstraints(
                maxHeight: MediaQuery.of(context).size.height * 0.7),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(title,
                          style: const TextStyle(
                              fontSize: 16, fontWeight: FontWeight.bold)),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(ctx),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1, color: Color(0xFFE5E7EB)),
                Flexible(
                  child: ListView(
                    shrinkWrap: true,
                    children: items,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildDropdownField({
    required String hint,
    required String? valueText,
    required VoidCallback onTap,
  }) {
    // Lấy textTheme từ hệ thống để tự động đổi màu theo giao diện Sáng/Tối
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          // Đổi màu border: Sử dụng màu mờ nhẹ (onSurface với opacity) để trông tinh tế hơn ở cả 2 chế độ
          border: Border.all(
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.2)),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                valueText ?? hint,
                style: TextStyle(
                  fontSize: 13,
                  // SỬA Ở ĐÂY: Nếu valueText có giá trị, lấy màu chữ mặc định của hệ thống (Trắng ở Dark Mode, Đen ở Light Mode)
                  color: valueText == null
                      ? (isDarkMode
                          ? Colors.white38
                          : Colors.grey) // Màu của chữ hint
                      : Theme.of(context)
                          .colorScheme
                          .onSurface, // Màu chữ hiển thị khi đã chọn
                  fontWeight:
                      valueText == null ? FontWeight.normal : FontWeight.w500,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            // Thay đổi màu Icon mũi tên để nó sáng lên một chút khi ở chế độ tối
            Icon(Icons.keyboard_arrow_down,
                color: isDarkMode ? Colors.white60 : Colors.grey, size: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildShippingMethod() {
    var selectedZone;
    for (var z in _shippingZones) {
      if (z.id == _selectedShipZoneId) selectedZone = z;
    }
    final selectedZoneText = selectedZone != null
        ? '${selectedZone.name} (${_isFreeShipping ? Trans.freeShipping : '+${_formatCurrency(selectedZone.fee)}'})'
        : null;

    var selectedMethod;
    for (var m in _shippingMethods) {
      if (m.id == _selectedShipMethodId) selectedMethod = m;
    }
    final selectedMethodText = selectedMethod != null
        ? '${selectedMethod.name} ${selectedMethod.etaLabel}'
        : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(Trans.shippingMethodTitle,
            style: TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: _buildDropdownField(
                hint: Trans.zone,
                valueText: selectedZoneText,
                onTap: () {
                  _showSelectionBottomSheet(
                    title: 'Chọn khu vực giao hàng',
                    items: _shippingZones.map((z) {
                      final feeStr = _isFreeShipping
                          ? Trans.freeShipping
                          : '+${_formatCurrency(z.fee)}';
                      final isSelected = z.id == _selectedShipZoneId;
                      return ListTile(
                        title: Text('${z.name} ($feeStr)',
                            style: TextStyle(
                                fontSize: 14,
                                fontWeight: isSelected
                                    ? FontWeight.bold
                                    : FontWeight.normal,
                                color: isSelected
                                    ? const Color(0xFFF26522)
                                    : Theme.of(context).colorScheme.onSurface)),
                        trailing: isSelected
                            ? const Icon(Icons.check, color: Color(0xFFF26522))
                            : null,
                        onTap: () {
                          setState(() => _selectedShipZoneId = z.id);
                          Navigator.pop(context);
                        },
                        contentPadding:
                            const EdgeInsets.symmetric(horizontal: 20),
                      );
                    }).toList(),
                  );
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildDropdownField(
                hint: 'Phương thức',
                valueText: selectedMethodText,
                onTap: () {
                  _showSelectionBottomSheet(
                    title: 'Chọn phương thức giao hàng',
                    items: _shippingMethods.map((m) {
                      final isSelected = m.id == _selectedShipMethodId;
                      return ListTile(
                        title: Text('${m.name} ${m.etaLabel}',
                            style: TextStyle(
                                fontSize: 14,
                                fontWeight: isSelected
                                    ? FontWeight.bold
                                    : FontWeight.normal,
                                color: isSelected
                                    ? const Color(0xFFF26522)
                                    : Theme.of(context).colorScheme.onSurface)),
                        trailing: isSelected
                            ? const Icon(Icons.check, color: Color(0xFFF26522))
                            : null,
                        onTap: () {
                          setState(() => _selectedShipMethodId = m.id);
                          Navigator.pop(context);
                        },
                        contentPadding:
                            const EdgeInsets.symmetric(horizontal: 20),
                      );
                    }).toList(),
                  );
                },
              ),
            ),
          ],
        ),
        if (_isFreeShipping)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(Trans.shippingFeeLabel,
                style: const TextStyle(color: Colors.green)),
          ),
      ],
    );
  }

  Widget _buildPaymentMethods() {
    List<Widget> activeMethods = [];
    if (_payAvail.cod)
      activeMethods.add(Expanded(
          child: _paymentTile('cod', Trans.codLabel, 'assets/images/COD.png')));
    if (_payAvail.vnpay)
      activeMethods.add(Expanded(
          child: _paymentTile(
              'vnpay', Trans.vnpayLabel, 'assets/images/vnpay-logo.png')));
    if (_payAvail.momo)
      activeMethods.add(Expanded(
          child: _paymentTile(
              'momo', Trans.momoLabel, 'assets/images/logo-momo.png')));

    if (activeMethods.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.orange.withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Text(
            'Hiện tại tất cả phương thức thanh toán đang được bảo trì.',
            style: TextStyle(color: Colors.orange)),
      );
    }

    List<Widget> rows = [];
    for (int i = 0; i < activeMethods.length; i += 2) {
      if (i + 1 < activeMethods.length) {
        rows.add(Row(
          children: [
            activeMethods[i],
            const SizedBox(width: 12),
            activeMethods[i + 1],
          ],
        ));
      } else {
        rows.add(Row(
          children: [
            activeMethods[i],
            const SizedBox(width: 12),
            const Expanded(child: SizedBox()),
          ],
        ));
      }
      if (i + 2 < activeMethods.length) {
        rows.add(const SizedBox(height: 12));
      }
    }

    return Column(children: rows);
  }

  Widget _paymentTile(String value, String title, String imagePath) {
    final isSelected = _selectedPayment == value;
    return GestureDetector(
      onTap: () => setState(() => _selectedPayment = value),
      child: Container(
        height: 140,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          border: Border.all(
            color: isSelected ? const Color(0xFFF26522) : Colors.grey.shade200,
            width: isSelected ? 1.5 : 1.0,
          ),
          borderRadius: BorderRadius.circular(8),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: const Color(0xFFF26522).withOpacity(0.05),
                    blurRadius: 8,
                    offset: const Offset(0, 4),
                  )
                ]
              : null,
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Image.asset(
              imagePath,
              height: 60,
              fit: BoxFit.contain,
            ),
            const SizedBox(height: 12),
            Text(
              title,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 12,
                color: Theme.of(context).colorScheme.onSurface,
                height: 1.2,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderSummary() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ..._cart.items.map((i) => Padding(
              padding: const EdgeInsets.only(bottom: 24),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.surface,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    padding: const EdgeInsets.all(4),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: i.imageUrl != null
                          ? Image.network(i.imageUrl!, fit: BoxFit.cover)
                          : const Icon(Icons.image, color: Colors.grey),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          i.name,
                          style: TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 15,
                              height: 1.3,
                              color: Theme.of(context).colorScheme.onSurface),
                        ),
                        if (i.variantLabel != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(i.variantLabel!,
                                style: const TextStyle(
                                    fontSize: 14, color: Colors.grey)),
                          ),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('x${i.quantity}',
                                style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    color: Colors.grey,
                                    fontSize: 13)),
                            Text(_formatCurrency(i.unitPrice),
                                style: const TextStyle(
                                    color: Colors.grey,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 13)),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Text(
                          _formatCurrency(i.unitPrice * i.quantity),
                          style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              color: Color(0xFFF26522),
                              fontSize: 14),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            )),
        const SizedBox(height: 8),
        _summaryRow(Trans.subtotal, _formatCurrency(_totalPrice)),
        _summaryRow(
            Trans.shippingFee,
            _isFreeShipping
                ? Trans.freeShipping
                : _formatCurrency(_shippingFee),
            valueColor: const Color(0xFF16A34A)),
        if (_appliedCoupon != null)
          _summaryRow(Trans.discount, '-${_formatCurrency(_discountAmount)}',
              valueColor: const Color(0xFF16A34A)),
        if (_pointsToUse > 0)
          _summaryRow('Giảm giá (Điểm thưởng)', '-${_formatCurrency(_pointsDiscountAmount)}',
              valueColor: const Color(0xFF16A34A)),
        const SizedBox(height: 16),
        if (_hasAuth && _loyaltyData != null && (_loyaltyData!['current_points'] ?? 0) > 0)
          Container(
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Theme.of(context).colorScheme.outline, width: 0.15),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Điểm thưởng: ${_loyaltyData!['current_points']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                    const Text('1 điểm = 500đ', style: TextStyle(color: Colors.orange, fontSize: 13)),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: SizedBox(
                        height: 44,
                        child: TextField(
                          controller: _pointsCtrl,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                            hintText: 'Số điểm muốn dùng',
                            hintStyle: const TextStyle(color: Colors.grey, fontSize: 14),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: BorderSide(color: Colors.grey.shade300)),
                            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: BorderSide(color: Colors.grey.shade300)),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    SizedBox(
                      height: 44,
                      child: ElevatedButton(
                        onPressed: _applyPoints,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFFFEDD5),
                          foregroundColor: const Color(0xFFF26522),
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                        ),
                        child: const Text('Áp dụng', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
                if (_pointsToUse > 0) ...[
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Đã dùng $_pointsToUse điểm (-${_formatCurrency(_pointsDiscountAmount)})', style: const TextStyle(color: Color(0xFF16A34A), fontSize: 13)),
                      InkWell(
                        onTap: _removePoints,
                        child: const Text('Hủy', style: TextStyle(color: Colors.red, fontSize: 13, decoration: TextDecoration.underline)),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 4),
                Text('(Tối đa dùng $_maxPointsAllowed điểm cho đơn hàng này)', style: const TextStyle(color: Colors.grey, fontSize: 12)),
              ],
            ),
          ),
        if (_appliedCoupon == null)
          Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: SizedBox(
                      height: 44,
                      child: TextField(
                        controller: _couponCtrl,
                        decoration: InputDecoration(
                          hintText: Trans.couponCode,
                          hintStyle:
                              const TextStyle(color: Colors.grey, fontSize: 14),
                          contentPadding:
                              const EdgeInsets.symmetric(horizontal: 16),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(6),
                            borderSide: BorderSide(color: Colors.grey.shade300),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(6),
                            borderSide: BorderSide(color: Colors.grey.shade300),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  SizedBox(
                    height: 44,
                    child: ElevatedButton(
                      onPressed: _couponLoading ? null : _applyCoupon,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFFFEDD5),
                        foregroundColor: const Color(0xFFF26522),
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(6)),
                      ),
                      child: Text(Trans.apply,
                          style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                height: 44,
                child: OutlinedButton.icon(
                  onPressed: _showVoucherModal,
                  icon: const Icon(Icons.card_giftcard,
                      color: Color(0xFFF26522), size: 18),
                  label: Text(Trans.selectCoupon,
                      style: TextStyle(
                          color: Color(0xFFF26522),
                          fontWeight: FontWeight.bold)),
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(
                        color: const Color(0xFFF26522).withOpacity(0.5),
                        width: 1),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(6)),
                    backgroundColor: const Color(0xFFFFF9F2),
                  ),
                ),
              ),
            ],
          )
        else
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFFFFEDD5),
              borderRadius: BorderRadius.circular(6),
              border:
                  Border.all(color: const Color(0xFFF26522).withOpacity(0.3)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.local_activity,
                        color: Color(0xFFF26522), size: 18),
                    const SizedBox(width: 8),
                    Text('${_appliedCoupon!['code']}',
                        style: const TextStyle(
                            color: Color(0xFFF26522),
                            fontWeight: FontWeight.bold)),
                  ],
                ),
                InkWell(
                  onTap: _removeCoupon,
                  child: Text(Trans.removeCoupon,
                      style: TextStyle(
                          color: Colors.grey,
                          fontWeight: FontWeight.bold,
                          fontSize: 13)),
                ),
              ],
            ),
          ),
        if (_couponError != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(_couponError!,
                style: const TextStyle(color: Colors.red, fontSize: 12)),
          ),
        const SizedBox(height: 24),
        const Divider(height: 1, color: Color(0xFFEEEEEE)),
        const SizedBox(height: 16),
        _summaryRow(Trans.total, _formatCurrency(_grandTotal), isTotal: true),
      ],
    );
  }

  Widget _summaryRow(String label, String value,
      {bool isTotal = false, Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: isTotal ? 16 : 14,
                  color: Theme.of(context).colorScheme.onSurface)),
          Text(value,
              style: TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: isTotal ? 20 : 14,
                  color: valueColor ??
                      (isTotal
                          ? Colors.red
                          : Theme.of(context).colorScheme.onSurface))),
        ],
      ),
    );
  }
}

double _toDouble(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString().replaceAll(',', '') ?? '') ?? 0;
}

int _toInt(dynamic value) {
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}

String _formatCurrency(double value) {
  return '${value.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]}.')} đ';
}
