CREATE DATABASE IF NOT EXISTS flagforge;
USE flagforge;

CREATE TABLE IF NOT EXISTS feature_flags (
    flag_key VARCHAR(100) PRIMARY KEY,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    rules_json JSON DEFAULT NULL,
    fallback_value BOOLEAN NOT NULL DEFAULT FALSE,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    rollout_percentage INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feature_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    flag_key VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN NOT NULL,
    rollout_percentage INT NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS devices (
    device_id VARCHAR(255) PRIMARY KEY,
    device_name VARCHAR(255),
    registration_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(255),
    flag_key VARCHAR(100),
    usage_status VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    context_json JSON DEFAULT NULL,
    matched_rule_id VARCHAR(100) DEFAULT 'default'
);

-- Insert the initial feature flags with targeting rules
INSERT IGNORE INTO feature_flags (flag_key, display_name, description, is_active, rules_json, fallback_value, is_enabled, rollout_percentage) VALUES 
('new_transfer_ui', 'New Transfer UI', 'Enterprise targeting flag for New Transfer UI module.', TRUE, '[{"rule_id": "rule_loc_in", "attribute": "location", "operator": "EQUALS", "value": "IN", "serve_value": true}]', FALSE, TRUE, 100),
('biometric_login', 'Biometric Login', 'Enterprise targeting flag for Biometric Login module.', TRUE, '[{"rule_id": "rule_device_ios", "attribute": "device_type", "operator": "EQUALS", "value": "iOS", "serve_value": true}]', FALSE, TRUE, 100),
('spending_analytics', 'Spending Analytics', 'Enterprise targeting flag for Spending Analytics module.', TRUE, '[{"rule_id": "rule_age_18", "attribute": "age", "operator": "GREATER_THAN_OR_EQUAL", "value": "18", "serve_value": true}]', FALSE, TRUE, 100);

-- Also insert initial state into history
INSERT INTO feature_history (flag_key, is_enabled, rollout_percentage) VALUES 
('new_transfer_ui', TRUE, 100),
('biometric_login', TRUE, 100),
('spending_analytics', TRUE, 100);
