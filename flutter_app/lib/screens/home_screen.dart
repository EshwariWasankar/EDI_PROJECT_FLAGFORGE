import 'dart:async';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'transfer_screen.dart';
import 'biometric_screen.dart';
import 'analytics_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Map<String, dynamic> features = {
    'new_transfer_ui': false,
    'biometric_login': false,
    'spending_analytics': false,
  };
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _fetchFeatures();
    // Refresh features every 3 seconds for snappy demo experience
    _timer = Timer.periodic(const Duration(seconds: 3), (timer) {
      _fetchFeatures();
    });
  }
  
  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _fetchFeatures() async {
    final fetchedFeatures = await ApiService.getFeatures();
    if (mounted && fetchedFeatures.isNotEmpty) {
      setState(() {
        features = fetchedFeatures;
      });
    }
  }

  void _openTransfer() {
    bool isNewUi = features['new_transfer_ui'] == true;
    if (isNewUi) {
      ApiService.logUsage('new_transfer_ui');
      Navigator.push(context, MaterialPageRoute(builder: (context) => const TransferScreen()));
    } else {
      // Old UI
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Transfer (Legacy UI)'),
          content: const Text('This is the standard, old transfer layout. Enable new_transfer_ui to see the premium experience.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
          ],
        ),
      );
    }
  }

  void _openAnalytics() {
    bool hasAnalytics = features['spending_analytics'] == true;
    if (hasAnalytics) {
      ApiService.logUsage('spending_analytics');
      Navigator.push(context, MaterialPageRoute(builder: (context) => const AnalyticsScreen()));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Premium Spending Analytics is not enabled for your account.')),
      );
    }
  }

  void _openSettings() {
    bool hasBiometric = features['biometric_login'] == true;
    if (hasBiometric) {
      ApiService.logUsage('biometric_login');
      Navigator.push(context, MaterialPageRoute(builder: (context) => const BiometricScreen()));
    } else {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Settings'),
          content: const Text('Basic settings. Enable biometric_login flag for advanced security options.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        elevation: 0,
        backgroundColor: const Color(0xFFF8FAFC),
        title: Row(
          children: [
            CircleAvatar(
              backgroundColor: const Color(0xFF3B82F6).withOpacity(0.2),
              child: const Text('JD', style: TextStyle(color: Color(0xFF3B82F6), fontWeight: FontWeight.bold)),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text('Good Morning,', style: TextStyle(fontSize: 12, color: Colors.black54)),
                Text('John Doe', style: TextStyle(fontSize: 16, color: Colors.black87, fontWeight: FontWeight.bold)),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined, color: Colors.black87),
            onPressed: () {},
          ),
          IconButton(
            icon: const Icon(Icons.settings_outlined, color: Colors.black87),
            onPressed: _openSettings,
          )
        ],
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Balance Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF1E3A8A), Color(0xFF3B82F6)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(color: const Color(0xFF3B82F6).withOpacity(0.3), blurRadius: 20, offset: const Offset(0, 10)),
                  ]
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Total Balance', style: TextStyle(color: Colors.white70, fontSize: 14)),
                    const SizedBox(height: 8),
                    const Text('₹1,24,500.00', style: TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: const [
                        Text('**** **** **** 4291', style: TextStyle(color: Colors.white70, fontSize: 14, letterSpacing: 2)),
                        Icon(Icons.credit_card, color: Colors.white70),
                      ],
                    )
                  ],
                ),
              ),
              
              const SizedBox(height: 32),
              
              // Quick Actions
              const Text('Quick Actions', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87)),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildActionBtn(Icons.send_rounded, 'Send', Colors.blue, _openTransfer),
                  _buildActionBtn(Icons.account_balance_wallet, 'Receive', Colors.purple, () {}),
                  _buildActionBtn(Icons.payment, 'Bills', Colors.orange, () {}),
                  _buildActionBtn(Icons.more_horiz, 'More', Colors.grey, () {}),
                ],
              ),
              
              const SizedBox(height: 32),
              
              // Feature Flag Driven Analytics
              if (features['spending_analytics'] == true) ...[
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Monthly Overview', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87)),
                    TextButton(onPressed: _openAnalytics, child: const Text('See All'))
                  ],
                ),
                const SizedBox(height: 12),
                InkWell(
                  onTap: _openAnalytics,
                  child: Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.purple.withOpacity(0.1)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(color: Colors.purple.withOpacity(0.1), shape: BoxShape.circle),
                          child: const Icon(Icons.insights, color: Colors.purple),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: const [
                              Text('Spending Analytics', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                              Text('You spent ₹42k this month', style: TextStyle(color: Colors.black54, fontSize: 13)),
                            ],
                          ),
                        ),
                        const Icon(Icons.chevron_right, color: Colors.black26),
                      ],
                    ),
                  ),
                ),
              ] else ...[
                 // Dummy transaction list if flag is off
                 const Text('Recent Activity', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87)),
                 const SizedBox(height: 16),
                 _buildListTile('Netflix', 'Yesterday', '-₹649.00', Icons.movie),
                 _buildListTile('Salary', '2 days ago', '+₹85,000.00', Icons.work),
              ]
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActionBtn(IconData icon, String label, Color color, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [BoxShadow(color: color.withOpacity(0.1), blurRadius: 10, offset: const Offset(0, 4))],
            ),
            child: Icon(icon, color: color, size: 28),
          ),
          const SizedBox(height: 8),
          Text(label, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
        ],
      ),
    );
  }

  Widget _buildListTile(String title, String subtitle, String trailing, IconData icon) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
      child: Row(
        children: [
          Icon(icon, color: Colors.black54),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                Text(subtitle, style: const TextStyle(color: Colors.black54, fontSize: 12)),
              ],
            ),
          ),
          Text(trailing, style: TextStyle(fontWeight: FontWeight.bold, color: trailing.startsWith('+') ? Colors.green : Colors.black87)),
        ],
      ),
    );
  }
}
