function DeviceMonitor({ devices }) {
  if (!devices || devices.length === 0) {
    return <p style={{ color: '#94a3b8' }}>No devices registered yet.</p>;
  }

  return (
    <div className="device-list">
      {devices.map(device => (
        <div key={device.device_id} className="device-item">
          <div className="device-info">
            <span className="device-name">{device.device_name}</span>
            <span className="device-id">{device.device_id}</span>
          </div>
          <span className="device-time">
            {new Date(device.registration_time).toLocaleTimeString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export default DeviceMonitor;
