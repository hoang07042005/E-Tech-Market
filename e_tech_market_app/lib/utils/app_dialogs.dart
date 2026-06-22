import 'package:flutter/material.dart';
import '../screens/auth/login_screen.dart';

class AppDialogs {
  AppDialogs._();

  static void showLoginRequiredDialog(BuildContext context, {VoidCallback? onLoginSuccess}) {
    showDialog<void>(
      context: context,
      builder: (BuildContext dialogContext) {
        return AlertDialog(
          title: const Text('Yêu cầu đăng nhập'),
          content: const Text('Bạn cần đăng nhập để thực hiện chức năng này.'),
          actions: <Widget>[
            TextButton(
              child: const Text('Đóng', style: TextStyle(color: Colors.grey)),
              onPressed: () {
                Navigator.of(dialogContext).pop();
              },
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFF26522),
                foregroundColor: Colors.white,
              ),
              child: const Text('Đăng nhập ngay'),
              onPressed: () {
                Navigator.of(dialogContext).pop();
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                ).then((_) {
                  if (onLoginSuccess != null) {
                    onLoginSuccess();
                  }
                });
              },
            ),
          ],
        );
      },
    );
  }
}
