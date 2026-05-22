import { useState } from 'react';
import { X, Trash2, Shield, UserCheck, Globe, GitMerge, AlertTriangle } from 'lucide-react';

function RolloutRulesModal({ isOpen, onClose, feature, onSuccess }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !feature) return null;

  const formatName = (name) => {
    return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const response = await fetch('http://127.0.0.1:5000/delete-feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_name: feature.feature_name })
      });
      const result = await response.json();
      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        setError(result.error || 'Failed to delete feature flag');
      }
    } catch (err) {
      setError('Failed to connect to the backend server');
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setConfirmDelete(false);
    setError(null);
    onClose();
  };

  // Mock Targeting Rules for the selected feature flag
  const rules = [
    {
      id: 'internal',
      icon: <Shield size={16} />,
      title: 'Internal QA & Developers',
      desc: 'Matches devices prefixed with device_sim_00_ to device_sim_02_',
      badge: 'Enabled (100%)',
      badgeClass: 'enabled'
    },
    {
      id: 'beta',
      icon: <UserCheck size={16} />,
      title: 'Beta Testers Group',
      desc: 'Matches registered beta user device IDs',
      badge: 'Enabled (100%)',
      badgeClass: 'enabled'
    },
    {
      id: 'geo',
      icon: <Globe size={16} />,
      title: 'Region Targeting',
      desc: 'Matches users in region NA-WEST / EU-CENTRAL',
      badge: 'Enabled (50%)',
      badgeClass: 'enabled'
    },
    {
      id: 'default',
      icon: <GitMerge size={16} />,
      title: 'Default Rollout Strategy',
      desc: `Hash-based MurmurHash3 distribution for remaining devices`,
      badge: feature.is_enabled ? `Active (${feature.rollout_percentage}%)` : 'Disabled (0%)',
      badgeClass: feature.is_enabled ? 'enabled' : 'disabled'
    }
  ];

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">{formatName(feature.feature_name)} Rules</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
              key: {feature.feature_name}
            </span>
          </div>
          <button className="modal-close-btn" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <h4 style={{ margin: '0', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Rollout Targeting Hierarchy
            </h4>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
              Evaluation order is sequential (top to bottom). The first matching rule applies.
            </p>
          </div>

          <div className="rules-list">
            {rules.map((rule) => (
              <div key={rule.id} className="rule-item">
                <div className="rule-details">
                  <div className="rule-icon">{rule.icon}</div>
                  <div className="rule-text">
                    <span className="rule-title">{rule.title}</span>
                    <span className="rule-desc">{rule.desc}</span>
                  </div>
                </div>
                <span className={`rule-badge ${rule.badgeClass === 'disabled' ? 'disabled' : ''}`}>
                  {rule.badge}
                </span>
              </div>
            ))}
          </div>

          {error && (
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid rgba(239, 68, 68, 0.2)', 
              borderRadius: 'var(--radius-sm)', 
              padding: '0.75rem', 
              color: 'var(--accent-danger)', 
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          {/* Danger Zone */}
          <div className="danger-zone">
            <span className="danger-zone-title">
              <AlertTriangle size={18} />
              Danger Zone
            </span>
            <p className="danger-zone-desc">
              Deleting this feature flag will remove it entirely from all environments, reset its rollout metrics, and delete all associated simulation analytics.
            </p>

            {!confirmDelete ? (
              <button 
                className="btn btn-danger" 
                onClick={() => setConfirmDelete(true)}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Trash2 size={16} /> Delete Feature Flag
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                  Are you absolutely sure you want to delete this feature flag?
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="btn btn-ghost" 
                    onClick={() => setConfirmDelete(false)}
                    style={{ flex: 1, justifyContent: 'center' }}
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn btn-danger" 
                    onClick={handleDelete}
                    style={{ flex: 1, justifyContent: 'center' }}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Yes, Delete Flag'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RolloutRulesModal;
