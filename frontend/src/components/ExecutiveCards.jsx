import React from 'react';
import { Smartphone, Activity, CheckCircle, XCircle } from 'lucide-react';

function ExecutiveCards({ data }) {
  const { devices, active_devices, total_events, failed_events, features } = data;
  
  const totalDevices = devices ? devices.length : 0;
  
  const successRate = total_events > 0 
    ? (((total_events - failed_events) / total_events) * 100).toFixed(1)
    : 100;

  return (
    <div className="kpi-grid">
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="panel-icon"><Smartphone size={24} /></div>
          <div>
            <div className="dashboard-subtitle">Total Registered Devices</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{totalDevices}</div>
          </div>
        </div>
      </div>
      
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="panel-icon" style={{ color: 'var(--accent-success)', background: 'var(--accent-success-bg)' }}>
            <Activity size={24} />
          </div>
          <div>
            <div className="dashboard-subtitle">Active Devices (5m)</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{active_devices || 0}</div>
          </div>
        </div>
      </div>
      
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="panel-icon" style={{ color: 'var(--accent-purple)', background: 'rgba(139, 92, 246, 0.1)' }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <div className="dashboard-subtitle">Rollout Success Rate</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{successRate}%</div>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="panel-icon" style={{ color: 'var(--accent-danger)', background: 'var(--accent-danger-bg)' }}>
            <XCircle size={24} />
          </div>
          <div>
            <div className="dashboard-subtitle">Failed Feature Events</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{failed_events || 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExecutiveCards;
