import 'package:flutter/material.dart';
import 'services/api_service.dart';
import 'screens/home_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Register the device with the backend on startup
  await ApiService.registerDevice();
  runApp(const FlagForgeApp());
}

class FlagForgeApp extends StatelessWidget {
  const FlagForgeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FlagForge Demo Bank',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
      ),
      home: const HomeScreen(),
    );
  }
}
