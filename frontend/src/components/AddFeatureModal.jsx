import { useState } from 'react';
import { X, Plus, AlertCircle, Loader2 } from 'lucide-react';

function AddFeatureModal({ isOpen, onClose, onSuccess }) {
  const [featureName, setFeatureName] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [rolloutPercentage, setRolloutPercentage] = useState(0);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    const trimmedName = featureName.trim();
    if (!trimmedName) {
      setError('Feature name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      // Post to the backend endpoint
      const response = await fetch('http://127.0.0.1:5000/add-feature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feature_name: trimmedName,
          is_enabled: isEnabled,
          rollout_percentage: isEnabled ? parseInt(rolloutPercentage, 10) : 0,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Success
        setFeatureName('');
        setIsEnabled(false);
        setRolloutPercentage(0);
        onSuccess(); // Triggers data refresh
        onClose();   // Closes the modal
      } else {
        // Handle error responses (e.g., 409 Conflict)
        setError(result.error || 'Failed to create feature flag');
      }
    } catch (err) {
      console.error('Error creating feature flag:', err);
      setError('Network error: Could not connect to the backend server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="modal-container">
        <div className="modal-header">
          <h2 className="modal-title">Create New Feature Flag</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem', 
                  background: 'var(--accent-danger-bg)', 
                  border: '1px solid rgba(239, 68, 68, 0.2)', 
                  color: 'var(--accent-danger)', 
                  padding: '0.75rem 1rem', 
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.875rem'
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="feature-name-input" className="form-label">
                Feature Name
              </label>
              <input
                id="feature-name-input"
                type="text"
                placeholder="e.g. beta_billing_dashboard"
                value={featureName}
                onChange={(e) => setFeatureName(e.target.value)}
                className="form-input-text"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-row-label-group">
                <span className="form-row-title">Enabled Status</span>
                <span className="form-row-desc">Turn flag globally active or inactive</span>
              </div>
              <label className="switch-wrapper">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => {
                    setIsEnabled(e.target.checked);
                    if (!e.target.checked) {
                      setRolloutPercentage(0);
                    }
                  }}
                  disabled={isSubmitting}
                />
                <span className="switch-slider"></span>
              </label>
            </div>

            <div className="slider-group">
              <div className="slider-labels">
                <span>Rollout Percentage</span>
                <span style={{ fontWeight: 600, color: isEnabled ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                  {rolloutPercentage}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={rolloutPercentage}
                onChange={(e) => setRolloutPercentage(e.target.value)}
                className="range-slider"
                disabled={!isEnabled || isSubmitting}
                style={{ opacity: isEnabled ? 1 : 0.5 }}
              />
            </div>

            <div className="btn-group" style={{ marginTop: '0.75rem' }}>
              <button 
                type="button" 
                className="btn btn-ghost" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Create Feature
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddFeatureModal;
