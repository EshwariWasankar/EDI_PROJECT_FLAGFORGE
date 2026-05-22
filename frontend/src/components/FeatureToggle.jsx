import { useState, useEffect } from 'react';
import { Save, RotateCcw, AlertCircle } from 'lucide-react';

function FeatureToggle({ feature, onUpdate, onCardClick }) {
  const [isEnabled, setIsEnabled] = useState(!!feature.is_enabled);
  const [percentage, setPercentage] = useState(feature.rollout_percentage);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    // BUG FIX: Only update from props if the user hasn't made local unsaved changes.
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
      setIsDirty(false); // Changes saved, clear dirty flag
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
      setIsDirty(false); // Discard local changes on rollback
      onUpdate();
    } catch (error) {
      console.error('Failed to rollback feature', error);
    }
  };

  const formatName = (name) => {
    return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="feature-card" onClick={() => onCardClick(feature)}>
      <div className="feature-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="feature-name">{feature.display_name || formatName(feature.feature_name)}</span>
            {isDirty && <AlertCircle size={14} className="text-warning" title="Unsaved changes" />}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
            key: {feature.flag_key || feature.feature_name}
          </span>
        </div>
        <label className="switch-wrapper" onClick={(e) => e.stopPropagation()}>
          <input 
            type="checkbox" 
            checked={isEnabled}
            onChange={handleToggle}
          />
          <span className="switch-slider"></span>
        </label>
      </div>
      
      <div className="slider-group">
        <div className="slider-labels">
          <span>Rollout Percentage</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{percentage}%</span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={percentage}
          onChange={handleSlider}
          onClick={(e) => e.stopPropagation()}
          className="range-slider"
          disabled={!isEnabled}
          style={{ opacity: isEnabled ? 1 : 0.5 }}
        />
      </div>

      <div className="btn-group" onClick={(e) => e.stopPropagation()}>
        <button className="btn btn-ghost" onClick={handleRollback}>
          <RotateCcw size={16} />
          Revert
        </button>
        <button 
          className="btn btn-primary" 
          onClick={handleSave} 
          disabled={!isDirty || isSaving}
        >
          <Save size={16} />
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

export default FeatureToggle;
