import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';
import 'dart:io' show Platform;
import 'dart:math';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:intl/intl.dart';

// --- Configuration ---
const String backendUrl = "http://10.20.26.29:5000"; // TODO: Move to a config file

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
  int age = 22;
  String gender = 'male';
  String location = 'IN';
  String environment = 'production';

  // Bank balance & investments
  double balance = 12450.00;
  Map<String, double> cryptoHoldings = {
    'BTC': 0.082,
    'ETH': 1.45,
    'SOL': 12.8,
  };
  Map<String, double> cryptoPrices = {
    'BTC': 68250.00,
    'ETH': 3540.00,
    'SOL': 148.50,
  };

  // Card customization settings
  int selectedCardThemeIndex = 0;
  bool isCardFrozen = false;
  bool isCardOnlineEnabled = true;
  bool isCardInternationalEnabled = false;
  double monthlySpendLimit = 5000.0;
  double currentSpentThisMonth = 1245.50;

  // Scratch card cashback
  double? scrashedPrize;

  Map<String, bool> features = {
    'new_transfer_ui': false,
    'biometric_login': false,
    'spending_analytics': false,
    'card_tab': false,
    'crypto_wallet': false,
    'loan_calculator': false,
    'cashback_deals': false,
  };
  Timer? _timer;

  FeatureProvider() {
    _initDevice();
  }

  String getDeviceType() {
    if (kIsWeb) return "Desktop";
    try {
      if (Platform.isIOS) return "iOS";
      if (Platform.isAndroid) return "Android";
      if (Platform.isMacOS) return "macOS";
      if (Platform.isWindows) return "Windows";
      if (Platform.isLinux) return "Linux";
    } catch (e) {
      return "Desktop";
    }
    return "Desktop";
  }

  Future<void> _initDevice() async {
    final prefs = await SharedPreferences.getInstance();
    deviceId = prefs.getString('device_id') ?? "dev_${DateTime.now().millisecondsSinceEpoch}";
    await prefs.setString('device_id', deviceId);
    
    age = prefs.getInt('user_age') ?? 22;
    gender = prefs.getString('user_gender') ?? 'male';
    location = prefs.getString('user_location') ?? 'IN';
    environment = prefs.getString('user_environment') ?? 'production';
    
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
    _timer = Timer.periodic(const Duration(seconds: 5), (_) {
      fetchFeatures();
      _updateCryptoPrices();
    });
    fetchFeatures();
  }

  void _updateCryptoPrices() {
    final rand = Random();
    cryptoPrices.forEach((key, value) {
      double changePercent = (rand.nextDouble() * 2 - 1) * 0.008; // +/- 0.8% change
      cryptoPrices[key] = double.parse((value * (1 + changePercent)).toStringAsFixed(2));
    });
    notifyListeners();
  }

  Future<void> fetchFeatures() async {
    try {
      final Map<String, dynamic> payload = {
        "device_id": deviceId,
        "environment": environment,
        "attributes": {
          "age": age,
          "device_type": getDeviceType(),
          "gender": gender,
          "location": location,
        }
      };

      final response = await http.post(
        Uri.parse('$backendUrl/evaluate-features'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(payload),
      );

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(response.body);
        final Map<String, bool> newFeatures = {
          'new_transfer_ui': false,
          'biometric_login': false,
          'spending_analytics': false,
          'card_tab': false,
          'crypto_wallet': false,
          'loan_calculator': false,
          'cashback_deals': false,
        };
        data.forEach((key, value) {
          newFeatures[key] = value as bool;
        });
        features = newFeatures;
        debugPrint("Features updated: $features");
        notifyListeners();
      } else {
        debugPrint("Failed to fetch features: ${response.statusCode} - ${response.body}");
      }
    } catch (e) {
      debugPrint("Polling error: $e");
    }
  }

  Future<void> updateProfile({int? newAge, String? newGender, String? newLocation, String? newEnvironment}) async {
    final prefs = await SharedPreferences.getInstance();
    if (newAge != null) {
      age = newAge;
      await prefs.setInt('user_age', age);
    }
    if (newGender != null) {
      gender = newGender;
      await prefs.setString('user_gender', gender);
    }
    if (newLocation != null) {
      location = newLocation;
      await prefs.setString('user_location', location);
    }
    if (newEnvironment != null) {
      environment = newEnvironment;
      await prefs.setString('user_environment', environment);
    }
    notifyListeners();
    await fetchFeatures();
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

  // Card configuration mutations
  void updateCardTheme(int index) {
    selectedCardThemeIndex = index;
    notifyListeners();
  }

  void updateCardFrozen(bool frozen) {
    isCardFrozen = frozen;
    notifyListeners();
  }

  void updateCardOnline(bool val) {
    isCardOnlineEnabled = val;
    notifyListeners();
  }

  void updateCardInternational(bool val) {
    isCardInternationalEnabled = val;
    notifyListeners();
  }

  void updateMonthlySpendLimit(double val) {
    monthlySpendLimit = val;
    notifyListeners();
  }

  // Scratch card actions
  void scratchPrize(double amount) {
    if (scrashedPrize != null) return;
    scrashedPrize = amount;
    balance += amount;
    logUsage('cashback_deals');
    notifyListeners();
  }

  void resetScratchCard() {
    scrashedPrize = null;
    notifyListeners();
  }

  // Crypto trading execution
  void buyCrypto(String symbol, double quantity, double cost) {
    balance -= cost;
    cryptoHoldings[symbol] = (cryptoHoldings[symbol] ?? 0.0) + quantity;
    notifyListeners();
  }

  void sellCrypto(String symbol, double quantity, double yieldVal) {
    balance += yieldVal;
    cryptoHoldings[symbol] = (cryptoHoldings[symbol] ?? 0.0) - quantity;
    notifyListeners();
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
        // Dynamically build active tabs list
        final List<Widget> tabs = [
          HomeScreen(provider: _provider),
        ];

        final List<BottomNavigationBarItem> navItems = [
          const BottomNavigationBarItem(icon: Icon(Icons.home_filled), label: "Home"),
        ];

        // Check card_tab feature flag
        final bool showCardTab = _provider.features['card_tab'] ?? false;
        if (showCardTab) {
          tabs.add(CardsScreen(provider: _provider));
          navItems.add(const BottomNavigationBarItem(icon: Icon(Icons.credit_card_rounded), label: "Cards"));
        }

        // Check spending_analytics feature flag
        final bool showAnalyticsTab = _provider.features['spending_analytics'] ?? false;
        if (showAnalyticsTab) {
          tabs.add(AnalyticsScreen(provider: _provider));
          navItems.add(const BottomNavigationBarItem(icon: Icon(Icons.bar_chart_rounded), label: "Spending"));
        }

        // Check crypto_wallet feature flag
        final bool showCryptoTab = _provider.features['crypto_wallet'] ?? false;
        if (showCryptoTab) {
          tabs.add(CryptoWalletScreen(provider: _provider));
          navItems.add(const BottomNavigationBarItem(icon: Icon(Icons.currency_bitcoin_rounded), label: "Crypto"));
        }

        // Settings tab is always visible
        tabs.add(SettingsScreen(provider: _provider));
        navItems.add(const BottomNavigationBarItem(icon: Icon(Icons.settings), label: "Settings"));

        // Safeguard selected tab index bounds
        if (_index >= tabs.length) {
          _index = 0;
        }

        return Scaffold(
          body: IndexedStack(
            index: _index,
            children: tabs,
          ),
          bottomNavigationBar: BottomNavigationBar(
            currentIndex: _index,
            onTap: (i) => setState(() => _index = i),
            type: BottomNavigationBarType.fixed,
            backgroundColor: const Color(0xFF0F172A),
            selectedItemColor: const Color(0xFF22D3EE),
            unselectedItemColor: Colors.blueGrey.shade600,
            items: navItems,
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
          expandedHeight: 100,
          backgroundColor: Colors.transparent,
          flexibleSpace: FlexibleSpaceBar(
            titlePadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            title: Row(
              children: [
                const CircleAvatar(
                  radius: 18, 
                  backgroundColor: Color(0xFF22D3EE), 
                  child: Icon(Icons.person, size: 20, color: Colors.black),
                ),
                const SizedBox(width: 10),
                Text(
                  "Hi, Demo User", 
                  style: TextStyle(fontSize: 16, color: Colors.blueGrey.shade100, fontWeight: FontWeight.w600),
                ),
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
                // Premium Balance Card
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF0F172A), Color(0xFF0891B2)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: const Color(0xFF22D3EE).withOpacity(0.3), width: 1.5),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF0891B2).withOpacity(0.15), 
                        blurRadius: 20, 
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "Available Balance", 
                        style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w500),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        NumberFormat.simpleCurrency(decimalDigits: 2).format(provider.balance), 
                        style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
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
                          if (provider.features['loan_calculator'] ?? false)
                            _QuickAction(
                              icon: Icons.calculate_rounded, 
                              label: "EMI Calc", 
                              onTap: () {
                                provider.logUsage('loan_calculator');
                                Navigator.push(context, MaterialPageRoute(builder: (c) => LoanCalculatorScreen(provider: provider)));
                              }
                            ),
                        ],
                      )
                    ],
                  ),
                ),
                
                // Cashback deals section
                if (provider.features['cashback_deals'] ?? false) ...[
                  const SizedBox(height: 28),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text("Rewards & Cashback", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      if (provider.scrashedPrize != null)
                        TextButton(
                          onPressed: () => provider.resetScratchCard(),
                          style: TextButton.styleFrom(
                            foregroundColor: const Color(0xFF22D3EE),
                            padding: EdgeInsets.zero,
                            minimumSize: const Size(50, 30),
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          child: const Text("Reset Card", style: TextStyle(fontSize: 12)),
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ScratchCardWidget(provider: provider),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 80,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      children: const [
                        _CashbackDealCard(store: "Starbucks", reward: "10% Cash Back", icon: Icons.coffee, color: Colors.green),
                        _CashbackDealCard(store: "Apple Store", reward: "5% Cash Back", icon: Icons.apple, color: Colors.grey),
                        _CashbackDealCard(store: "Amazon", reward: "3% Cash Back", icon: Icons.shopping_bag_rounded, color: Colors.orange),
                        _CashbackDealCard(store: "Uber Wallet", reward: "8% Cash Back", icon: Icons.directions_car_rounded, color: Colors.indigoAccent),
                      ],
                    ),
                  ),
                ],
                
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
    bool isNewUI = provider.features['new_transfer_ui'] ?? false;

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

class SettingsScreen extends StatefulWidget {
  final FeatureProvider provider;
  const SettingsScreen({super.key, required this.provider});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late TextEditingController _locationController;

  @override
  void initState() {
    super.initState();
    _locationController = TextEditingController(text: widget.provider.location);
  }

  @override
  void didUpdateWidget(covariant SettingsScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.provider.location != _locationController.text) {
      _locationController.text = widget.provider.location;
    }
  }

  @override
  void dispose() {
    _locationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = widget.provider;
    return Scaffold(
      appBar: AppBar(
        title: const Text("Settings & Profile"),
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 12),
        children: [
          // Targeting Rules Context Card
          Card(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: const Color(0xFF0F172A),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(color: Colors.cyan.withOpacity(0.3), width: 1),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.psychology_outlined, color: Color(0xFF22D3EE), size: 24),
                      const SizedBox(width: 8),
                      Text(
                        "Targeting Context",
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    "Adjust these demographic attributes to see matching rules evaluate in real-time.",
                    style: TextStyle(fontSize: 12, color: Colors.blueGrey.shade300),
                  ),
                  const SizedBox(height: 12),
                  const Divider(color: Colors.white10),
                  
                  // Device Type (Read-only status)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    dense: true,
                    title: const Text("Device Type (Auto-detected)", style: TextStyle(color: Colors.white70)),
                    subtitle: Text(provider.getDeviceType(), style: const TextStyle(color: Color(0xFF22D3EE), fontWeight: FontWeight.bold, fontSize: 15)),
                    trailing: const Icon(Icons.devices, color: Colors.white38),
                  ),
                  const Divider(color: Colors.white10),
                  
                  // Age Selector
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text("Age: ${provider.age}", style: const TextStyle(color: Colors.white70, fontWeight: FontWeight.w500)),
                      Text(provider.age >= 18 ? "Adult" : "Minor", style: TextStyle(color: provider.age >= 18 ? Colors.greenAccent : Colors.amberAccent, fontSize: 11, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  Slider(
                    value: provider.age.toDouble(),
                    min: 10,
                    max: 80,
                    divisions: 70,
                    activeColor: const Color(0xFF22D3EE),
                    inactiveColor: Colors.blueGrey.shade800,
                    label: provider.age.toString(),
                    onChanged: (val) {
                      provider.updateProfile(newAge: val.toInt());
                    },
                  ),
                  const Divider(color: Colors.white10),
                  
                  // Gender Dropdown
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text("Gender", style: TextStyle(color: Colors.white70)),
                      DropdownButton<String>(
                        value: provider.gender,
                        dropdownColor: const Color(0xFF0F172A),
                        style: const TextStyle(color: Color(0xFF22D3EE), fontWeight: FontWeight.bold),
                        underline: Container(height: 1, color: Colors.cyan),
                        items: ['male', 'female', 'other'].map((g) {
                          return DropdownMenuItem(value: g, child: Text(g.toUpperCase()));
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) {
                            provider.updateProfile(newGender: val);
                          }
                        },
                      ),
                    ],
                  ),
                  const Divider(color: Colors.white10),
                  
                  // Location Input
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text("Location (Country ISO)", style: TextStyle(color: Colors.white70)),
                      SizedBox(
                        width: 100,
                        child: TextField(
                          controller: _locationController,
                          style: const TextStyle(color: Color(0xFF22D3EE), fontWeight: FontWeight.bold),
                          textAlign: TextAlign.center,
                          textCapitalization: TextCapitalization.characters,
                          decoration: const InputDecoration(
                            isDense: true,
                            contentPadding: EdgeInsets.symmetric(vertical: 8, horizontal: 8),
                            enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.white30)),
                            focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFF22D3EE), width: 2)),
                            hintText: "e.g., IN, US",
                            hintStyle: TextStyle(color: Colors.white24, fontSize: 12),
                          ),
                          onSubmitted: (val) {
                            provider.updateProfile(newLocation: val.trim().toUpperCase());
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Divider(color: Colors.white10),
                  
                  // Environment Dropdown
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text("Environment", style: TextStyle(color: Colors.white70)),
                      DropdownButton<String>(
                        value: provider.environment,
                        dropdownColor: const Color(0xFF0F172A),
                        style: const TextStyle(color: Color(0xFF22D3EE), fontWeight: FontWeight.bold),
                        underline: Container(height: 1, color: Colors.cyan),
                        items: ['production', 'staging', 'development'].map((env) {
                          return DropdownMenuItem(value: env, child: Text(env.toUpperCase()));
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) {
                            provider.updateProfile(newEnvironment: val);
                          }
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            child: Text("App Actions", style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white38)),
          ),
          
          if (provider.features['biometric_login'] ?? false)
            SwitchListTile(
              secondary: const Icon(Icons.fingerprint, color: Color(0xFF22D3EE)),
              title: const Text("Biometric Login"),
              subtitle: const Text("Use Fingerprint or FaceID (Targeted UI)"),
              value: true,
              activeColor: const Color(0xFF22D3EE),
              onChanged: (v) => provider.logUsage('biometric_login'),
            ),
            
          const ListTile(
            leading: Icon(Icons.notifications_outlined),
            title: Text("Notifications"),
          ),
          
          const ListTile(
            leading: Icon(Icons.logout, color: Colors.redAccent),
            title: Text("Log Out", style: TextStyle(color: Colors.redAccent)),
          ),
          
          // Debug stats footer
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
            child: Center(
              child: Text(
                "Device ID: ${provider.deviceId}\nFlagForge SDK v2.0.0",
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white24, fontSize: 10, fontFamily: 'monospace'),
              ),
            ),
          )
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

// ==========================================
// --- New Stock Screens and Widgets ---
// ==========================================

// --- Cards Screen (card_tab) ---

class CardsScreen extends StatelessWidget {
  final FeatureProvider provider;
  const CardsScreen({super.key, required this.provider});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: provider,
      builder: (context, _) {
        final cardGradients = [
          // 0: Cyber Blue
          const LinearGradient(
            colors: [Color(0xFF0F172A), Color(0xFF1E293B), Color(0xFF0891B2)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          // 1: Obsidian Black
          const LinearGradient(
            colors: [Color(0xFF090A0F), Color(0xFF1C1E24), Color(0xFF2C3E50)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          // 2: Royal Gold
          const LinearGradient(
            colors: [Color(0xFF1E1B4B), Color(0xFF312E81), Color(0xFFB45309)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ];

        final currentGradient = cardGradients[provider.selectedCardThemeIndex];

        return Scaffold(
          appBar: AppBar(
            title: const Text("My Virtual Cards", style: TextStyle(fontWeight: FontWeight.bold)),
            backgroundColor: Colors.transparent,
            elevation: 0,
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Glowing virtual card
                AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  width: double.infinity,
                  height: 210,
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    gradient: currentGradient,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(
                      color: provider.isCardFrozen 
                          ? Colors.white.withOpacity(0.2) 
                          : const Color(0xFF22D3EE).withOpacity(0.3),
                      width: 1.5,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: provider.isCardFrozen 
                            ? Colors.black.withOpacity(0.4) 
                            : const Color(0xFF0891B2).withOpacity(0.25),
                        blurRadius: 25,
                        offset: const Offset(0, 12),
                      ),
                    ],
                  ),
                  child: Stack(
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                "FlagForge Premium",
                                style: TextStyle(
                                  color: Colors.white70,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                  letterSpacing: 1.2,
                                ),
                              ),
                              Icon(
                                Icons.contactless_outlined,
                                color: provider.isCardFrozen ? Colors.white30 : const Color(0xFF22D3EE),
                              ),
                            ],
                          ),
                          const Spacer(),
                          Text(
                            provider.isCardFrozen ? "••••  ••••  ••••  ••••" : "4532  8890  1243  9908",
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 3,
                              fontFamily: 'monospace',
                            ),
                          ),
                          const Spacer(),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text("CARD HOLDER", style: TextStyle(color: Colors.white38, fontSize: 8)),
                                  const SizedBox(height: 4),
                                  Text(
                                    "DEMO USER",
                                    style: TextStyle(
                                      color: provider.isCardFrozen ? Colors.white54 : Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                  ),
                                ],
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text("EXPIRES", style: TextStyle(color: Colors.white38, fontSize: 8)),
                                  const SizedBox(height: 4),
                                  Text(
                                    "09/30",
                                    style: TextStyle(
                                      color: provider.isCardFrozen ? Colors.white54 : Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                  ),
                                ],
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text("CVV", style: TextStyle(color: Colors.white38, fontSize: 8)),
                                  const SizedBox(height: 4),
                                  Text(
                                    provider.isCardFrozen ? "•••" : "342",
                                    style: TextStyle(
                                      color: provider.isCardFrozen ? Colors.white54 : Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ],
                      ),
                      if (provider.isCardFrozen)
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.black.withOpacity(0.5),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: const Center(
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.ac_unit, color: Colors.blueAccent, size: 28),
                                SizedBox(width: 8),
                                Text(
                                  "CARD FROZEN",
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 18,
                                    letterSpacing: 1.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                
                // Card Skin Picker
                const Text("Select Card Design", style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white54)),
                const SizedBox(height: 12),
                Row(
                  children: [
                    _ThemePickerOption(
                      label: "Cyan Cyber",
                      color: const Color(0xFF0891B2),
                      isSelected: provider.selectedCardThemeIndex == 0,
                      onTap: () => provider.updateCardTheme(0),
                    ),
                    const SizedBox(width: 12),
                    _ThemePickerOption(
                      label: "Obsidian",
                      color: const Color(0xFF1C1E24),
                      isSelected: provider.selectedCardThemeIndex == 1,
                      onTap: () => provider.updateCardTheme(1),
                    ),
                    const SizedBox(width: 12),
                    _ThemePickerOption(
                      label: "Gold Indigo",
                      color: const Color(0xFFB45309),
                      isSelected: provider.selectedCardThemeIndex == 2,
                      onTap: () => provider.updateCardTheme(2),
                    ),
                  ],
                ),
                const SizedBox(height: 32),
                
                // Card Settings Controls
                const Text("Card Configuration", style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white54)),
                const SizedBox(height: 12),
                Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.white.withOpacity(0.05)),
                  ),
                  child: Column(
                    children: [
                      SwitchListTile(
                        secondary: const Icon(Icons.ac_unit_rounded, color: Colors.blueAccent),
                        title: const Text("Freeze Card"),
                        subtitle: const Text("Temporarily lock card usage"),
                        value: provider.isCardFrozen,
                        activeColor: Colors.blueAccent,
                        onChanged: (val) {
                          provider.logUsage('card_tab');
                          provider.updateCardFrozen(val);
                        },
                      ),
                      const Divider(color: Colors.white10, height: 1),
                      SwitchListTile(
                        secondary: const Icon(Icons.shopping_cart_outlined, color: Color(0xFF22D3EE)),
                        title: const Text("Online Payments"),
                        subtitle: const Text("Allow digital e-commerce checkouts"),
                        value: provider.isCardOnlineEnabled,
                        activeColor: const Color(0xFF22D3EE),
                        onChanged: provider.isCardFrozen ? null : (val) {
                          provider.updateCardOnline(val);
                        },
                      ),
                      const Divider(color: Colors.white10, height: 1),
                      SwitchListTile(
                        secondary: const Icon(Icons.public, color: Colors.amber),
                        title: const Text("International Transactions"),
                        subtitle: const Text("Enable usage outside your region"),
                        value: provider.isCardInternationalEnabled,
                        activeColor: Colors.amber,
                        onChanged: provider.isCardFrozen ? null : (val) {
                          provider.updateCardInternational(val);
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 32),
                
                // Spending Limit slider
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text("Monthly Spend Limit", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white54)),
                    Text(
                      "\$${provider.monthlySpendLimit.toInt()} / \$10,000",
                      style: const TextStyle(color: Color(0xFF22D3EE), fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    children: [
                      Slider(
                        value: provider.monthlySpendLimit,
                        min: 500,
                        max: 10000,
                        divisions: 19,
                        activeColor: const Color(0xFF22D3EE),
                        inactiveColor: Colors.blueGrey.shade800,
                        onChanged: provider.isCardFrozen ? null : (val) {
                          provider.updateMonthlySpendLimit(val);
                        },
                      ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text("Spent so far:", style: TextStyle(color: Colors.white38, fontSize: 12)),
                          Text(
                            "\$${provider.currentSpentThisMonth}",
                            style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _ThemePickerOption extends StatelessWidget {
  final String label;
  final Color color;
  final bool isSelected;
  final VoidCallback onTap;

  const _ThemePickerOption({
    required this.label,
    required this.color,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? color.withOpacity(0.2) : const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? color : Colors.white.withOpacity(0.05),
              width: 1.5,
            ),
          ),
          child: Column(
            children: [
              Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  color: color,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                label,
                style: TextStyle(
                  color: isSelected ? Colors.white : Colors.white54,
                  fontSize: 11,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// --- Crypto Wallet Screen (crypto_wallet) ---

class CryptoWalletScreen extends StatelessWidget {
  final FeatureProvider provider;
  const CryptoWalletScreen({super.key, required this.provider});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: provider,
      builder: (context, _) {
        // Calculate portfolio balance in USD
        double portfolioValue = 0.0;
        provider.cryptoHoldings.forEach((key, quantity) {
          portfolioValue += quantity * (provider.cryptoPrices[key] ?? 0.0);
        });

        return Scaffold(
          appBar: AppBar(
            title: const Text("Crypto Trading Wallet", style: TextStyle(fontWeight: FontWeight.bold)),
            backgroundColor: Colors.transparent,
            elevation: 0,
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Portfolio value card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF4F46E5), Color(0xFF7C3AED)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF7C3AED).withOpacity(0.3),
                        blurRadius: 20,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text("Estimated Portfolio Balance", style: TextStyle(color: Colors.white70)),
                      const SizedBox(height: 8),
                      Text(
                        "\$${portfolioValue.toStringAsFixed(2)}",
                        style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text("Fiat USD Balance:", style: TextStyle(color: Colors.white70, fontSize: 13)),
                          Text(
                            "\$${provider.balance.toStringAsFixed(2)}",
                            style: const TextStyle(color: Colors.greenAccent, fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 28),
                
                const Text("Market Assets", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white70)),
                const SizedBox(height: 12),
                
                _CryptoAssetRow(
                  name: "Bitcoin",
                  symbol: "BTC",
                  price: provider.cryptoPrices["BTC"] ?? 0.0,
                  holdings: provider.cryptoHoldings["BTC"] ?? 0.0,
                  icon: Icons.currency_bitcoin_rounded,
                  color: Colors.orange,
                  onTrade: () => _showTradeDialog(context, "BTC"),
                ),
                const SizedBox(height: 12),
                _CryptoAssetRow(
                  name: "Ethereum",
                  symbol: "ETH",
                  price: provider.cryptoPrices["ETH"] ?? 0.0,
                  holdings: provider.cryptoHoldings["ETH"] ?? 0.0,
                  icon: Icons.filter_hdr_rounded,
                  color: Colors.purpleAccent,
                  onTrade: () => _showTradeDialog(context, "ETH"),
                ),
                const SizedBox(height: 12),
                _CryptoAssetRow(
                  name: "Solana",
                  symbol: "SOL",
                  price: provider.cryptoPrices["SOL"] ?? 0.0,
                  holdings: provider.cryptoHoldings["SOL"] ?? 0.0,
                  icon: Icons.blur_on_rounded,
                  color: Colors.tealAccent,
                  onTrade: () => _showTradeDialog(context, "SOL"),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showTradeDialog(BuildContext context, String symbol) {
    provider.logUsage('crypto_wallet');
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF0F172A),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => _CryptoTradeBottomSheet(provider: provider, symbol: symbol),
    );
  }
}

class _CryptoAssetRow extends StatelessWidget {
  final String name;
  final String symbol;
  final double price;
  final double holdings;
  final IconData icon;
  final Color color;
  final VoidCallback onTrade;

  const _CryptoAssetRow({
    required this.name,
    required this.symbol,
    required this.price,
    required this.holdings,
    required this.icon,
    required this.color,
    required this.onTrade,
  });

  @override
  Widget build(BuildContext context) {
    double value = holdings * price;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                const SizedBox(height: 4),
                Text(
                  "$holdings $symbol  (Value: \$${value.toStringAsFixed(2)})",
                  style: const TextStyle(color: Colors.white38, fontSize: 11),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                "\$${price.toStringAsFixed(2)}",
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
              ),
              const SizedBox(height: 6),
              ElevatedButton(
                onPressed: onTrade,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF22D3EE).withOpacity(0.15),
                  foregroundColor: const Color(0xFF22D3EE),
                  elevation: 0,
                  minimumSize: const Size(60, 28),
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                child: const Text("Trade", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _CryptoTradeBottomSheet extends StatefulWidget {
  final FeatureProvider provider;
  final String symbol;

  const _CryptoTradeBottomSheet({required this.provider, required this.symbol});

  @override
  State<_CryptoTradeBottomSheet> createState() => _CryptoTradeBottomSheetState();
}

class _CryptoTradeBottomSheetState extends State<_CryptoTradeBottomSheet> {
  final TextEditingController _amountController = TextEditingController();
  bool _isBuy = true;
  double _totalCost = 0.0;

  @override
  void initState() {
    super.initState();
    _amountController.addListener(_calculateTotal);
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  void _calculateTotal() {
    double qty = double.tryParse(_amountController.text) ?? 0.0;
    double price = widget.provider.cryptoPrices[widget.symbol] ?? 0.0;
    setState(() {
      _totalCost = qty * price;
    });
  }

  void _executeTrade() {
    double qty = double.tryParse(_amountController.text) ?? 0.0;
    if (qty <= 0) return;

    if (_isBuy) {
      if (widget.provider.balance < _totalCost) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Insufficient USD balance to purchase!")),
        );
        return;
      }
      widget.provider.buyCrypto(widget.symbol, qty, _totalCost);
    } else {
      double currentHoldings = widget.provider.cryptoHoldings[widget.symbol] ?? 0.0;
      if (currentHoldings < qty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Insufficient crypto balance to sell!")),
        );
        return;
      }
      widget.provider.sellCrypto(widget.symbol, qty, _totalCost);
    }

    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text("Successfully ${_isBuy ? 'bought' : 'sold'} $qty ${widget.symbol}!")),
    );
  }

  @override
  Widget build(BuildContext context) {
    final double price = widget.provider.cryptoPrices[widget.symbol] ?? 0.0;
    final double currentHoldings = widget.provider.cryptoHoldings[widget.symbol] ?? 0.0;

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
        left: 24,
        right: 24,
        top: 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "Trade ${widget.symbol}",
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close, color: Colors.white54),
              ),
            ],
          ),
          const SizedBox(height: 16),
          
          // Buy/Sell Toggle
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _isBuy = true),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      color: _isBuy ? Colors.green.withOpacity(0.15) : Colors.transparent,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: _isBuy ? Colors.green : Colors.white10),
                    ),
                    child: const Center(
                      child: Text("BUY", style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _isBuy = false),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      color: !_isBuy ? Colors.red.withOpacity(0.15) : Colors.transparent,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: !_isBuy ? Colors.red : Colors.white10),
                    ),
                    child: const Center(
                      child: Text("SELL", style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          
          // Info row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text("Asset Rate:", style: TextStyle(color: Colors.white54)),
              Text("\$${price.toStringAsFixed(2)}", style: const TextStyle(fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text("Your Holdings:", style: TextStyle(color: Colors.white54)),
              Text("$currentHoldings ${widget.symbol}", style: const TextStyle(fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 24),
          
          // Quantity Input
          TextField(
            controller: _amountController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            style: const TextStyle(color: Colors.white, fontSize: 20),
            decoration: InputDecoration(
              labelText: "Enter Quantity",
              labelStyle: const TextStyle(color: Colors.white54),
              suffixText: widget.symbol,
              suffixStyle: const TextStyle(color: Color(0xFF22D3EE), fontWeight: FontWeight.bold),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Colors.white10),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF22D3EE)),
              ),
            ),
          ),
          const SizedBox(height: 24),
          
          // Transaction breakdown
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(_isBuy ? "Total Cost:" : "Total Yield:", style: const TextStyle(color: Colors.white54, fontSize: 15)),
              Text(
                "\$${_totalCost.toStringAsFixed(2)}",
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: _isBuy ? Colors.green : Colors.orangeAccent,
                ),
              ),
            ],
          ),
          const SizedBox(height: 28),
          
          SizedBox(
            width: double.infinity,
            height: 54,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: _isBuy ? Colors.green : Colors.red,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: _executeTrade,
              child: Text(
                _isBuy ? "CONFIRM PURCHASE" : "CONFIRM SALE",
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// --- Loan Calculator Screen (loan_calculator) ---

class LoanCalculatorScreen extends StatefulWidget {
  final FeatureProvider provider;
  const LoanCalculatorScreen({super.key, required this.provider});

  @override
  State<LoanCalculatorScreen> createState() => _LoanCalculatorScreenState();
}

class _LoanCalculatorScreenState extends State<LoanCalculatorScreen> {
  double _loanAmount = 5000.0;
  double _interestRate = 8.5; // percent
  double _tenureMonths = 24.0; // months

  @override
  Widget build(BuildContext context) {
    // EMI Calculation formula:
    // P * r * (1 + r)^n / ((1 + r)^n - 1)
    // where r is monthly interest rate (annual / 12 / 100)
    double r = (_interestRate / 12) / 100;
    double p = _loanAmount;
    double n = _tenureMonths;
    
    double emi = 0.0;
    if (r > 0) {
      emi = p * r * pow(1 + r, n) / (pow(1 + r, n) - 1);
    } else {
      emi = p / n;
    }

    double totalPayable = emi * n;
    double totalInterest = totalPayable - p;
    double principalPercent = (p / totalPayable) * 100;
    double interestPercent = (totalInterest / totalPayable) * 100;

    // Guard percentages for flex sizes
    if (principalPercent.isNaN || principalPercent.isInfinite) principalPercent = 50;
    if (interestPercent.isNaN || interestPercent.isInfinite) interestPercent = 50;
    int pFlex = principalPercent.toInt().clamp(1, 99);
    int iFlex = interestPercent.toInt().clamp(1, 99);

    return Scaffold(
      appBar: AppBar(
        title: const Text("EMI Loan Calculator", style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // EMI Summary Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: const Color(0xFF22D3EE).withOpacity(0.15)),
              ),
              child: Column(
                children: [
                  const Text("Estimated Monthly EMI", style: TextStyle(color: Colors.white54, fontSize: 13)),
                  const SizedBox(height: 8),
                  Text(
                    "\$${emi.toStringAsFixed(2)}",
                    style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w800, color: Color(0xFF22D3EE)),
                  ),
                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildCalcDetail("Total Interest", "\$${totalInterest.toStringAsFixed(2)}"),
                      Container(width: 1, height: 30, color: Colors.white10),
                      _buildCalcDetail("Total Payback", "\$${totalPayable.toStringAsFixed(2)}"),
                    ],
                  ),
                  const SizedBox(height: 24),
                  // Visual breakdown bar
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text("Principal (${principalPercent.toStringAsFixed(0)}%)", style: const TextStyle(color: Colors.white54, fontSize: 10)),
                          Text("Interest (${interestPercent.toStringAsFixed(0)}%)", style: const TextStyle(color: Colors.white54, fontSize: 10)),
                        ],
                      ),
                      const SizedBox(height: 6),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: SizedBox(
                          height: 8,
                          child: Row(
                            children: [
                              Expanded(
                                flex: pFlex,
                                child: Container(color: const Color(0xFF0891B2)),
                              ),
                              Expanded(
                                flex: iFlex,
                                child: Container(color: Colors.amber),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            
            // Adjust Sliders
            _buildSliderLabel("Loan Amount", "\$${_loanAmount.toInt()}", 1000, 50000),
            Slider(
              value: _loanAmount,
              min: 1000,
              max: 50000,
              divisions: 49,
              activeColor: const Color(0xFF22D3EE),
              inactiveColor: Colors.blueGrey.shade800,
              onChanged: (val) {
                setState(() {
                  _loanAmount = val;
                });
              },
            ),
            const Divider(color: Colors.white10, height: 32),
            
            _buildSliderLabel("Interest Rate", "${_interestRate.toStringAsFixed(1)}% p.a.", 1, 20),
            Slider(
              value: _interestRate,
              min: 1.0,
              max: 20.0,
              divisions: 190,
              activeColor: const Color(0xFF22D3EE),
              inactiveColor: Colors.blueGrey.shade800,
              onChanged: (val) {
                setState(() {
                  _interestRate = val;
                });
              },
            ),
            const Divider(color: Colors.white10, height: 32),
            
            _buildSliderLabel("Tenure", "${_tenureMonths.toInt()} Months", 6, 60),
            Slider(
              value: _tenureMonths,
              min: 6,
              max: 60,
              divisions: 54,
              activeColor: const Color(0xFF22D3EE),
              inactiveColor: Colors.blueGrey.shade800,
              onChanged: (val) {
                setState(() {
                  _tenureMonths = val;
                });
              },
            ),
            const SizedBox(height: 40),
            
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF22D3EE),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("Loan Application Saved as Draft!")),
                  );
                  Navigator.pop(context);
                },
                child: const Text(
                  "APPLY NOW",
                  style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSliderLabel(String title, String value, double min, double max) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.white70)),
        Text(value, style: const TextStyle(color: Color(0xFF22D3EE), fontWeight: FontWeight.bold, fontSize: 16)),
      ],
    );
  }

  Widget _buildCalcDetail(String label, String value) {
    return Column(
      children: [
        Text(label, style: const TextStyle(color: Colors.white38, fontSize: 11)),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
      ],
    );
  }
}

// --- Scratch Card Widget & Cashback Offers (cashback_deals) ---

class ScratchCardWidget extends StatefulWidget {
  final FeatureProvider provider;
  const ScratchCardWidget({super.key, required this.provider});

  @override
  State<ScratchCardWidget> createState() => _ScratchCardWidgetState();
}

class _ScratchCardWidgetState extends State<ScratchCardWidget> with SingleTickerProviderStateMixin {
  bool _isScratched = false;
  late AnimationController _animController;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(vsync: this, duration: const Duration(milliseconds: 500));
    _scaleAnimation = Tween<double>(begin: 0.9, end: 1.0).animate(
      CurvedAnimation(parent: _animController, curve: Curves.elasticOut)
    );
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  void _revealPrize() {
    if (_isScratched) return;
    setState(() {
      _isScratched = true;
    });
    _animController.forward();
    
    // Generate random prize
    final random = Random();
    double prize = double.parse((5.0 + random.nextDouble() * 15.0).toStringAsFixed(2));
    widget.provider.scratchPrize(prize);
  }

  @override
  Widget build(BuildContext context) {
    final provider = widget.provider;
    if (provider.scrashedPrize != null) {
      _isScratched = true;
      _animController.value = 1.0;
    } else {
      _isScratched = false;
      _animController.reset();
    }
    
    return Container(
      width: double.infinity,
      height: 120,
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF22D3EE).withOpacity(0.2)),
      ),
      child: Stack(
        children: [
          // Prize Layer
          Center(
            child: ScaleTransition(
              scale: _scaleAnimation,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.emoji_events_rounded, color: Colors.amber, size: 36),
                  const SizedBox(height: 4),
                  const Text("Congratulations!", style: TextStyle(color: Colors.white70, fontSize: 12)),
                  Text(
                    "You won \$${provider.scrashedPrize?.toStringAsFixed(2) ?? '0.00'}!",
                    style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ),
          
          // Scratch Layer
          if (!_isScratched)
            GestureDetector(
              onTap: _revealPrize,
              onPanUpdate: (details) {
                _revealPrize();
              },
              child: Container(
                width: double.infinity,
                height: 120,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF94A3B8), Color(0xFF64748B)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.stars_rounded, color: Colors.white.withOpacity(0.8), size: 32),
                      const SizedBox(height: 8),
                      const Text(
                        "Swipe or Tap to Scratch Card",
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      Text(
                        "Win up to \$20 instantly!",
                        style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _CashbackDealCard extends StatelessWidget {
  final String store;
  final String reward;
  final IconData icon;
  final Color color;

  const _CashbackDealCard({
    required this.store,
    required this.reward,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 160,
      margin: const EdgeInsets.only(right: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  store,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.white),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  reward,
                  style: TextStyle(color: Colors.greenAccent.shade400, fontSize: 10, fontWeight: FontWeight.w600),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
