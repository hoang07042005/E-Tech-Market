import 'package:flutter/material.dart';

import '../../../services/auth_service.dart';
import '../../../utils/network_utils.dart';
import '../../../utils/translation.dart';
import 'edit_profile_screen.dart';
import '_purchased_products_widget.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Map<String, dynamic>? _user;

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    final user = await AuthService.getCurrentUser();
    if (mounted) {
      setState(() {
        _user = user;
      });
    }
  }

  String _getAvatarInitial() {
    final name = _user!['name'] as String?;
    if (name == null || name.isEmpty) return 'U';
    final parts = name.split(' ');
    if (parts.isEmpty) return 'U';
    final lastName = parts.last;
    if (lastName.isEmpty) return 'U';
    return lastName[0].toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    if (_user == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    String? avatarUrl = _user!['avatar_url'] as String?;
    if (avatarUrl != null && avatarUrl.isNotEmpty) {
      avatarUrl = NetworkUtils.fixDeviceUrl(avatarUrl);
    } else {
      avatarUrl = null;
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(Trans.profile),
        backgroundColor: Theme.of(context).colorScheme.surface,
        foregroundColor: Theme.of(context).colorScheme.onSurface,
        elevation: 0,
        centerTitle: true,
        actions: [
          TextButton(
            onPressed: () async {
              final result = await Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => EditProfileScreen(user: _user!)),
              );
              if (result == true) {
                _loadUser(); // reload if updated
              }
            },
            child: Text(
              Trans.edit,
              style: const TextStyle(
                color: Color(0xFFF26522),
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
          ),
        ],
      ),
      body: Container(
        color: Theme.of(context).colorScheme.surface,
        padding: const EdgeInsets.all(20),
        child: SingleChildScrollView(
          child: Column(
            children: [
              // Avatar
              Center(
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, 4)),
                    ],
                  ),
                  child: CircleAvatar(
                    radius: 50,
                    backgroundColor: const Color(0xFFEF7A45),
                    backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
                    onBackgroundImageError: avatarUrl != null ? (_, __) {} : null,
                    child: avatarUrl == null
                        ? Text(
                            _getAvatarInitial(),
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 36),
                          )
                        : null,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              _buildInfoCard(),
              const SizedBox(height: 16),
              const PurchasedProductsWidget(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoCard() {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(20),
      child: SingleChildScrollView(          
        child: Column(
          children: [
            _buildInfoRow(Trans.fullName, _user!['name'] ?? '—'),
            const Divider(height: 32, color: Colors.black12),
            _buildInfoRow(Trans.email, _user!['email'] ?? '—'),
            const Divider(height: 32, color: Colors.black12),
            _buildInfoRow(Trans.phone, _user!['phone'] ?? '—'),
            const Divider(height: 32, color: Colors.black12),
            _buildInfoRow(Trans.address, _buildAddress()),
          ],
        ),
      ),
    );
  }

  String _buildAddress() {
    final parts = [
      _user!['address_line'],
      _user!['ward'],
      _user!['district'],
      _user!['province'],
    ].where((p) => p != null && p.toString().trim().isNotEmpty).toList();

    if (parts.isEmpty) return '—';
    return parts.join(', ');
  }

  Widget _buildInfoRow(String label, String value) {
    final theme = Theme.of(context);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 100,
          child: Text(label, style: TextStyle(color: theme.colorScheme.onSurface.withValues(alpha: 0.6), fontSize: 14)),
        ),
        Expanded(
          child: Text(
            value,
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: theme.colorScheme.onSurface),
          ),
        ),
      ],
    );
  }
}


