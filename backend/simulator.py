import os
import time
import random
import json
import pymysql
import mmh3
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables from the .env file in the same directory as this script
base_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(base_dir, '.env'))

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
    Also handles legacy IN/NOT_IN/etc for safety.
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
    1. Short-circuits and returns (fallback_value, 'default') if is_enabled (or is_active) is FALSE.
    2. Sequentially evaluates the targeting rules in rules_json.
    3. If a rule matches, evaluates the global rollout_percentage via MurmurHash3 and returns (serve_value, rule_id) or (fallback_value, rule_id).
    4. If no rules match, falls back to default global rollout percentage (if rules_json is empty) or returns (fallback_value, 'default').
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
            # New Flat Rule format
            attribute = rule.get('attribute')
            operator = rule.get('operator')
            expected_value = rule.get('value')
            
            if evaluate_condition_v2(attribute, operator, expected_value, context):
                if is_rolled_out():
                    return bool(rule.get('serve_value', False)), rule_id
                else:
                    return fallback_val, rule_id
        else:
            # Legacy Nested conditions rules format
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
                
                if is_rolled_out():
                    return bool(serve_val), rule_id
                else:
                    return fallback_val, rule_id

    # If no rules match, fallback to global rollout percentage only if rules_json is empty
    if not rules:
        if is_rolled_out():
            return True, 'default'
        else:
            return fallback_val, 'default'

    return fallback_val, 'default'


def evaluate_flag(flag_data, context):
    """
    Dynamically evaluates a flag configuration against the provided context.
    Maintained for backward compatibility.
    """
    return evaluate_flag_detailed(flag_data, context)[0]


def start_simulator():
    print("Starting background simulator...")
    time.sleep(2) # Give main app a moment to start
    
    # Generate 250 realistic-looking mock device IDs
    sim_users = [f"device_sim_{str(i).zfill(3)}_{random.randint(1000,9999)}" for i in range(1, 251)]
    default_features = ['new_transfer_ui', 'biometric_login', 'spending_analytics']
    
    # Define user types for more realistic traffic
    heavy_users = sim_users[:25]
    normal_users = sim_users[25:175]
    occasional_users = sim_users[175:225]
    
    # Register devices on startup
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            for user in sim_users:
                cursor.execute(
                    "INSERT IGNORE INTO devices (device_id, device_name) VALUES (%s, %s)",
                    (user, f"Simulated Phone {user[-4:]}")
                )
        conn.commit()
        conn.close()
        print(f"Registered {len(sim_users)} simulated devices.")
    except Exception as e:
        print(f"Simulator init error: {e}")

    # Feature specific health failure rates (to make analytics interesting)
    feature_failure_rates = {
        'new_transfer_ui': 0.05,
        'biometric_login': 0.02,
        'spending_analytics': 0.12,
        'card_tab': 0.04
    }

    countries = ["IN", "US", "GB", "DE", "CA", "FR", "JP"]
    platforms = ["flutter_ios", "flutter_android", "react_web"]
    environments = ["production", "staging", "development"]

    while True:
        try:
            conn = get_db_connection()
            
            with conn.cursor() as cursor:
                # Prune analytics older than 10 minutes to keep database size stable
                cursor.execute("DELETE FROM analytics WHERE timestamp < NOW() - INTERVAL 10 MINUTE")
                conn.commit()
                
                # Fetch migrated feature flags
                cursor.execute("""
                    SELECT flag_key, display_name, description, is_active, 
                           rules_json, fallback_value, is_enabled, rollout_percentage 
                    FROM feature_flags
                """)
                flags = cursor.fetchall()
            
            if flags:
                flag_map = {f['flag_key']: f for f in flags}
                db_features = [f['flag_key'] for f in flags]
            else:
                flag_map = {}
                db_features = default_features
            
            # Simulate 20-60 actions every loop to create varied traffic
            num_actions = random.randint(20, 60)
            
            for _ in range(num_actions):
                # Weighted choice for user activity
                rand = random.random()
                if rand < 0.5: # Heavy users provide 50% of traffic
                    user_id = random.choice(heavy_users)
                elif rand < 0.9: # Normal users 40%
                    user_id = random.choice(normal_users)
                else: # Occasional users 10%
                    user_id = random.choice(occasional_users)

                feature = random.choice(db_features)
                f_data = flag_map.get(feature)

                # Generate a dynamic client context object for the evaluation
                platform_choice = random.choices(platforms, weights=[40, 40, 20], k=1)[0]
                device_type_choice = "iOS" if "ios" in platform_choice else ("Android" if "android" in platform_choice else "Web")
                country_choice = random.choices(countries, weights=[50, 20, 10, 10, 5, 3, 2], k=1)[0]

                context = {
                    "device_id": user_id,
                    "environment": random.choices(environments, weights=[80, 15, 5], k=1)[0],
                    "attributes": {
                        "age": random.randint(12, 65),
                        "device_type": device_type_choice,
                        "gender": random.choice(["male", "female"]),
                        "location": country_choice,
                        "country": country_choice, # Keep country for backward compatibility
                        "beta_tester": random.random() < 0.15,
                        "app_version": random.choice(["1.2.0", "2.0.0", "2.1.1"])
                    }
                }

                # Evaluate the flag dynamically using the dynamic context
                matched_rule_id = 'default'
                if f_data:
                    is_enabled, matched_rule_id = evaluate_flag_detailed(f_data, context)
                else:
                    # Generic fallback if database row was not retrieved
                    is_enabled = False

                if is_enabled:
                    # Use feature-specific failure rates
                    failure_rate = feature_failure_rates.get(feature, 0.05)
                    usage_status = 'used' if random.random() > failure_rate else 'failed'
                    
                    # Sometimes simulate events slightly in the past to make graphs less spiky
                    seconds_offset = random.randint(0, 4)
                    timestamp = datetime.now() - timedelta(seconds=seconds_offset)
                    
                    # Save exact context demographics: age, gender, device_type, and location
                    log_context = {
                        "age": context["attributes"]["age"],
                        "gender": context["attributes"]["gender"],
                        "device_type": context["attributes"]["device_type"],
                        "location": context["attributes"]["location"]
                    }
                    
                    with conn.cursor() as cursor:
                        cursor.execute("""
                            INSERT INTO analytics (device_id, flag_key, usage_status, timestamp, context_json, matched_rule_id) 
                            VALUES (%s, %s, %s, %s, %s, %s)
                        """, (user_id, feature, usage_status, timestamp, json.dumps(log_context), matched_rule_id))
                    conn.commit()
                    
            conn.close()
        except Exception as e:
            print(f"Simulator error: {e}")
            
        # Poll every 2 to 4 seconds for lively UI
        time.sleep(random.uniform(2.0, 4.0))
