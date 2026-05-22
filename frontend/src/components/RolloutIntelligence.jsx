import React, { useState } from 'react';
import { Server, ArrowRight } from 'lucide-react';

function RolloutIntelligence({ intelligence, features }) {
  const [selectedFeature, setSelectedFeature] = useState(features.length > 0 ? features[0].feature_name : '');

  if (!intelligence || intelligence.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
        Awaiting hashing data...
      </div>
    );
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
      {/* Feature selector tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {features.map(f => (
          <button 
            key={f.feature_name}
            onClick={() => setSelectedFeature(f.feature_name)}
            className={`btn ${selectedFeature === f.feature_name ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.6875rem' }}
          >
            {formatName(f.feature_name)}
          </button>
        ))}
      </div>

      {/* Status info */}
      <div style={{ 
        background: 'var(--bg-base)', 
        padding: '0.75rem', 
        borderRadius: 'var(--radius-sm)', 
        marginBottom: '1rem',
        border: '1px solid var(--border-light)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Global Status:</span>
          <span 
            className={globallyEnabled ? "status-badge-success" : "status-badge-danger"} 
            style={{ padding: '0.1rem 0.4rem', fontSize: '0.625rem' }}
          >
            {globallyEnabled ? 'ACTIVE' : 'INACTIVE'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Rollout Threshold:</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.8125rem' }}>{threshold}%</span>
        </div>
        
        {/* Visual threshold bar */}
        <div style={{ width: '100%', height: '4px', background: 'var(--border-light)', borderRadius: '2px', marginTop: '0.5rem', position: 'relative' }}>
          <div style={{ 
            position: 'absolute', top: 0, left: 0, height: '100%', 
            width: `${threshold}%`, background: 'var(--accent-brand)', borderRadius: '2px 0 0 2px' 
          }}></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px', fontSize: '0.5625rem', color: 'var(--text-tertiary)' }}>
          <span>0 (Eligible)</span>
          <span>100 (Ineligible)</span>
        </div>
      </div>

      {/* Device hash rows — compact stacked layout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {featureIntel.map((item, idx) => (
          <div 
            key={idx} 
            className={`intel-row ${item.is_enabled ? 'enabled' : 'disabled'}`}
          >
            {/* Device */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', minWidth: 0 }}>
              <Server size={11} style={{ flexShrink: 0, color: 'var(--text-tertiary)' }} />
              <span style={{ fontFamily: 'monospace', fontSize: '0.6875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.device_id.split('_').pop()}
              </span>
            </div>
            
            <ArrowRight size={10} style={{ flexShrink: 0, color: 'var(--text-tertiary)' }} />
            
            {/* Hash */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 }}>
              <span style={{ fontSize: '0.5625rem', color: 'var(--text-tertiary)', lineHeight: 1 }}>MurmurHash3</span>
              <span style={{ fontSize: '0.6875rem', fontFamily: 'monospace', color: 'var(--accent-purple)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80px' }}>
                {item.hash_value}
              </span>
            </div>
            
            <ArrowRight size={10} style={{ flexShrink: 0, color: 'var(--text-tertiary)' }} />
            
            {/* Normalized */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '0.5625rem', color: 'var(--text-tertiary)', lineHeight: 1 }}>Normalized</span>
              <span style={{ 
                fontSize: '0.8125rem', fontWeight: 600, 
                color: item.normalized_hash < threshold ? 'var(--accent-success)' : 'var(--text-primary)' 
              }}>
                {item.normalized_hash}
                <span style={{ fontSize: '0.5625rem', color: 'var(--text-tertiary)', marginLeft: '2px' }}>
                  {item.normalized_hash < threshold ? '<' : '>='} {threshold}
                </span>
              </span>
            </div>
            
            <ArrowRight size={10} style={{ flexShrink: 0, color: 'var(--text-tertiary)' }} />
            
            {/* Result */}
            <span 
              className={item.is_enabled ? "status-badge-success" : "status-badge-danger"} 
              style={{ padding: '0.1rem 0.375rem', fontSize: '0.5625rem', whiteSpace: 'nowrap', marginLeft: 'auto' }}
            >
              {item.is_enabled ? 'ENABLED' : 'DISABLED'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RolloutIntelligence;
