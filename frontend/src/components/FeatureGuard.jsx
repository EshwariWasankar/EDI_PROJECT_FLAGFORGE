import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Create Feature Flag Context
const FeatureFlagContext = createContext(null);

/**
 * FeatureFlagProvider
 * Fetches dynamic feature flag evaluations for a specific user client context
 * from the FlagForge backend and provides them to the component tree.
 */
export function FeatureFlagProvider({ children, userContext }) {
  const [flags, setFlags] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchFlags = useCallback(async () => {
    if (!userContext || !userContext.user_id) {
      setFlags({});
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:5000/api/v1/flags/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context: userContext }),
      });
      if (response.ok) {
        const data = await response.json();
        setFlags(data.flags || {});
      } else {
        console.error('Failed to evaluate feature flags');
      }
    } catch (err) {
      console.error('Error fetching evaluated feature flags:', err);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(userContext)]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  // Evaluates if a given flag is active, falling back to a default value
  const evaluate = useCallback((flagKey, fallback = false) => {
    if (flags[flagKey] !== undefined) {
      return !!flags[flagKey];
    }
    return fallback;
  }, [flags]);

  const contextValue = {
    flags,
    loading,
    evaluate,
    reload: fetchFlags
  };

  return (
    <FeatureFlagContext.Provider value={contextValue}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

/**
 * useFeatureFlags Hook
 * Provides easy access to feature flag values and loading states.
 */
export function useFeatureFlags() {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
  }
  return context;
}

/**
 * FeatureGuard Component
 * Declarative wrapper to show/hide UI sections based on flag status.
 */
export function FeatureGuard({ flagKey, children, fallback = null }) {
  const { flags, loading } = useFeatureFlags();

  if (loading) {
    // Optionally return nothing or a loader during initialization
    return null;
  }

  const isEnabled = !!flags[flagKey];

  if (isEnabled) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
