import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';

class AnalyticsScreen extends StatelessWidget {
  const AnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Spending Analytics', style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.black87),
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 20, offset: const Offset(0, 10)),
                  ]
                ),
                child: Column(
                  children: [
                    const Text('Total Spent This Month', style: TextStyle(color: Colors.black54, fontWeight: FontWeight.w500)),
                    const SizedBox(height: 8),
                    const Text('₹42,500.00', style: TextStyle(fontSize: 36, fontWeight: FontWeight.w800, color: Colors.black87)),
                    const SizedBox(height: 32),
                    SizedBox(
                      height: 200,
                      child: PieChart(
                        PieChartData(
                          sectionsSpace: 2,
                          centerSpaceRadius: 60,
                          sections: [
                            PieChartSectionData(color: Colors.blue, value: 40, title: '40%', radius: 30, titleStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                            PieChartSectionData(color: Colors.purple, value: 30, title: '30%', radius: 25, titleStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                            PieChartSectionData(color: Colors.orange, value: 15, title: '15%', radius: 20, titleStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                            PieChartSectionData(color: Colors.teal, value: 15, title: '15%', radius: 20, titleStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _buildLegend(Colors.blue, 'Shopping'),
                        const SizedBox(width: 16),
                        _buildLegend(Colors.purple, 'Food'),
                        const SizedBox(width: 16),
                        _buildLegend(Colors.orange, 'Transport'),
                        const SizedBox(width: 16),
                        _buildLegend(Colors.teal, 'Bills'),
                      ],
                    )
                  ],
                ),
              ),
              const SizedBox(height: 32),
              const Text('Recent Transactions', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87)),
              const SizedBox(height: 16),
              _buildTransactionTile(Icons.shopping_bag, 'Amazon', 'Today', '-₹2,499.00', Colors.blue),
              _buildTransactionTile(Icons.restaurant, 'Zomato', 'Yesterday', '-₹850.00', Colors.purple),
              _buildTransactionTile(Icons.electric_bolt, 'Electricity Bill', '3 days ago', '-₹1,200.00', Colors.teal),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLegend(Color color, String label) {
    return Row(
      children: [
        Container(width: 12, height: 12, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.black54)),
      ],
    );
  }

  Widget _buildTransactionTile(IconData icon, String title, String date, String amount, Color color) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, color: color),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.black87)),
                Text(date, style: const TextStyle(color: Colors.black54, fontSize: 12)),
              ],
            ),
          ),
          Text(amount, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.black87)),
        ],
      ),
    );
  }
}
