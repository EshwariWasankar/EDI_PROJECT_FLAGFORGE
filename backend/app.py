import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import pymysql
import mmh3
from dotenv import load_dotenv
import threading

# Load environment variables from the .env file in the same directory as this script
base_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(base_dir, '.env'))

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

@app.route('/add-feature', methods=['POST'])
def add_feature():
    data = request.json
    if not data:
        return jsonify({"error": "No JSON payload provided"}), 400

    feature_name = data.get('feature_name')
    is_enabled = data.get('is_enabled')
    rollout_percentage = data.get('rollout_percentage')

    if feature_name is None or is_enabled is None or rollout_percentage is None:
        return jsonify({"error": "Missing required parameters (feature_name, is_enabled, rollout_percentage)"}), 400

    # Sanitize the feature_name: convert to lowercase, replace spaces with underscores.
    sanitized_name = str(feature_name).strip().lower().replace(" ", "_")
    if not sanitized_name:
        return jsonify({"error": "Feature name cannot be empty"}), 400

    try:
        rollout_percentage = int(rollout_percentage)
        if not (0 <= rollout_percentage <= 100):
            return jsonify({"error": "rollout_percentage must be between 0 and 100"}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "rollout_percentage must be an integer"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Check if the feature already exists
            cursor.execute(
                "SELECT 1 FROM feature_flags WHERE feature_name = %s",
                (sanitized_name,)
            )
            if cursor.fetchone():
                return jsonify({"error": f"Feature flag '{sanitized_name}' already exists"}), 409

            # Insert into feature_flags table
            cursor.execute(
                "INSERT INTO feature_flags (feature_name, is_enabled, rollout_percentage) VALUES (%s, %s, %s)",
                (sanitized_name, bool(is_enabled), rollout_percentage)
            )

            # Insert initial baseline record into feature_history
            cursor.execute(
                "INSERT INTO feature_history (feature_name, is_enabled, rollout_percentage) VALUES (%s, %s, %s)",
                (sanitized_name, bool(is_enabled), rollout_percentage)
            )

            conn.commit()
        return jsonify({
            "status": "success", 
            "message": "Feature flag created successfully", 
            "feature_name": sanitized_name
        }), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        conn.close()

@app.route('/delete-feature', methods=['POST'])
def delete_feature():
    data = request.json
    if not data:
        return jsonify({"error": "No JSON payload provided"}), 400

    feature_name = data.get('feature_name')
    if not feature_name:
        return jsonify({"error": "Missing feature_name"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Check if the feature flag exists
            cursor.execute(
                "SELECT 1 FROM feature_flags WHERE feature_name = %s",
                (feature_name,)
            )
            if not cursor.fetchone():
                return jsonify({"error": f"Feature flag '{feature_name}' not found"}), 404

            # Delete from feature_flags
            cursor.execute(
                "DELETE FROM feature_flags WHERE feature_name = %s",
                (feature_name,)
            )
            # Delete from feature_history
            cursor.execute(
                "DELETE FROM feature_history WHERE feature_name = %s",
                (feature_name,)
            )
            # Delete from analytics
            cursor.execute(
                "DELETE FROM analytics WHERE feature_name = %s",
                (feature_name,)
            )

            conn.commit()
        return jsonify({
            "status": "success", 
            "message": f"Feature flag '{feature_name}' deleted successfully"
        }), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
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
            
            # Get analytics summary (last 10 minutes)
            cursor.execute('''
                SELECT feature_name, usage_status, COUNT(*) as count 
                FROM analytics 
                WHERE timestamp >= NOW() - INTERVAL 10 MINUTE
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

            # Total Events & Failed Events (last 10 minutes)
            cursor.execute("SELECT COUNT(*) as total FROM analytics WHERE timestamp >= NOW() - INTERVAL 10 MINUTE")
            total_events = cursor.fetchone()['total']

            cursor.execute("SELECT COUNT(*) as failed FROM analytics WHERE usage_status = 'failed' AND timestamp >= NOW() - INTERVAL 10 MINUTE")
            failed_events = cursor.fetchone()['failed']

            # Success Rate Calculation
            success_rate = round(((total_events - failed_events) / total_events * 100), 1) if total_events > 0 else 0

            # Most Used Feature
            cursor.execute('''
                SELECT feature_name, COUNT(*) as usage_count 
                FROM analytics 
                GROUP BY feature_name 
                ORDER BY usage_count DESC LIMIT 1
            ''')
            most_used_data = cursor.fetchone()
            most_used_feature = most_used_data['feature_name'] if most_used_data else "None"

            # Average Feature Usage per Active User
            cursor.execute("SELECT COUNT(DISTINCT device_id) as active_total FROM analytics")
            unique_active = cursor.fetchone()['active_total']
            avg_usage = round(total_events / unique_active, 1) if unique_active > 0 else 0

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
            sample_devices = devices[:10] if devices else []
            intelligence = []
            for d in sample_devices:
                for f in features:
                    hash_val = mmh3.hash(d['device_id'], seed=42)
                    normalized_hash = abs(hash_val) % 100
                    
                    is_eligible = normalized_hash < int(f['rollout_percentage'])
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

            # Adoption Rate (Users per feature - last 10 minutes)
            cursor.execute("SELECT COUNT(*) as total_devices FROM devices")
            total_devices_count = cursor.fetchone()['total_devices']

            cursor.execute('''
                SELECT feature_name, COUNT(DISTINCT device_id) as unique_users 
                FROM analytics 
                WHERE timestamp >= NOW() - INTERVAL 10 MINUTE
                GROUP BY feature_name
            ''')
            adoption = cursor.fetchall()
            for a in adoption:
                a['adoption_percentage'] = round((a['unique_users'] / total_devices_count * 100), 1) if total_devices_count > 0 else 0
            
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
            "intelligence": intelligence,
            "success_rate": success_rate,
            "most_used_feature": most_used_feature,
            "adoption": adoption,
            "avg_usage": avg_usage,
            "total_devices_count": total_devices_count
        })
    finally:
        conn.close()

if __name__ == '__main__':
    # Start the background simulator thread
    from simulator import start_simulator
    simulator_thread = threading.Thread(target=start_simulator, daemon=True)
    simulator_thread.start()
    
    app.run(host='0.0.0.0', port=5000, debug=False)
