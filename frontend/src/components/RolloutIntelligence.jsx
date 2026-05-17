import React, { useState } from 'react';
import { Hash, Server, ArrowRight, Zap } from 'lucide-react';

function RolloutIntelligence({ intelligence, features }) {
  const [selectedFeature, setSelectedFeature] = useState(features.length > 0 ? features[0].feature_name : '');

  if (!intelligence || intelligence.length === 0) {
    return <div className="dashboard-subtitle">Awaiting hashing data...</div>;
  }

  const featureIntel = intelligence.filter(i => i.feature_name === selectedFeature);
  const currentFeature = features.find(f => f.feature_name === selectedFeature);
  const threshold = currentFeature ? currentFeature.rollout_percentage : 0;
  const globallyEnabled = currentFeature ? currentFeature.is_enabled : false;

  const formatName = (name) => {
    return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {features.map(f => (
          <button 
            key={f.feature_name}
            onClick={() => setSelectedFeature(f.feature_name)}
            className={`btn ${selectedFeature === f.feature_name ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
          >
            {formatName(f.feature_name)}
          </button>
        ))}
      </div>

      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Global Status:</span>
          <span className={globallyEnabled ? "text-success" : "text-danger"} style={{ fontWeight: 600 }}>
            {globallyEnabled ? 'ON' : 'OFF'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Rollout Threshold:</span>
          <span style={{ fontWeight: 600, color: 'var(--accent-brand)' }}>{threshold}%</span>
        </div>
        
        {/* Visual threshold bar */}
        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginTop: '1rem', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${threshold}%`, background: 'var(--accent-brand)', borderRadius: '4px 0 0 4px' }}></div>
          <div style={{ position: 'absolute', top: '-6px', left: `${threshold}%`, width: '2px', height: '20px', background: 'var(--text-primary)' }}></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
          <span>0 (Eligible)</span>
          <span>100 (Ineligible)</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {featureIntel.map((item, idx) => (
          <div key={idx} style={{ 
            display: 'grid', 
            gridTemplateColumns: '1.5fr auto 1fr auto 1fr auto 1fr', 
            alignItems: 'center', 
            gap: '0.5rem',
            background: 'rgba(255,255,255,0.03)', 
            padding: '1rem', 
            borderRadius: 'var(--radius-sm)',
            border: `1px solid ${item.is_enabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Server size={14} className="text-secondary" />
              <span style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{item.device_id.split('_').pop()}</span>
            </div>
            
            <ArrowRight size={14} className="text-secondary" />
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>MurmurHash3</span>
              <span style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--accent-purple)' }}>{item.hash_value}</span>
            </div>
            
            <ArrowRight size={14} className="text-secondary" />
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Normalized (0-99)</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '1rem', fontWeight: 600, color: item.normalized_hash < threshold ? 'var(--accent-brand)' : 'var(--text-primary)' }}>
                  {item.normalized_hash}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {item.normalized_hash < threshold ? '<' : '>='} {threshold}
                </span>
              </div>
            </div>
            
            <ArrowRight size={14} className="text-secondary" />
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
              {item.is_enabled ? (
                <span className="status-badge" style={{ padding: '0.25rem 0.75rem' }}>ENABLED</span>
              ) : (
                <span className="status-badge" style={{ padding: '0.25rem 0.75rem', background: 'var(--accent-danger-bg)', color: 'var(--accent-danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>DISABLED</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RolloutIntelligence;
