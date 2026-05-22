import os
import time
import random
import pymysql
import mmh3
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables from the .env file in the same directory as this script
base_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(base_dir, '.env'))

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

def get_db_connection():
    return pymysql.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        user=os.getenv("DB_USER", "flag_user"),
        password=os.getenv("DB_PASSWORD", "flag_password"),
        database=os.getenv("DB_NAME", "flagforge"),
        cursorclass=pymysql.cursors.DictCursor
    )

def start_simulator():
    print("Starting background simulator...")
    time.sleep(2) # Give main app a moment to start
    
    # Generate 250 realistic-looking mock device IDs
    sim_users = [f"device_sim_{str(i).zfill(3)}_{random.randint(1000,9999)}" for i in range(1, 251)]
    features = ['new_transfer_ui', 'biometric_login', 'spending_analytics']
    
    # Define user types for more realistic traffic
    # 10% Heavy Users, 60% Normal, 20% Occasional, 10% Inactive
    heavy_users = sim_users[:25]
    normal_users = sim_users[25:175]
    occasional_users = sim_users[175:225]
    inactive_users = sim_users[225:]
    
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

    # Feature specific health (to make analytics interesting)
    feature_failure_rates = {
        'new_transfer_ui': 0.05,
        'biometric_login': 0.02,
        'spending_analytics': 0.12  # Simulate a "buggy" rollout
    }

    while True:
        try:
            conn = get_db_connection()
            
            with conn.cursor() as cursor:
                # Prune analytics older than 10 minutes to keep database size stable
                cursor.execute("DELETE FROM analytics WHERE timestamp < NOW() - INTERVAL 10 MINUTE")
                conn.commit()
                
                cursor.execute("SELECT feature_name, is_enabled, rollout_percentage FROM feature_flags")
                flags = cursor.fetchall()
            
            flag_map = {f['feature_name']: f for f in flags}
            db_features = [f['feature_name'] for f in flags] if flags else features
            
            # Simulate 15-40 actions every loop to create varied traffic
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

                if f_data:
                    is_enabled = is_feature_enabled_for_device(
                        user_id, 
                        bool(f_data['is_enabled']), 
                        f_data['rollout_percentage']
                    )
                    
                    if is_enabled:
                        # Use feature-specific failure rates
                        usage_status = 'used' if random.random() > feature_failure_rates.get(feature, 0.05) else 'failed'
                        
                        # Sometimes simulate events slightly in the past to make graphs less spiky
                        seconds_offset = random.randint(0, 4)
                        timestamp = datetime.now() - timedelta(seconds=seconds_offset)
                        
                        with conn.cursor() as cursor:
                            cursor.execute(
                                "INSERT INTO analytics (device_id, feature_name, usage_status, timestamp) VALUES (%s, %s, %s, %s)",
                                (user_id, feature, usage_status, timestamp)
                            )
                        conn.commit()
            conn.close()
        except Exception as e:
            print(f"Simulator error: {e}")
            
        # Poll every 2 to 4 seconds for lively UI
        time.sleep(random.uniform(2.0, 4.0))
