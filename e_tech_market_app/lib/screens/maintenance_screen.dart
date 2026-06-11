import 'package:flutter/material.dart';

import 'auth/login_screen.dart';

class MaintenanceScreen extends StatelessWidget {
  const MaintenanceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFAF1EB),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),
              const Icon(Icons.build_circle_outlined, size: 100, color: Color(0xFFF26522)),
              const SizedBox(height: 24),
              const Text(
                'Bảo trì hệ thống',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFFEF7A45)),
              ),
              const SizedBox(height: 16),
              const Text(
                'E-Tech Market đang được nâng cấp để mang lại trải nghiệm tốt hơn. Vui lòng quay lại sau nhé!',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 16, color: Colors.black54, height: 1.5),
              ),
              const Spacer(),
              TextButton(
                onPressed: () {
                  Navigator.of(context).pushReplacement(
                    MaterialPageRoute(builder: (_) => const LoginScreen()),
                  );
                },
                child: const Text('Đăng nhập Quản trị viên', style: TextStyle(color: Color(0xFF6B7280))),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
