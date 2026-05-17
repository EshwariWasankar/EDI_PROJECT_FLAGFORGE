import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import pymysql
import mmh3
from dotenv import load_dotenv
import threading

load_dotenv()

app = Flask(__name__)
CORS(app)

def get_db_connection():
    return pymysql.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        user=os.getenv("DB_USER", "flag_user"),
        password=os.getenv("DB_PASSWORD", "flag_password"),
        database=os.getenv("DB_NAME", "flagforge"),
        cursorclass=pymysql.cursors.DictCursor
    )

def is_feature_enabled_for_device(device_id, is_globally_enabled, rollout_percentage):
    if not is_globally_enabled:
        return False
    if rollout_percentage >= 100:
        return True
    if rollout_percentage <= 0:
        return False
    
    # Use MurmurHash3 to hash the device_id
    hash_val = mmh3.hash(device_id, seed=42)
    # Get a positive number between 0 and 99
    normalized_hash = abs(hash_val) % 100
    return normalized_hash < rollout_percentage

@app.route('/get-features', methods=['GET'])
def get_features():
    device_id = request.args.get('device_id')
    if not device_id:
        return jsonify({"error": "device_id is required"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT feature_name, is_enabled, rollout_percentage FROM feature_flags")
            flags = cursor.fetchall()
            
            result = {}
            for flag in flags:
                result[flag['feature_name']] = is_feature_enabled_for_device(
                    device_id, 
                    bool(flag['is_enabled']), 
                    flag['rollout_percentage']
                )
        return jsonify(result)
    finally:
        conn.close()

@app.route('/register-device', methods=['POST'])
def register_device():
    data = request.json
    device_id = data.get('device_id')
    device_name = data.get('device_name', 'Unknown Device')
    
    if not device_id:
        return jsonify({"error": "device_id is required"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Insert or ignore if already exists
            cursor.execute(
                "INSERT IGNORE INTO devices (device_id, device_name) VALUES (%s, %s)",
                (device_id, device_name)
            )
            conn.commit()
        return jsonify({"status": "success", "device_id": device_id})
    finally:
        conn.close()

@app.route('/log-usage', methods=['POST'])
def log_usage():
    data = request.json
    device_id = data.get('device_id')
    feature_name = data.get('feature_name')
    usage_status = data.get('usage_status', 'used') # 'enabled' or 'used'
    
    if not device_id or not feature_name:
        return jsonify({"error": "Missing parameters"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "INSERT INTO analytics (device_id, feature_name, usage_status) VALUES (%s, %s, %s)",
                (device_id, feature_name, usage_status)
            )
            conn.commit()
        return jsonify({"status": "success"})
    finally:
        conn.close()

@app.route('/update-feature', methods=['POST'])
def update_feature():
    data = request.json
    feature_name = data.get('feature_name')
    is_enabled = data.get('is_enabled')
    rollout_percentage = data.get('rollout_percentage')

    if feature_name is None or is_enabled is None or rollout_percentage is None:
        return jsonify({"error": "Missing parameters"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Get current state before updating for history
            cursor.execute(
                "SELECT is_enabled, rollout_percentage FROM feature_flags WHERE feature_name = %s",
                (feature_name,)
            )
            current = cursor.fetchone()
            
            if current:
                # Insert into history
                cursor.execute(
                    "INSERT INTO feature_history (feature_name, is_enabled, rollout_percentage) VALUES (%s, %s, %s)",
                    (feature_name, current['is_enabled'], current['rollout_percentage'])
                )
            
            # Update the current flag
            cursor.execute(
                "UPDATE feature_flags SET is_enabled = %s, rollout_percentage = %s WHERE feature_name = %s",
                (is_enabled, rollout_percentage, feature_name)
            )
            conn.commit()
        return jsonify({"status": "success"})
    finally:
        conn.close()

@app.route('/rollback-feature', methods=['POST'])
def rollback_feature():
    data = request.json
    feature_name = data.get('feature_name')
    
    if not feature_name:
        return jsonify({"error": "Missing feature_name"}), 400
        
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Get latest history
            cursor.execute(
                "SELECT is_enabled, rollout_percentage FROM feature_history WHERE feature_name = %s ORDER BY changed_at DESC LIMIT 1",
                (feature_name,)
            )
            last_state = cursor.fetchone()
            
            if not last_state:
                return jsonify({"error": "No history found for this feature"}), 404
                
            # Update current state
            cursor.execute(
                "UPDATE feature_flags SET is_enabled = %s, rollout_percentage = %s WHERE feature_name = %s",
                (last_state['is_enabled'], last_state['rollout_percentage'], feature_name)
            )
            conn.commit()
        return jsonify({
            "status": "success", 
            "rolled_back_to": {
                "is_enabled": bool(last_state['is_enabled']), 
                "rollout_percentage": last_state['rollout_percentage']
            }
        })
    finally:
        conn.close()


@app.route('/dashboard-data', methods=['GET'])
def get_dashboard_data():
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Get features
            cursor.execute("SELECT feature_name, is_enabled, rollout_percentage FROM feature_flags")
            features = cursor.fetchall()
            
            # Get devices
            cursor.execute("SELECT device_id, device_name, registration_time FROM devices ORDER BY registration_time DESC")
            devices = cursor.fetchall()
            for d in devices:
                d['registration_time'] = d['registration_time'].isoformat() if d['registration_time'] else None
            
            # Get analytics summary
            cursor.execute('''
                SELECT feature_name, usage_status, COUNT(*) as count 
                FROM analytics 
                GROUP BY feature_name, usage_status
            ''')
            analytics = cursor.fetchall()
            
            # Get timeline data (last 10 minutes, grouped by minute)
            cursor.execute('''
                SELECT feature_name, 
                       DATE_FORMAT(timestamp, '%%H:%%i') as minute, 
                       COUNT(*) as count 
                FROM analytics 
                WHERE timestamp >= NOW() - INTERVAL 10 MINUTE
                GROUP BY feature_name, minute
                ORDER BY minute ASC
            ''')
            timeline = cursor.fetchall()
            
            # Active Devices (last 5 min)
            cursor.execute('''
                SELECT COUNT(DISTINCT device_id) as active_count
                FROM analytics
                WHERE timestamp >= NOW() - INTERVAL 5 MINUTE
            ''')
            active_devices = cursor.fetchone()['active_count']

            # Total Events & Failed Events
            cursor.execute("SELECT COUNT(*) as total FROM analytics")
            total_events = cursor.fetchone()['total']

            cursor.execute("SELECT COUNT(*) as failed FROM analytics WHERE usage_status = 'failed'")
            failed_events = cursor.fetchone()['failed']

            # Feature History (Last 5)
            cursor.execute('''
                SELECT feature_name, is_enabled, rollout_percentage, changed_at
                FROM feature_history
                ORDER BY changed_at DESC LIMIT 5
            ''')
            history = cursor.fetchall()
            for h in history:
                h['changed_at'] = h['changed_at'].isoformat() if h['changed_at'] else None

            # Live Feed (Last 20 events)
            cursor.execute('''
                SELECT device_id, feature_name, usage_status, timestamp
                FROM analytics
                ORDER BY timestamp DESC LIMIT 20
            ''')
            live_feed = cursor.fetchall()
            for l in live_feed:
                l['timestamp'] = l['timestamp'].isoformat() if l['timestamp'] else None

            # Rollout Intelligence: sample 5 devices and simulate their rollout
            sample_devices = devices[:5] if devices else []
            intelligence = []
            for d in sample_devices:
                for f in features:
                    hash_val = mmh3.hash(d['device_id'], seed=42)
                    normalized_hash = abs(hash_val) % 100
                    
                    is_eligible = normalized_hash < f['rollout_percentage']
                    if f['rollout_percentage'] >= 100:
                        is_eligible = True
                    elif f['rollout_percentage'] <= 0:
                        is_eligible = False
                        
                    is_enabled_final = bool(f['is_enabled']) and is_eligible
                    if not bool(f['is_enabled']):
                        is_enabled_final = False

                    intelligence.append({
                        'device_id': d['device_id'],
                        'feature_name': f['feature_name'],
                        'hash_value': hash_val,
                        'normalized_hash': normalized_hash,
                        'rollout_percentage': f['rollout_percentage'],
                        'is_enabled': is_enabled_final
                    })
            
        return jsonify({
            "features": features,
            "devices": devices,
            "analytics": analytics,
            "timeline": timeline,
            "active_devices": active_devices,
            "total_events": total_events,
            "failed_events": failed_events,
            "history": history,
            "live_feed": live_feed,
            "intelligence": intelligence
        })
    finally:
        conn.close()

if __name__ == '__main__':
    # Start the background simulator thread
    from simulator import start_simulator
    simulator_thread = threading.Thread(target=start_simulator, daemon=True)
    simulator_thread.start()
    
    app.run(host='0.0.0.0', port=5000, debug=False)
