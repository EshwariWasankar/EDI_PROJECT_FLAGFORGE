import React from 'react';
import { Activity, ShieldCheck, ShieldAlert } from 'lucide-react';

function LiveActivityFeed({ feed }) {
  if (!feed || feed.length === 0) {
    return <div className="dashboard-subtitle">No recent activity.</div>;
  }

  const formatName = (name) => {
    return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getTimeAgo = (timestamp) => {
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
      {feed.map((event, idx) => {
        const isSuccess = event.usage_status === 'used';
        return (
          <div key={idx} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            padding: '0.75rem', 
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 'var(--radius-sm)',
            borderLeft: `3px solid ${isSuccess ? 'var(--accent-success)' : 'var(--accent-danger)'}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {isSuccess ? <ShieldCheck size={18} className="text-success" /> : <ShieldAlert size={18} className="text-danger" />}
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{formatName(event.feature_name)}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{event.device_id}</div>
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {getTimeAgo(event.timestamp)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default LiveActivityFeed;
