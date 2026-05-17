import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

class ApiService {
  // IMPORTANT: If running on a physical device or different computer, 
  // change this to your computer's local network IP (e.g., 192.168.1.10)
  // For Android emulator, use 10.0.2.2. For local testing on desktop/web, 127.0.0.1 is fine.
  static const String baseUrl = 'http://127.0.0.1:5000';

  static Future<String> getDeviceId() async {
    final prefs = await SharedPreferences.getInstance();
    String? deviceId = prefs.getString('device_id');
    if (deviceId == null) {
      deviceId = const Uuid().v4();
      await prefs.setString('device_id', deviceId);
    }
    return deviceId;
  }

  static Future<void> registerDevice() async {
    final deviceId = await getDeviceId();
    try {
      await http.post(
        Uri.parse('$baseUrl/register-device'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'device_id': deviceId,
          'device_name': 'Flutter App User'
        }),
      );
    } catch (e) {
      print('Failed to register device: $e');
    }
  }

  static Future<Map<String, dynamic>> getFeatures() async {
    final deviceId = await getDeviceId();
    try {
      final response = await http.get(Uri.parse('$baseUrl/get-features?device_id=$deviceId'));
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (e) {
      print('Failed to fetch features: $e');
    }
    return {};
  }

  static Future<void> logUsage(String featureName) async {
    final deviceId = await getDeviceId();
    try {
      await http.post(
        Uri.parse('$baseUrl/log-usage'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'device_id': deviceId,
          'feature_name': featureName,
          'usage_status': 'used'
        }),
      );
    } catch (e) {
      print('Failed to log usage: $e');
    }
  }
}
