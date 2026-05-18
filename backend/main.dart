import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:intl/intl.dart';

// --- Configuration ---
const String backendUrl = "http://192.168.0.125:5000"; // Use your local IP

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const FlagForgeApp());
}

class FlagForgeApp extends StatelessWidget {
  const FlagForgeApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FlagForge Bank',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0A0C14),
          brightness: Brightness.dark,
          primary: const Color(0xFF22D3EE),
          surface: const Color(0xFF0F172A),
        ),
        scaffoldBackgroundColor: const Color(0xFF0A0C14),
        fontFamily: 'Inter',
      ),
      home: const MainNavigation(),
    );
  }
}

// --- State Management ---
class FeatureProvider extends ChangeNotifier {
  String deviceId = "";
  Map<String, bool> features = {
    'new_transfer_ui': false,
    'biometric_login': false,
    'spending_analytics': false,
  };
  Timer? _timer;

  FeatureProvider() {
    _initDevice();
  }

  Future<void> _initDevice() async {
    final prefs = await SharedPreferences.getInstance();
    deviceId = prefs.getString('device_id') ?? "dev_${DateTime.now().millisecondsSinceEpoch}";
    await prefs.setString('device_id', deviceId);
    
    await _register();
    _startPolling();
  }

  Future<void> _register() async {
    try {
      await http.post(
        Uri.parse('$backendUrl/register-device'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'device_id': deviceId, 'device_name': 'Mobile Demo User'}),
      );
    } catch (e) {
      debugPrint("Registration error: $e");
    }
  }

  void _startPolling() {
    _timer = Timer.periodic(const Duration(seconds: 5), (_) => fetchFeatures());
    fetchFeatures();
  }

  Future<void> fetchFeatures() async {
    try {
      final response = await http.get(Uri.parse('$backendUrl/get-features?device_id=$deviceId'));
      if (response.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(response.body);
        features = data.map((key, value) => MapEntry(key, value as bool));
        notifyListeners();
      }
    } catch (e) {
      debugPrint("Polling error: $e");
    }
  }

  Future<void> logUsage(String feature) async {
    try {
      await http.post(
        Uri.parse('$backendUrl/log-usage'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'device_id': deviceId,
          'feature_name': feature,
          'usage_status': 'used'
        }),
      );
    } catch (e) {
	  debugPrint("Logging error: $e");
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}

// --- UI Components ---

class MainNavigation extends StatefulWidget {
  const MainNavigation({super.key});

  @override
  State<MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<MainNavigation> {
  final FeatureProvider _provider = FeatureProvider();
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _provider,
      builder: (context, _) {
        return Scaffold(
          body: IndexedStack(
            index: _index,
            children: [
              HomeScreen(provider: _provider),
              const Center(child: Text("Cards")),
              _provider.features['spending_analytics']! 
                ? AnalyticsScreen(provider: _provider)
                : const Center(child: Text("Analytics Disabled (Check Dashboard)")),
              SettingsScreen(provider: _provider),
            ],
          ),
          bottomNavigationBar: BottomNavigationBar(
            currentIndex: _index,
            onTap: (i) => setState(() => _index = i),
            type: BottomNavigationBarType.fixed,
            backgroundColor: const Color(0xFF0F172A),
            selectedItemColor: const Color(0xFF22D3EE),
            unselectedItemColor: Colors.blueGrey.shade600,
            items: [
              const BottomNavigationBarItem(icon: Icon(Icons.home_filled), label: "Home"),
              const BottomNavigationBarItem(icon: Icon(Icons.credit_card), label: "Cards"),
              if (_provider.features['spending_analytics']!)
                const BottomNavigationBarItem(icon: Icon(Icons.bar_chart_rounded), label: "Spending"),
              const BottomNavigationBarItem(icon: Icon(Icons.settings), label: "Settings"),
            ],
          ),
        );
      },
    );
  }
}

class HomeScreen extends StatelessWidget {
  final FeatureProvider provider;
  const HomeScreen({super.key, required this.provider});

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      slivers: [
        SliverAppBar(
          expandedHeight: 120,
          backgroundColor: Colors.transparent,
          flexibleSpace: FlexibleSpaceBar(
            titlePadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            title: Row(
              children: [
                const CircleAvatar(radius: 18, backgroundColor: Colors.cyan, child: Icon(Icons.person, size: 20)),
                const SizedBox(width: 10),
                Text("Hi, Demo User", style: TextStyle(fontSize: 16, color: Colors.blueGrey.shade100)),
              ],
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Balance Card
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [Color(0xFF0891B2), Color(0xFF0E7490)]),
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [BoxShadow(color: Colors.cyan.withOpacity(0.3), blurRadius: 20, offset: const Offset(0, 10))],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text("Total Balance", style: TextStyle(color: Colors.white70)),
                      const SizedBox(height: 8),
                      const Text("\$12,450.00", style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white)),
                      const SizedBox(height: 24),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _QuickAction(
                            icon: Icons.send_rounded, 
                            label: "Transfer", 
                            onTap: () {
                              provider.logUsage('new_transfer_ui');
                              Navigator.push(context, MaterialPageRoute(builder: (c) => TransferScreen(provider: provider)));
                            }
                          ),
                          _QuickAction(icon: Icons.add_rounded, label: "Top Up", onTap: () {}),
                          _QuickAction(icon: Icons.history_rounded, label: "History", onTap: () {}),
                        ],
                      )
                    ],
                  ),
                ),
                const SizedBox(height: 32),
                const Text("Recent Transactions", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                _TransactionItem(icon: Icons.shopping_bag, title: "Apple Store", date: "Today", amount: "-\$1,299.00"),
                _TransactionItem(icon: Icons.coffee, title: "Starbucks", date: "Yesterday", amount: "-\$5.50"),
                _TransactionItem(icon: Icons.work, title: "Salary Deposit", date: "May 15", amount: "+\$4,500.00", isCredit: true),
              ],
            ),
          ),
        )
      ],
    );
  }
}

// --- Redesigned Features (Toggled) ---

class TransferScreen extends StatelessWidget {
  final FeatureProvider provider;
  const TransferScreen({super.key, required this.provider});

  @override
  Widget build(BuildContext context) {
    bool isNewUI = provider.features['new_transfer_ui']!;

    return Scaffold(
      appBar: AppBar(title: Text(isNewUI ? "Premium Transfer" : "Send Money")),
      body: isNewUI ? _NewTransferUI(provider: provider) : _OldTransferUI(),
    );
  }
}

class _NewTransferUI extends StatelessWidget {
  final FeatureProvider provider;
  const _NewTransferUI({required this.provider});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("Select Recipient", style: TextStyle(color: Colors.blueGrey.shade400)),
          const SizedBox(height: 16),
          SizedBox(
            height: 100,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                _RecipientCard(name: "Sarah", initial: "S", color: Colors.purple),
                _RecipientCard(name: "John", initial: "J", color: Colors.orange),
                _RecipientCard(name: "Mom", initial: "M", color: Colors.green),
              ],
            ),
          ),
          const SizedBox(height: 32),
          TextField(
            keyboardType: TextInputType.number,
            style: const TextStyle(fontSize: 40, fontWeight: FontWeight.bold),
            decoration: InputDecoration(
              prefixText: "\$ ",
              hintText: "0.00",
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
            ),
          ),
          const Spacer(),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              minimumSize: const Size(double.infinity, 60),
              backgroundColor: Colors.cyan,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Transfer Complete!")));
              Navigator.pop(context);
            },
            child: const Text("Confirm Transfer", style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
          )
        ],
      ),
    );
  }
}

class AnalyticsScreen extends StatelessWidget {
  final FeatureProvider provider;
  const AnalyticsScreen({super.key, required this.provider});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Spending Insights")),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Container(
              height: 200,
              width: double.infinity,
              decoration: BoxDecoration(color: Colors.blueGrey.shade900, borderRadius: BorderRadius.circular(24)),
              child: const Center(child: Text("Live Spending Graph (Mock)", style: TextStyle(color: Colors.cyan))),
            ),
            const SizedBox(height: 24),
            const _CategoryItem(label: "Shopping", amount: "\$2,450", color: Colors.blue),
            const _CategoryItem(label: "Food & Drink", amount: "\$840", color: Colors.orange),
            const _CategoryItem(label: "Subscription", amount: "\$120", color: Colors.red),
          ],
        ),
      ),
    );
  }
}

class SettingsScreen extends StatelessWidget {
  final FeatureProvider provider;
  const SettingsScreen({super.key, required this.provider});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Settings")),
      body: ListView(
        children: [
          const ListTile(leading: Icon(Icons.person), title: Text("Profile Information")),
          const ListTile(leading: Icon(Icons.notifications), title: Text("Notifications")),
          if (provider.features['biometric_login']!)
            SwitchListTile(
              secondary: const Icon(Icons.fingerprint, color: Colors.cyan),
              title: const Text("Biometric Login"),
              subtitle: const Text("Use Fingerprint or FaceID"),
              value: true,
              onChanged: (v) => provider.logUsage('biometric_login'),
            ),
          const ListTile(leading: Icon(Icons.logout, color: Colors.red), title: Text("Log Out")),
        ],
      ),
    );
  }
}

// --- Helper Widgets ---

class _QuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _QuickAction({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.white.withOpacity(0.15), borderRadius: BorderRadius.circular(14)),
            child: Icon(icon, color: Colors.white),
          ),
          const SizedBox(height: 8),
          Text(label, style: const TextStyle(color: Colors.white, fontSize: 12)),
        ],
      ),
    );
  }
}

class _TransactionItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final String date;
  final String amount;
  final bool isCredit;
  const _TransactionItem({required this.icon, required this.title, required this.date, required this.amount, this.isCredit = false});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.blueGrey.shade900, borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, color: Colors.blueGrey.shade400, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
            Text(date, style: TextStyle(color: Colors.blueGrey.shade500, fontSize: 12)),
          ])),
          Text(amount, style: TextStyle(color: isCredit ? Colors.green : Colors.white, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}

class _RecipientCard extends StatelessWidget {
  final String name;
  final String initial;
  final Color color;
  const _RecipientCard({required this.name, required this.initial, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 80,
      margin: const EdgeInsets.only(right: 12),
      decoration: BoxDecoration(color: Colors.blueGrey.shade900, borderRadius: BorderRadius.circular(16)),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircleAvatar(backgroundColor: color.withOpacity(0.2), child: Text(initial, style: TextStyle(color: color))),
          const SizedBox(height: 8),
          Text(name, style: const TextStyle(fontSize: 12)),
        ],
      ),
    );
  }
}

class _CategoryItem extends StatelessWidget {
  final String label;
  final String amount;
  final Color color;
  const _CategoryItem({required this.label, required this.amount, required this.color});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(width: 4, height: 40, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(2))),
          const SizedBox(width: 16),
          Expanded(child: Text(label, style: const TextStyle(fontSize: 16))),
          Text(amount, style: const TextStyle(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}

class _OldTransferUI extends StatelessWidget {
  @override
  Widget build(BuildContext context) => const Center(child: Text("Old, simple transfer UI"));
}
