import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

function LiveActivityFeed({ feed }) {
  if (!feed || feed.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
        No recent activity
      </div>
    );
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.25rem' }}>
      {feed.map((event, idx) => {
        const isSuccess = event.usage_status === 'used';
        return (
          <div 
            key={idx} 
            className={`feed-item ${isSuccess ? 'feed-item-success' : 'feed-item-failed'}`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              {isSuccess 
                ? <CheckCircle2 size={16} className="text-success" /> 
                : <XCircle size={16} className="text-danger" />
              }
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {formatName(event.feature_name)}
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                  {event.device_id}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
              {getTimeAgo(event.timestamp)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default LiveActivityFeed;
