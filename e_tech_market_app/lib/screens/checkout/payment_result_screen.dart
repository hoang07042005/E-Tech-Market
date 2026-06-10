import 'package:flutter/material.dart';

class PaymentResultScreen extends StatelessWidget {
  final bool isSuccess;
  final String orderCode;
  final int orderId;

  const PaymentResultScreen({
    Key? key,
    required this.isSuccess,
    required this.orderCode,
    required this.orderId,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final code = orderCode.isNotEmpty ? orderCode : '#$orderId';

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        backgroundColor: Theme.of(context).colorScheme.surface,
        elevation: 0,
        actions: [
          IconButton(
            icon: Icon(
              Icons.close, 
              color: Theme.of(context).colorScheme.onSurface, // Tự động đổi màu theo Sáng/Tối
            ),
            onPressed: () {
              if (isSuccess) {
                Navigator.popUntil(context, (route) => route.isFirst);
              } else {
                Navigator.pop(context);
              }
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const Spacer(),
              // Mascot Image
              Image.asset(
                isSuccess
                    ? 'assets/images/mascot_success.png'
                    : 'assets/images/mascot_fail.png',
                height: 200,
                errorBuilder: (context, error, stackTrace) {
                  return Image.asset(
                    'assets/images/mascot.png',
                    height: 200,
                    errorBuilder: (ctx, err, stack) => Icon(
                      isSuccess ? Icons.check_circle : Icons.error,
                      size: 150,
                      color: isSuccess
                          ? const Color(0xFF16A34A)
                          : const Color(0xFFDC2626),
                    ),
                  );
                },
              ),
              const SizedBox(height: 32),
              
              // Title
              Text(
                isSuccess ? 'Thanh toán thành công!' : 'Thanh toán thất bại',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                  color: isSuccess
                      ? const Color(0xFF16A34A)
                      : const Color(0xFFDC2626),
                ),
              ),
              const SizedBox(height: 16),
              
              // Subtitle
              Text(
                isSuccess
                    ? 'Cảm ơn bạn đã mua sắm tại E-Tech Market.\nĐơn hàng của bạn đã được thanh toán.'
                    : 'Vui lòng kiểm tra lại phương thức hoặc thử lại sau.\nGiỏ hàng của bạn vẫn được giữ nguyên.',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 16,
                  color: Color(0xFF64748B),
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 32),
              
              // Order Code Box
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 16),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: Theme.of(context).colorScheme.onSurface.withOpacity(0.1)
                  ),
                ),
                child: Column(
                  children: [
                    Text(
                      'Mã đơn hàng',
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      code,
                      style: TextStyle(
                        fontWeight: FontWeight.w900,
                        color: Theme.of(context).colorScheme.onSurface,
                        fontSize: 20,
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              
              // Action Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    if (isSuccess) {
                      Navigator.popUntil(context, (route) => route.isFirst);
                    } else {
                      Navigator.pop(context);
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isSuccess
                        ? const Color(0xFF16A34A)
                        : const Color(0xFFF26522),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 0,
                  ),
                  child: Text(
                    isSuccess ? 'Tiếp tục mua sắm' : 'Thử lại sau',
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 18,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
