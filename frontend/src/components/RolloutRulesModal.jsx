import { useState, useEffect } from 'react';
import { X, Trash2, Shield, AlertTriangle, Plus, Save, Sliders, Info } from 'lucide-react';

function RolloutRulesModal({ isOpen, onClose, feature, onSuccess }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Feature Flag State Fields
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [fallbackValue, setFallbackValue] = useState(false);
  const [rules, setRules] = useState([]);

  useEffect(() => {
    if (feature) {
      setDisplayName(feature.display_name || '');
      setDescription(feature.description || '');
      setIsActive(feature.is_active !== undefined ? !!feature.is_active : true);
      setFallbackValue(!!feature.fallback_value);
      
      // Parse rules and assign unique local IDs for React lists
      let loadedRules = [];
      if (feature.rules_json) {
        let rawRules = [];
        if (typeof feature.rules_json === 'string') {
          try {
            rawRules = JSON.parse(feature.rules_json);
          } catch (e) {
            rawRules = [];
          }
        } else {
          rawRules = feature.rules_json;
        }

        if (Array.isArray(rawRules)) {
          loadedRules = rawRules.map(r => {
            const hasCond = r.conditions && Array.isArray(r.conditions) && r.conditions.length > 0;
            const mainCond = hasCond ? r.conditions[0] : null;
            
            const attr = hasCond ? (mainCond.attribute || 'location') : (r.attribute || 'location');
            let op = hasCond ? (mainCond.operator || 'EQUALS') : (r.operator || 'EQUALS');
            let val = hasCond 
              ? (Array.isArray(mainCond.value) ? mainCond.value.join(', ') : (mainCond.value !== undefined ? String(mainCond.value) : ''))
              : (Array.isArray(r.value) ? r.value.join(', ') : (r.value !== undefined ? String(r.value) : ''));
              
            let minAge = 18;
            let maxAge = 60;
            
            if (attr === 'age') {
              if (op === 'BETWEEN' && val.includes('-')) {
                const parts = val.split('-');
                minAge = parseInt(parts[0], 10);
                maxAge = parseInt(parts[1], 10);
                if (isNaN(minAge)) minAge = 0;
                if (isNaN(maxAge)) maxAge = 100;
              } else if (op === 'GREATER_THAN_OR_EQUAL') {
                minAge = parseInt(val, 10);
                if (isNaN(minAge)) minAge = 18;
                maxAge = 100;
                op = 'BETWEEN';
                val = `${minAge}-100`;
              } else if (op === 'LESS_THAN_OR_EQUAL') {
                minAge = 0;
                maxAge = parseInt(val, 10);
                if (isNaN(maxAge)) maxAge = 18;
                op = 'BETWEEN';
                val = `0-${maxAge}`;
              } else {
                const parsed = parseInt(val, 10);
                minAge = isNaN(parsed) ? 18 : parsed;
                maxAge = isNaN(parsed) ? 60 : parsed;
                op = 'BETWEEN';
                val = `${minAge}-${maxAge}`;
              }
            }
            
            return {
              id: Math.random().toString(36).substr(2, 9),
              rule_id: r.rule_id || ('rule_' + Math.random().toString(36).substr(2, 9)),
              attribute: attr,
              operator: op,
              value: val,
              min_age: minAge,
              max_age: maxAge,
              serve_value: r.serve_value !== undefined ? !!r.serve_value : (hasCond ? (r.value !== undefined ? !!r.value : true) : true)
            };
          });
        }
      }
      setRules(loadedRules);
    }
  }, [feature]);

  if (!isOpen || !feature) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const response = await fetch('http://127.0.0.1:5000/delete-feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flag_key: feature.flag_key })
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

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    // Format rules list for backend rules_json format
    const formattedRules = rules.map(r => {
      let parsedVal = r.value;
      // Convert age to numeric type if applicable
      if (r.attribute === 'age' && !isNaN(r.value) && r.value.trim() !== '') {
        parsedVal = Number(r.value);
      }
      return {
        rule_id: r.rule_id,
        attribute: r.attribute,
        operator: r.operator,
        value: parsedVal,
        serve_value: !!r.serve_value
      };
    });

    try {
      const response = await fetch('http://127.0.0.1:5000/update-feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flag_key: feature.flag_key,
          display_name: displayName.trim() || feature.flag_key,
          description: description.trim(),
          is_active: isActive ? 1 : 0,
          fallback_value: fallbackValue ? 1 : 0,
          rules_json: formattedRules
        })
      });

      const result = await response.json();
      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        setError(result.error || 'Failed to save rules');
      }
    } catch (err) {
      setError('Failed to save rules: Connection error.');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setConfirmDelete(false);
    setError(null);
    onClose();
  };

  // Rule Builders
  const addRule = () => {
    const newRule = {
      id: Math.random().toString(36).substr(2, 9),
      rule_id: 'rule_' + Math.random().toString(36).substr(2, 9),
      attribute: 'location',
      operator: 'EQUALS',
      value: '',
      serve_value: true
    };
    setRules([...rules, newRule]);
  };

  const deleteRule = (ruleId) => {
    setRules(rules.filter(r => r.id !== ruleId));
  };

  const updateRule = (ruleId, field, val) => {
    setRules(rules.map(r => {
      if (r.id === ruleId) {
        let updated = { ...r, [field]: val };
        if (field === 'attribute' && val === 'age') {
          updated.operator = 'BETWEEN';
          updated.min_age = 18;
          updated.max_age = 60;
          updated.value = '18-60';
        } else if (field === 'attribute' && val !== 'age') {
          updated.operator = 'EQUALS';
          updated.value = '';
          delete updated.min_age;
          delete updated.max_age;
        }
        return updated;
      }
      return r;
    }));
  };

  const commonAttributes = [
    { value: 'age', label: 'Age' },
    { value: 'device_type', label: 'Device Type' },
    { value: 'gender', label: 'Gender' },
    { value: 'location', label: 'Location' }
  ];

  const commonOperators = [
    { value: 'EQUALS', label: 'Equals' },
    { value: 'NOT_EQUALS', label: 'Not Equals' },
    { value: 'GREATER_THAN_OR_EQUAL', label: 'Greater Than or Equal' },
    { value: 'LESS_THAN_OR_EQUAL', label: 'Less Than or Equal' },
    { value: 'IN_LIST', label: 'In List (comma sep)' }
  ];

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div 
        className="modal-container" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '720px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Edit Flag Rules</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
              key: {feature.flag_key}
            </span>
          </div>
          <button className="modal-close-btn" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', flex: 1, paddingRight: '1rem' }}>
          
          {/* General Flag Properties */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'var(--bg-base)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
            <div className="form-group">
              <label className="form-label">Display Name</label>
              <input 
                type="text" 
                className="form-input-text" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. New Payment Gateway"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input 
                type="text" 
                className="form-input-text" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Targeting logic and environment deployment status..."
              />
            </div>
          </div>

          {/* Configuration Settings */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-row" style={{ padding: '0.75rem 1rem' }}>
              <div className="form-row-label-group">
                <span className="form-row-title">Global Override (Kill-switch)</span>
                <span className="form-row-desc">Turn the flag globally Active or Inactive</span>
              </div>
              <label className="switch-wrapper">
                <input 
                  type="checkbox" 
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <span className="switch-slider"></span>
              </label>
            </div>

            <div className="form-row" style={{ padding: '0.75rem 1rem' }}>
              <div className="form-row-label-group">
                <span className="form-row-title">Offline Fallback Value</span>
                <span className="form-row-desc">Returned if kill-switch is inactive</span>
              </div>
              <label className="switch-wrapper">
                <input 
                  type="checkbox" 
                  checked={fallbackValue}
                  onChange={(e) => setFallbackValue(e.target.checked)}
                />
                <span className="switch-slider"></span>
              </label>
            </div>
          </div>

          {/* Sequential Targeting Rules list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: '0', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Targeting Rules Evaluation
                </h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  Processed sequentially (top to bottom). First matching rule decides the outcome.
                </span>
              </div>
              <button 
                className="btn btn-ghost" 
                onClick={addRule}
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', gap: '4px', border: '1px solid var(--border-light)' }}
              >
                <Plus size={14} /> Add Rule
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
              {rules.map((rule, rIdx) => (
                <div 
                  key={rule.id} 
                  style={{ background: 'var(--bg-base)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-brand)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Shield size={14} /> Rule #{rIdx + 1}
                    </span>
                    <button 
                      onClick={() => deleteRule(rule.id)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', padding: '2px', borderRadius: '4px' }}
                      title="Delete Rule"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Condition Fields */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 120px' }}>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>Attribute</label>
                      <select 
                        className="form-input-text" 
                        style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', width: '100%' }}
                        value={rule.attribute}
                        onChange={(e) => updateRule(rule.id, 'attribute', e.target.value)}
                      >
                        {commonAttributes.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                      </select>
                    </div>

                    {rule.attribute === 'age' ? (
                      <div style={{ flex: '3 1 320px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Age Range</span>
                          <span style={{ fontWeight: 600, color: 'var(--accent-brand)' }}>
                            {rule.min_age !== undefined ? rule.min_age : 18} - {rule.max_age !== undefined ? rule.max_age : 60} years old
                          </span>
                        </label>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Min:</span>
                            <input 
                              type="range"
                              min="0"
                              max="100"
                              value={rule.min_age !== undefined ? rule.min_age : 18}
                              onChange={(e) => {
                                const minVal = parseInt(e.target.value, 10);
                                const maxVal = rule.max_age !== undefined ? rule.max_age : 60;
                                const newMin = Math.min(minVal, maxVal);
                                updateRule(rule.id, 'min_age', newMin);
                                updateRule(rule.id, 'value', `${newMin}-${maxVal}`);
                              }}
                              className="range-slider"
                              style={{ margin: 0, width: '100%' }}
                            />
                          </div>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Max:</span>
                            <input 
                              type="range"
                              min="0"
                              max="100"
                              value={rule.max_age !== undefined ? rule.max_age : 60}
                              onChange={(e) => {
                                const minVal = rule.min_age !== undefined ? rule.min_age : 18;
                                const maxVal = parseInt(e.target.value, 10);
                                const newMax = Math.max(minVal, maxVal);
                                updateRule(rule.id, 'max_age', newMax);
                                updateRule(rule.id, 'value', `${minVal}-${newMax}`);
                              }}
                              className="range-slider"
                              style={{ margin: 0, width: '100%' }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ flex: '1 1 140px' }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>Operator</label>
                          <select 
                            className="form-input-text" 
                            style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', width: '100%' }}
                            value={rule.operator}
                            onChange={(e) => updateRule(rule.id, 'operator', e.target.value)}
                          >
                            {commonOperators.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>

                        <div style={{ flex: '2 1 180px' }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>Value</label>
                          <input 
                            type="text"
                            className="form-input-text"
                            style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', width: '100%' }}
                            placeholder={rule.operator === 'IN_LIST' ? "iOS, Android (comma sep)" : "value"}
                            value={rule.value}
                            onChange={(e) => updateRule(rule.id, 'value', e.target.value)}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Rule Outcome (Serve value) */}
                  <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-surface-raised)', border: '1px solid var(--border-light)', borderRadius: '4px', padding: '0.6rem 0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Sliders size={14} /> Serve:
                      </span>
                      <label className="switch-wrapper">
                        <input 
                          type="checkbox" 
                          checked={rule.serve_value}
                          onChange={(e) => updateRule(rule.id, 'serve_value', e.target.checked)}
                        />
                        <span className="switch-slider"></span>
                      </label>
                      <span style={{ fontSize: '0.8rem', color: rule.serve_value ? 'var(--accent-success)' : 'var(--accent-danger)', fontWeight: 600 }}>
                        {rule.serve_value ? 'TRUE' : 'FALSE'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {rules.length === 0 && (
                <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--bg-base)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-light)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>No custom targeting rules defined. Falls back to default rollout card strategy.</span>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div style={{ 
              background: 'var(--accent-danger-bg)', 
              border: '1px solid rgba(239, 68, 68, 0.2)', 
              borderRadius: 'var(--radius-sm)', 
              padding: '0.75rem', 
              color: 'var(--accent-danger)', 
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '1rem'
            }}>
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          {/* Danger Zone */}
          <div className="danger-zone" style={{ marginTop: '1.5rem' }}>
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

        {/* Modal Action Buttons */}
        <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', background: 'var(--bg-surface)' }}>
          <button className="btn btn-ghost" onClick={handleClose} disabled={isSaving}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={isSaving} style={{ gap: '6px' }}>
            <Save size={16} />
            {isSaving ? 'Saving Changes...' : 'Save Rules'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RolloutRulesModal;
