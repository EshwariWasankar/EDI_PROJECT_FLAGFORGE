# FlagForge: Enterprise Feature Flagging System

FlagForge is a sophisticated, enterprise-grade feature flagging and A/B testing platform designed for modern applications. It provides real-time control over feature rollouts, robust analytics, and a seamless developer experience. This project demonstrates a full-stack implementation including a Flask backend, a React dashboard, and a Flutter mobile banking application, all integrated with a MySQL database.

## Key Features

FlagForge offers a rich set of features to manage and monitor your application's features:

1.  **Deterministic Feature Toggles**:
    *   Utilizes **MurmurHash3** for consistent and deterministic feature assignment to devices.
    *   Percentage-based rollout logic for gradual feature releases.
    *   Clear visualization of the MurmurHash3 process in the dashboard ("Rollout Intelligence").

2.  **Real-time Control Dashboard (React)**:
    *   **Premium UI**: Polished dark fintech/admin theme with modern design, Lucide React icons, smooth animations, and responsive layout.
    *   **Feature Management**: Intuitive sliders and toggles to control feature rollout percentages and global enablement.
    *   **Unsaved Changes Persistence**: Toggle/slider changes persist locally until explicitly saved or rolled back, preventing accidental resets during polling.
    *   **Rollback System**: Ability to revert feature flag changes to previous states.

3.  **Comprehensive Analytics & Monitoring**:
    *   **Executive Metrics Cards**: Live Key Performance Indicator (KPI) cards displaying:
        *   Total Registered Devices
        *   Active Devices (last 5 min)
        *   Feature Adoption Rate
        *   Rollout Success Rate
        *   Total Feature Events
        *   Failed Events
        *   Average Feature Usage
        *   Most Used Feature
    *   **Live Activity Feed**: Real-time stream of feature usage events.
    *   **Feature Usage Leaderboard**: Visual ranking of feature adoption.
    *   **System Health Chart**: Success vs. Failure visualization for overall platform stability.
    *   **Recent Rollout History**: Timeline of recent feature flag changes.
    *   **Device Monitoring**: Visibility into all simulated devices and their registration status.

4.  **Robust Traffic Simulator**:
    *   Automatically registers 250-300 simulated devices.
    *   Generates realistic, continuous activity with varying usage frequencies (heavy, normal, occasional, inactive users).
    *   Simulates occasional feature failures to provide meaningful analytics.

5.  **Modern Mobile Banking App (Flutter)**:
    *   **Premium UI**: A sleek, modern banking interface with balance cards, recent transactions, and quick actions.
    *   **Dynamic Feature Updates**: UI elements and functionalities update in real-time based on feature flags from the backend.
    *   **Meaningful Feature Upgrades**:
        *   `new_transfer_ui`: Premium redesigned transfer flow with recipient cards and confirmation animations.
        *   `biometric_login`: Proper biometric settings UI and fingerprint experience.
        *   `spending_analytics`: Premium analytics screen with charts and spending categories.

## Project Structure

The project is organized into three main components:

*   `backend/`: Contains the Flask API and the Python traffic simulator.
*   `frontend/`: Contains the React-based administration dashboard.
*   `flutter_app/`: Contains the Flutter mobile banking application.

## Prerequisites

Before you begin, ensure you have the following installed:

*   **Docker Desktop** (Recommended for MySQL setup)
*   **Python 3.8+**
*   **Node.js 18+ & npm/yarn**
*   **Flutter SDK** (with Android Studio/Xcode setup for mobile development)
*   **Git**

## Setup Instructions

Follow these steps to get FlagForge up and running on your local machine.

### 1. Database Setup (MySQL)

You can choose between Docker (recommended) or a native MySQL installation.

#### Option A: Using Docker (Recommended)

1.  Open your terminal in the project root (`d:\EDI_FLAGFORGE`).
2.  Run the following command to start a MySQL 8.0 container:
    ```bash
    docker run --name flagforge-mysql -e MYSQL_ROOT_PASSWORD=rootpassword -e MYSQL_DATABASE=flagforge -e MYSQL_USER=flag_user -e MYSQL_PASSWORD=flag_password -p 3306:3306 -d mysql:8.0
    ```
3.  Apply the database schema. Ensure you have a `db_schema.sql` file in your `backend/` directory (if not, you'll need to create one with your table definitions).
    ```bash
    docker exec -i flagforge-mysql mysql -u flag_user -pflag_password flagforge < backend/db_schema.sql
    ```
    *(Replace `backend/db_schema.sql` with the actual path to your schema file if it's different).*

#### Option B: Native MySQL Installation

1.  Install MySQL Server (version 8.0+ recommended) on your system.
2.  Log into your MySQL instance (e.g., via MySQL Workbench or CLI).
3.  Execute the following SQL commands to create the database and user:
    ```sql
    CREATE DATABASE flagforge;
    CREATE USER 'flag_user'@'%' IDENTIFIED BY 'flag_password';
    GRANT ALL PRIVILEGES ON flagforge.* TO 'flag_user'@'%';
    FLUSH PRIVILEGES;
    ```
4.  Apply the database schema. Execute your `db_schema.sql` file against the `flagforge` database.
    ```bash
    mysql -u flag_user -p flagforge < backend/db_schema.sql
    ```
    *(Replace `backend/db_schema.sql` with the actual path to your schema file if it's different).*

### 2. Backend Setup (Flask)

1.  Navigate to the `backend` directory:
    ```bash
    cd d:\EDI_FLAGFORGE\backend
    ```
2.  Install Python dependencies:
    ```bash
    pip install -r requirements.txt # If you have a requirements.txt
    # OR manually install:
    pip install flask flask-cors pymysql mmh3 python-dotenv cryptography
    ```
    *(Note: `cryptography` is essential for MySQL 8+ connections. If you encounter errors, ensure it's installed.)*
3.  Create a `.env` file in the `d:\EDI_FLAGFORGE\backend\` directory with your database credentials:
    ```dotenv
    DB_HOST=127.0.0.1
    DB_USER=flag_user
    DB_PASSWORD=flag_password
    DB_NAME=flagforge
    ```
4.  Run the Flask backend server:
    ```bash
    python app.py
    ```
    The backend will start on `http://127.0.0.1:5000`. The traffic simulator will automatically start in a background thread, registering devices and generating activity.

### 3. Frontend Setup (React Dashboard)

1.  Navigate to the `frontend` directory:
    ```bash
    cd d:\EDI_FLAGFORGE\frontend
    ```
2.  Install Node.js dependencies:
    ```bash
    npm install # or yarn install
    ```
3.  Ensure your `Dashboard.jsx` file is correctly placed (e.g., in `src/`).
4.  Start the React development server:
    ```bash
    npm run dev # or yarn dev
    ```
    Open your browser to the address provided (usually `http://localhost:5173`).

### 4. Mobile App Setup (Flutter)

1.  Navigate to the `flutter_app` directory:
    ```bash
    cd d:\EDI_FLAGFORGE\flutter_app
    ```
2.  Install Flutter dependencies:
    ```bash
    flutter pub get
    ```
3.  **Important: Configure Backend URL for Mobile App**
    *   **Find your computer's local IP address**:
        *   **Windows**: Open Command Prompt and type `ipconfig`. Look for "IPv4 Address" under your active network adapter (e.g., `192.168.1.X`).
        *   **macOS/Linux**: Open Terminal and type `ifconfig` or `ip a`. Look for the IP address associated with your active network interface (e.g., `en0`, `wlan0`).
    *   Open `d:\EDI_FLAGFORGE\flutter_app\lib\main.dart` and update the `backendUrl` constant with your computer's local IP address:
        ```dart
        // --- Configuration ---
        const String backendUrl = "http://YOUR_LOCAL_IP_ADDRESS:5000"; // e.g., "http://192.168.1.100:5000"
        ```

4.  **Run on Chrome (for quick testing):**
    ```bash
    flutter run -d chrome
    ```

5.  **Run on a Physical Android Device (Recommended for full demo):**
    *   Ensure your phone is connected to the **same Wi-Fi network** as your computer.
    *   Enable Developer Options and USB Debugging on your Android phone.
    *   Connect your phone to your computer via USB.
    *   Run the app:
        ```bash
        flutter run
        ```
        (If prompted, select your physical device).

## Usage & Demonstration

1.  **Start all components**: Ensure your MySQL database, Flask backend, React dashboard, and Flutter app are all running.
2.  **Observe the Dashboard**:
    *   The "Executive Metrics" should show live updates from the simulator.
    *   The "Live Event Feed" will populate with simulated device activity.
    *   The "Device Monitoring" section will list simulated devices.
3.  **Control Features**: Use the sliders and toggles in the "Feature Management" section of the dashboard to enable/disable features and adjust rollout percentages.
4.  **See Real-time Updates**:
    *   The Flutter banking app will dynamically update its UI (e.g., new tabs, different transfer screens) based on the feature flags you set in the dashboard.
    *   Interacting with features in the Flutter app (e.g., "Transfer") will log usage events, which will appear in the dashboard's "Live Event Feed" and update metrics.
5.  **Explore Rollout Intelligence**: Understand how MurmurHash3 deterministically assigns features to devices.

## Troubleshooting

*   **`'cryptography' package is required` error**: Install it in your backend environment: `pip install cryptography`.
*   **Flutter app cannot connect to backend**:
    *   Verify your computer's local IP address and ensure it's correctly set in `flutter_app/lib/main.dart`.
    *   Ensure your computer and phone are on the same Wi-Fi network.
    *   Check your computer's firewall settings to ensure port `5000` is open for incoming connections.
*   **Flutter build errors (`disk space`, `caches`)**:
    *   Free up disk space on your system.
    *   Run `flutter clean` in `d:\EDI_FLAGFORGE\flutter_app`.
    *   Consider clearing Gradle caches (`./gradlew clean` in `android/` folder, or delete `.gradle` folder in your user directory).

## License

This project is open-source and available under the MIT License.