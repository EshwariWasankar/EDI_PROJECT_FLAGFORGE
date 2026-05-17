import os
import time
import random
import pymysql
import mmh3
from datetime import datetime, timedelta

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
    
    # Generate 200 realistic-looking mock device IDs
    sim_users = [f"device_sim_{str(i).zfill(3)}_{random.randint(1000,9999)}" for i in range(1, 201)]
    features = ['new_transfer_ui', 'biometric_login', 'spending_analytics']
    
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

    while True:
        try:
            conn = get_db_connection()
            
            with conn.cursor() as cursor:
                cursor.execute("SELECT feature_name, is_enabled, rollout_percentage FROM feature_flags")
                flags = cursor.fetchall()
            
            flag_map = {f['feature_name']: f for f in flags}
            
            # Simulate 15-40 actions every loop to create varied traffic
            num_actions = random.randint(15, 40)
            
            for _ in range(num_actions):
                # Introduce some heavy users by tweaking random choice
                user_id = random.choice(sim_users)
                feature = random.choice(features)
                
                f_data = flag_map.get(feature)
                if f_data:
                    is_enabled = is_feature_enabled_for_device(
                        user_id, 
                        bool(f_data['is_enabled']), 
                        f_data['rollout_percentage']
                    )
                    
                    if is_enabled:
                        # 90% success rate, 10% failure to make charts interesting
                        usage_status = 'used' if random.random() < 0.9 else 'failed'
                        
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

