import os
import json
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

def evaluate_condition_v2(attribute, operator, expected_value, context):
    """
    Evaluates a condition using custom targeting rules operators.
    Supports EQUALS, NOT_EQUALS, GREATER_THAN_OR_EQUAL, LESS_THAN_OR_EQUAL, IN_LIST.
    """
    actual_value = None
    if attribute in context:
        actual_value = context.get(attribute)
    elif 'attributes' in context and isinstance(context['attributes'], dict):
        actual_value = context['attributes'].get(attribute)
        
    if actual_value is None:
        return False

    actual_str = str(actual_value).strip()
    expected_str = str(expected_value).strip()

    if operator == 'EQUALS':
        return actual_str.lower() == expected_str.lower()
    elif operator == 'NOT_EQUALS':
        return actual_str.lower() != expected_str.lower()
    elif operator == 'GREATER_THAN_OR_EQUAL':
        try:
            return float(actual_value) >= float(expected_value)
        except (ValueError, TypeError):
            return False
    elif operator == 'LESS_THAN_OR_EQUAL':
        try:
            return float(actual_value) <= float(expected_value)
        except (ValueError, TypeError):
            return False
    elif operator == 'BETWEEN':
        try:
            val_str = str(expected_value).strip()
            if '-' in val_str:
                parts = val_str.split('-')
                min_val = float(parts[0].strip())
                max_val = float(parts[1].strip())
            elif ',' in val_str:
                parts = val_str.split(',')
                min_val = float(parts[0].strip())
                max_val = float(parts[1].strip())
            else:
                min_val = float(val_str)
                max_val = float(val_str)
            return min_val <= float(actual_value) <= max_val
        except (ValueError, TypeError, IndexError):
            return False
    elif operator in ('IN_LIST', 'IN'):
        if isinstance(expected_value, list):
            list_values = [str(v).strip().lower() for v in expected_value]
        elif isinstance(expected_value, str):
            list_values = [v.strip().lower() for v in expected_value.split(',')]
        else:
            list_values = [str(expected_value).strip().lower()]
        return actual_str.lower() in list_values
    elif operator in ('NOT_IN', 'NOT_IN_LIST'):
        if isinstance(expected_value, list):
            list_values = [str(v).strip().lower() for v in expected_value]
        elif isinstance(expected_value, str):
            list_values = [v.strip().lower() for v in expected_value.split(',')]
        else:
            list_values = [str(expected_value).strip().lower()]
        return actual_str.lower() not in list_values
    return False

def evaluate_flag_detailed(flag_data, context):
    """
    Dynamically evaluates a flag configuration against the provided context.
    Returns a tuple (is_enabled, matched_rule_id).
    """
    is_enabled = bool(flag_data.get('is_enabled', False))
    is_active = bool(flag_data.get('is_active', True))
    fallback_val = bool(flag_data.get('fallback_value', False))
    if not is_enabled or not is_active:
        return fallback_val, 'default'

    rules_json = flag_data.get('rules_json')
    rules = []
    if isinstance(rules_json, str):
        try:
            rules = json.loads(rules_json)
        except Exception:
            pass
    elif isinstance(rules_json, list):
        rules = rules_json

    device_id = context.get('device_id') or context.get('user_id') or ''
    global_rollout = flag_data.get('rollout_percentage', 0)

    # Helper to check if a user is within the global rollout bucket
    def is_rolled_out():
        if global_rollout >= 100:
            return True
        if global_rollout <= 0:
            return False
        hash_val = mmh3.hash(device_id, seed=42)
        normalized_hash = abs(hash_val) % 100
        return normalized_hash < global_rollout

    for rule in rules:
        rule_id = rule.get('rule_id') or rule.get('id') or 'default_rule'
        if 'attribute' in rule:
            attribute = rule.get('attribute')
            operator = rule.get('operator')
            expected_value = rule.get('value')
            
            if evaluate_condition_v2(attribute, operator, expected_value, context):
                serve_val = bool(rule.get('serve_value', False))
                # Gate through rollout percentage: only serve to the configured % of matched users
                if serve_val and not is_rolled_out():
                    return fallback_val, rule_id
                return serve_val, rule_id
        else:
            conditions = rule.get('conditions', [])
            if not conditions:
                continue
            matches_all = True
            for cond in conditions:
                if not evaluate_condition_v2(cond.get('attribute'), cond.get('operator'), cond.get('value'), context):
                    matches_all = False
                    break
            
            if matches_all:
                serve_val = rule.get('value') if 'value' in rule else True
                if 'serve_value' in rule:
                    serve_val = rule['serve_value']
                serve_val = bool(serve_val)
                # Gate through rollout percentage
                if serve_val and not is_rolled_out():
                    return fallback_val, rule_id
                return serve_val, rule_id

    # If no rules defined, fallback to global rollout percentage
    if not rules:
        if is_rolled_out():
            return True, 'default'
        else:
            return fallback_val, 'default'

    return fallback_val, 'default'

def is_feature_enabled_for_device(device_id, is_globally_enabled, rollout_percentage):
    if not is_globally_enabled:
        return False
    if rollout_percentage >= 100:
        return True
    if rollout_percentage <= 0:
        return False
    
    hash_val = mmh3.hash(device_id, seed=42)
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
            cursor.execute("SELECT flag_key AS feature_name, is_enabled, rollout_percentage FROM feature_flags")
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

@app.route('/evaluate-features', methods=['POST'])
def evaluate_features():
    data = request.json or {}
    device_id = data.get('device_id')
    if not device_id:
        return jsonify({"error": "device_id is required in post body"}), 400

    environment = data.get('environment', 'production')
    attributes = data.get('attributes', {})
    
    context = {
        "device_id": device_id,
        "environment": environment,
        "attributes": attributes
    }

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT flag_key, display_name, description, is_active, 
                       rules_json, fallback_value, is_enabled, rollout_percentage 
                FROM feature_flags
            """)
            flags = cursor.fetchall()
            
            result = {}
            for flag in flags:
                is_enabled, _ = evaluate_flag_detailed(flag, context)
                result[flag['flag_key']] = is_enabled
        return jsonify(result)
    finally:
        conn.close()

@app.route('/register-device', methods=['POST'])
def register_device():
    data = request.json or {}
    device_id = data.get('device_id')
    device_name = data.get('device_name', 'Unknown Device')
    
    if not device_id:
        return jsonify({"error": "device_id is required"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
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
    data = request.json or {}
    device_id = data.get('device_id')
    feature_name = data.get('feature_name') or data.get('flag_key')
    usage_status = data.get('usage_status', 'used')
    
    if not device_id or not feature_name:
        return jsonify({"error": "Missing parameters"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "INSERT INTO analytics (device_id, flag_key, usage_status) VALUES (%s, %s, %s)",
                (device_id, feature_name, usage_status)
            )
            conn.commit()
        return jsonify({"status": "success"})
    finally:
        conn.close()

@app.route('/add-feature', methods=['POST'])
def add_feature():
    data = request.json or {}
    feature_name = data.get('feature_name') or data.get('flag_key')
    is_enabled = data.get('is_enabled')
    rollout_percentage = data.get('rollout_percentage')

    if feature_name is None or is_enabled is None or rollout_percentage is None:
        return jsonify({"error": "Missing required parameters (feature_name, is_enabled, rollout_percentage)"}), 400

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
            cursor.execute(
                "SELECT 1 FROM feature_flags WHERE flag_key = %s",
                (sanitized_name,)
            )
            if cursor.fetchone():
                return jsonify({"error": f"Feature flag '{sanitized_name}' already exists"}), 409

            cursor.execute(
                """
                INSERT INTO feature_flags 
                (flag_key, display_name, description, is_enabled, rollout_percentage, rules_json, is_active, fallback_value) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (sanitized_name, feature_name, "", bool(is_enabled), rollout_percentage, '[]', True, False)
            )

            cursor.execute(
                "INSERT INTO feature_history (flag_key, is_enabled, rollout_percentage) VALUES (%s, %s, %s)",
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
    data = request.json or {}
    feature_name = data.get('feature_name') or data.get('flag_key')
    if not feature_name:
        return jsonify({"error": "Missing feature_name or flag_key"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT 1 FROM feature_flags WHERE flag_key = %s",
                (feature_name,)
            )
            if not cursor.fetchone():
                return jsonify({"error": f"Feature flag '{feature_name}' not found"}), 404

            cursor.execute("DELETE FROM feature_flags WHERE flag_key = %s", (feature_name,))
            cursor.execute("DELETE FROM feature_history WHERE flag_key = %s", (feature_name,))
            cursor.execute("DELETE FROM analytics WHERE flag_key = %s", (feature_name,))

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
    data = request.json or {}
    feature_name = data.get('feature_name') or data.get('flag_key')
    is_enabled = data.get('is_enabled')
    rollout_percentage = data.get('rollout_percentage')
    display_name = data.get('display_name')
    description = data.get('description')
    is_active = data.get('is_active')
    fallback_value = data.get('fallback_value')
    rules_json = data.get('rules_json')

    if feature_name is None:
        return jsonify({"error": "Missing feature_name or flag_key"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM feature_flags WHERE flag_key = %s",
                (feature_name,)
            )
            current = cursor.fetchone()
            if not current:
                return jsonify({"error": f"Feature flag '{feature_name}' not found"}), 404

            new_is_enabled = is_enabled if is_enabled is not None else current['is_enabled']
            new_rollout_percentage = rollout_percentage if rollout_percentage is not None else current['rollout_percentage']
            new_display_name = display_name if display_name is not None else current['display_name']
            new_description = description if description is not None else current['description']
            new_is_active = is_active if is_active is not None else current['is_active']
            new_fallback_value = fallback_value if fallback_value is not None else current['fallback_value']
            
            new_rules_json = rules_json if rules_json is not None else current['rules_json']
            if isinstance(new_rules_json, (list, dict)):
                new_rules_json = json.dumps(new_rules_json)

            cursor.execute(
                "INSERT INTO feature_history (flag_key, is_enabled, rollout_percentage) VALUES (%s, %s, %s)",
                (feature_name, current['is_enabled'], current['rollout_percentage'])
            )

            cursor.execute("""
                UPDATE feature_flags 
                SET is_enabled = %s, rollout_percentage = %s, display_name = %s, 
                    description = %s, is_active = %s, fallback_value = %s, rules_json = %s 
                WHERE flag_key = %s
            """, (new_is_enabled, new_rollout_percentage, new_display_name, 
                  new_description, new_is_active, new_fallback_value, new_rules_json, feature_name))
            
            conn.commit()
        return jsonify({"status": "success"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        conn.close()

@app.route('/rollback-feature', methods=['POST'])
def rollback_feature():
    data = request.json or {}
    feature_name = data.get('feature_name') or data.get('flag_key')
    
    if not feature_name:
        return jsonify({"error": "Missing feature_name or flag_key"}), 400
        
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT is_enabled, rollout_percentage FROM feature_history WHERE flag_key = %s ORDER BY changed_at DESC LIMIT 1",
                (feature_name,)
            )
            last_state = cursor.fetchone()
            
            if not last_state:
                return jsonify({"error": "No history found for this feature"}), 404
                
            cursor.execute(
                "UPDATE feature_flags SET is_enabled = %s, rollout_percentage = %s WHERE flag_key = %s",
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
    except Exception as e:
        conn.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        conn.close()

@app.route('/dashboard-data', methods=['GET'])
def get_dashboard_data():
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Get features
            cursor.execute("""
                SELECT flag_key, flag_key AS feature_name, display_name, description, 
                       is_active, rules_json, fallback_value, is_enabled, rollout_percentage 
                FROM feature_flags
            """)
            features = cursor.fetchall()
            
            # Get devices
            cursor.execute("SELECT device_id, device_name, registration_time FROM devices ORDER BY registration_time DESC")
            devices = cursor.fetchall()
            for d in devices:
                d['registration_time'] = d['registration_time'].isoformat() if d['registration_time'] else None
            
            # Get analytics summary (last 10 minutes)
            cursor.execute('''
                SELECT flag_key AS feature_name, flag_key, usage_status, COUNT(*) as count 
                FROM analytics 
                WHERE timestamp >= NOW() - INTERVAL 10 MINUTE
                GROUP BY flag_key, usage_status
            ''')
            analytics = cursor.fetchall()
            
            # Get timeline data (last 10 minutes, grouped by minute)
            cursor.execute('''
                SELECT flag_key AS feature_name, flag_key, 
                       DATE_FORMAT(timestamp, '%H:%i') as minute, 
                       COUNT(*) as count 
                FROM analytics 
                WHERE timestamp >= NOW() - INTERVAL 10 MINUTE
                GROUP BY flag_key, minute
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
                SELECT flag_key AS feature_name, COUNT(*) as usage_count 
                FROM analytics 
                GROUP BY flag_key 
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
                SELECT flag_key AS feature_name, flag_key, is_enabled, rollout_percentage, changed_at
                FROM feature_history
                ORDER BY changed_at DESC LIMIT 5
            ''')
            history = cursor.fetchall()
            for h in history:
                h['changed_at'] = h['changed_at'].isoformat() if h['changed_at'] else None

            # Live Feed (Last 20 events)
            cursor.execute('''
                SELECT device_id, flag_key AS feature_name, flag_key, usage_status, timestamp
                FROM analytics
                ORDER BY timestamp DESC LIMIT 20
            ''')
            live_feed = cursor.fetchall()
            for l in live_feed:
                l['timestamp'] = l['timestamp'].isoformat() if l['timestamp'] else None

            # Rollout Intelligence: sample 10 devices and simulate their rollout
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
                SELECT flag_key AS feature_name, flag_key, COUNT(DISTINCT device_id) as unique_users 
                FROM analytics 
                WHERE timestamp >= NOW() - INTERVAL 10 MINUTE
                GROUP BY flag_key
            ''')
            adoption = cursor.fetchall()
            for a in adoption:
                a['adoption_percentage'] = round((a['unique_users'] / total_devices_count * 100), 1) if total_devices_count > 0 else 0
            
            # Fetch raw analytics for targeting and demographic metrics
            cursor.execute('''
                SELECT usage_status, context_json, matched_rule_id 
                FROM analytics 
                WHERE timestamp >= NOW() - INTERVAL 10 MINUTE
            ''')
            raw_analytics = cursor.fetchall()

            # Rule match analytics
            rule_counts = {}
            for row in raw_analytics:
                rule_id = row['matched_rule_id'] or 'default'
                rule_counts[rule_id] = rule_counts.get(rule_id, 0) + 1
            rule_match_analytics = [{"matched_rule_id": k, "count": v} for k, v in rule_counts.items()]

            # Geospatial adoption
            geo_counts = {}
            for row in raw_analytics:
                if row['context_json']:
                    try:
                        ctx = json.loads(row['context_json']) if isinstance(row['context_json'], str) else row['context_json']
                        loc = ctx.get('location') or ctx.get('country') or 'Unknown'
                        geo_counts[loc] = geo_counts.get(loc, 0) + 1
                    except Exception:
                        pass
            geospatial_adoption = [{"location": k, "count": v} for k, v in geo_counts.items()]

            # Device type distribution
            device_counts = {}
            for row in raw_analytics:
                if row['context_json']:
                    try:
                        ctx = json.loads(row['context_json']) if isinstance(row['context_json'], str) else row['context_json']
                        dev = ctx.get('device_type') or 'Unknown'
                        device_counts[dev] = device_counts.get(dev, 0) + 1
                    except Exception:
                        pass
            device_distribution = [{"device_type": k, "count": v} for k, v in device_counts.items()]

            # Age cohort saturation
            cohort_data = {
                'Under 18': {'success': 0, 'total': 0},
                '18-25': {'success': 0, 'total': 0},
                '26-45': {'success': 0, 'total': 0},
                '46+': {'success': 0, 'total': 0}
            }
            for row in raw_analytics:
                if row['context_json']:
                    try:
                        ctx = json.loads(row['context_json']) if isinstance(row['context_json'], str) else row['context_json']
                        age = ctx.get('age')
                        if age is not None:
                            age = int(age)
                            if age < 18:
                                cohort = 'Under 18'
                            elif age <= 25:
                                cohort = '18-25'
                            elif age <= 45:
                                cohort = '26-45'
                            else:
                                cohort = '46+'
                            
                            cohort_data[cohort]['total'] += 1
                            if row['usage_status'] == 'used':
                                cohort_data[cohort]['success'] += 1
                    except Exception:
                        pass
            
            age_cohort_saturation = []
            for cohort, stats in cohort_data.items():
                ratio = round((stats['success'] / stats['total'] * 100), 1) if stats['total'] > 0 else 0.0
                age_cohort_saturation.append({
                    "cohort": cohort,
                    "activation_ratio": ratio
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
            "intelligence": intelligence,
            "success_rate": success_rate,
            "most_used_feature": most_used_feature,
            "adoption": adoption,
            "avg_usage": avg_usage,
            "total_devices_count": total_devices_count,
            "rule_match_analytics": rule_match_analytics,
            "geospatial_adoption": geospatial_adoption,
            "device_distribution": device_distribution,
            "age_cohort_saturation": age_cohort_saturation
        })
    finally:
        conn.close()

if __name__ == '__main__':
    # Start the background simulator thread
    from simulator import start_simulator
    simulator_thread = threading.Thread(target=start_simulator, daemon=True)
    simulator_thread.start()
    
    app.run(host='0.0.0.0', port=5000, debug=False)
