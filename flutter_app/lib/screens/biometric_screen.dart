import 'package:flutter/material.dart';

class BiometricScreen extends StatefulWidget {
  const BiometricScreen({super.key});

  @override
  State<BiometricScreen> createState() => _BiometricScreenState();
}

class _BiometricScreenState extends State<BiometricScreen> {
  bool _isBiometricEnabled = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Security Settings', style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.black87),
      ),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.blue.withOpacity(0.1)),
                boxShadow: [
                  BoxShadow(color: Colors.blue.withOpacity(0.05), blurRadius: 20, offset: const Offset(0, 10)),
                ]
              ),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.blue.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.fingerprint, size: 64, color: Color(0xFF3B82F6)),
                  ),
                  const SizedBox(height: 24),
                  const Text('Biometric Authentication', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.black87)),
                  const SizedBox(height: 8),
                  const Text(
                    'Use your fingerprint or face to log in securely without a password.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.black54),
                  ),
                  const SizedBox(height: 32),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Enable Biometrics', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.black87)),
                      Switch(
                        value: _isBiometricEnabled,
                        activeColor: const Color(0xFF3B82F6),
                        onChanged: (val) {
                          setState(() { _isBiometricEnabled = val; });
                        },
                      )
                    ],
                  )
                ],
              ),
            ),
            const SizedBox(height: 20),
            _buildSettingTile('Change Password', Icons.lock_outline),
            const SizedBox(height: 12),
            _buildSettingTile('Two-Factor Authentication', Icons.security),
          ],
        ),
      ),
    );
  }

  Widget _buildSettingTile(String title, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Icon(icon, color: Colors.black54),
          const SizedBox(width: 16),
          Expanded(child: Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: Colors.black87))),
          const Icon(Icons.chevron_right, color: Colors.black26),
        ],
      ),
    );
  }
}
