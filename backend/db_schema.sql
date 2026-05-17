CREATE DATABASE IF NOT EXISTS flagforge;
USE flagforge;

CREATE TABLE IF NOT EXISTS feature_flags (
    feature_name VARCHAR(100) PRIMARY KEY,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    rollout_percentage INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feature_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    feature_name VARCHAR(100) NOT NULL,
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
    feature_name VARCHAR(100),
    usage_status VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert the initial feature flags
INSERT IGNORE INTO feature_flags (feature_name, is_enabled, rollout_percentage) VALUES 
('new_transfer_ui', FALSE, 0),
('biometric_login', FALSE, 0),
('spending_analytics', FALSE, 0);

-- Also insert initial state into history
INSERT INTO feature_history (feature_name, is_enabled, rollout_percentage) VALUES 
('new_transfer_ui', FALSE, 0),
('biometric_login', FALSE, 0),
('spending_analytics', FALSE, 0);
