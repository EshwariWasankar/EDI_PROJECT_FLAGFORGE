import React from 'react';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

function ExecutiveCards({ data }) {
  const { devices, active_devices, total_events, failed_events, features, success_rate } = data;
  
  const totalDevices = devices ? devices.length : 0;
  const activeFlags = features ? features.filter(f => f.is_enabled).length : 0;
  const displayRate = success_rate || (total_events > 0 
    ? (((total_events - failed_events) / total_events) * 100).toFixed(1)
    : 100);

  // Mini bar chart data from timeline or simulated
  const miniBarHeights = [28, 42, 38, 52, 44, 30, 48];

  return (
    <div className="kpi-strip">
      {/* Active Flags */}
      <div className="kpi-card">
        <div className="kpi-card-header">
          <span className="kpi-label">Active Flags</span>
          <div className="kpi-mini-chart">
            {miniBarHeights.map((h, i) => (
              <div key={i} className="kpi-mini-bar" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
        <div className="kpi-value">{activeFlags}</div>
        <div className="kpi-footer">
          <span className="kpi-trend-up"><TrendingUp size={12} /></span>
          <span>of {features ? features.length : 0} total</span>
        </div>
      </div>

      {/* Success Rate */}
      <div className="kpi-card">
        <div className="kpi-card-header">
          <span className="kpi-label">Success Rate</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
          <div className="kpi-value">{displayRate}%</div>
        </div>
        <div className="kpi-footer">
          <span>Successful evaluations</span>
        </div>
      </div>

      {/* Total Events */}
      <div className="kpi-card">
        <div className="kpi-card-header">
          <span className="kpi-label">Total Events</span>
        </div>
        <div className="kpi-value">{total_events || 0}</div>
        <div className="kpi-footer">
          <span>Last 10 minutes</span>
          <ArrowRight size={12} />
        </div>
      </div>

      {/* Active Devices */}
      <div className="kpi-card">
        <div className="kpi-card-header">
          <span className="kpi-label">Active Devices</span>
        </div>
        <div className="kpi-value">{active_devices || 0}</div>
        <div className="kpi-footer">
          <span>of {totalDevices} registered</span>
          <ArrowRight size={12} />
        </div>
      </div>
    </div>
  );
}

export default ExecutiveCards;
