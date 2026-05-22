import { useState, useEffect } from 'react';
import { Save, RotateCcw, AlertCircle, MoreVertical, Calendar, MessageSquare, Target } from 'lucide-react';

function FeatureToggle({ feature, onUpdate, onCardClick }) {
  const [isEnabled, setIsEnabled] = useState(!!feature.is_enabled);
  const [percentage, setPercentage] = useState(feature.rollout_percentage);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    // Only update from props if the user hasn't made local unsaved changes.
    if (!isDirty) {
      setIsEnabled(!!feature.is_enabled);
      setPercentage(feature.rollout_percentage);
    }
  }, [feature, isDirty]);

  const handleToggle = (e) => {
    setIsEnabled(e.target.checked);
    setIsDirty(true);
  };

  const handleSlider = (e) => {
    setPercentage(e.target.value);
    setIsDirty(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetch('http://127.0.0.1:5000/update-feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature_name: feature.feature_name,
          is_enabled: isEnabled ? 1 : 0,
          rollout_percentage: parseInt(percentage, 10)
        })
      });
      setIsDirty(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to update feature', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRollback = async () => {
    try {
      await fetch('http://127.0.0.1:5000/rollback-feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature_name: feature.feature_name
        })
      });
      setIsDirty(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to rollback feature', error);
    }
  };

  const formatName = (name) => {
    return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const rulesCount = Array.isArray(feature.rules_json) ? feature.rules_json.length : 0;

  return (
    <div className="feature-card" onClick={() => onCardClick(feature)}>
      <div className="feature-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="feature-name">{feature.display_name || formatName(feature.feature_name)}</span>
            {isDirty && <AlertCircle size={13} className="text-warning" title="Unsaved changes" />}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
          <label className="switch-wrapper">
            <input 
              type="checkbox" 
              checked={isEnabled}
              onChange={handleToggle}
            />
            <span className="switch-slider"></span>
          </label>
          <button className="feature-more-btn" onClick={(e) => { e.stopPropagation(); onCardClick(feature); }}>
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      <div className="feature-description">
        {feature.description || `Feature flag for ${formatName(feature.feature_name).toLowerCase()}`}
      </div>

      <div className="slider-group" onClick={(e) => e.stopPropagation()}>
        <div className="slider-labels">
          <span>Rollout</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{percentage}%</span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={percentage}
          onChange={handleSlider}
          className="range-slider"
          disabled={!isEnabled}
          style={{ opacity: isEnabled ? 1 : 0.4 }}
        />
      </div>

      {/* Meta row */}
      <div className="feature-meta">
        <div className="feature-meta-item">
          <Calendar size={12} />
          <span>{feature.flag_key || feature.feature_name}</span>
        </div>
        {rulesCount > 0 && (
          <div className="feature-meta-item">
            <Target size={12} />
            <span>{rulesCount} rule{rulesCount !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {isDirty && (
        <div className="btn-group" onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-ghost" onClick={handleRollback}>
            <RotateCcw size={14} />
            Revert
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSave} 
            disabled={!isDirty || isSaving}
          >
            <Save size={14} />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
    </div>
  );
}

export default FeatureToggle;
