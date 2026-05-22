import { useState, useEffect } from 'react';
import FeatureToggle from './components/FeatureToggle';
import ExecutiveCards from './components/ExecutiveCards';
import AnalyticsCharts from './components/AnalyticsCharts';
import RolloutIntelligence from './components/RolloutIntelligence';
import LiveActivityFeed from './components/LiveActivityFeed';
import AddFeatureModal from './components/AddFeatureModal';
import RolloutRulesModal from './components/RolloutRulesModal';
import { Settings, Shield, Activity, Hexagon, Plus } from 'lucide-react';
import './index.css';

function AppContent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [data, setData] = useState({
    features: [],
    devices: [],
    analytics: [],
    timeline: [],
    active_devices: 0,
    total_events: 0,
    failed_events: 0,
    history: [],
    live_feed: [],
    intelligence: [],
    rule_match_analytics: [],
    geospatial_adoption: [],
    device_distribution: [],
    age_cohort_saturation: []
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchData = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/dashboard-data');
      if (response.ok) {
        const result = await response.json();
        setData(result);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard-layout">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Hexagon size={36} color="var(--accent-brand)" />
            <h1 className="dashboard-title">FlagForge Engine</h1>
          </div>
          <div className="dashboard-subtitle">Enterprise Feature Flag Management & Rollout Intelligence</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <div className="status-badge">
            <div className="status-dot"></div>
            System Operational
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
            Last sync: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      </header>

      {/* KPI Cards */}
      <ExecutiveCards data={data} />

      {/* Main Grid */}
      <div className="main-grid">

        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Analytics Charts */}
          <div className="glass-panel">
            <div className="panel-header">
              <div className="panel-icon"><Activity size={20} /></div>
              <h2 className="panel-title">Real-Time Analytics Engine</h2>
            </div>
            <AnalyticsCharts
              analytics={data.analytics}
              timeline={data.timeline}
              features={data.features}
              ruleMatchAnalytics={data.rule_match_analytics}
              geospatialAdoption={data.geospatial_adoption}
              deviceDistribution={data.device_distribution}
              ageCohortSaturation={data.age_cohort_saturation}
            />
          </div>

          {/* Rollout Intelligence */}
          <div className="glass-panel">
            <div className="panel-header">
              <div className="panel-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-purple)' }}>
                <Shield size={20} />
              </div>
              <h2 className="panel-title">Rollout Intelligence (MurmurHash3)</h2>
            </div>
            <RolloutIntelligence intelligence={data.intelligence} features={data.features} />
          </div>

        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>



          {/* Feature Controls */}
          <div className="glass-panel">
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="panel-icon"><Settings size={20} /></div>
                <h2 className="panel-title">Feature Controls</h2>
              </div>
              <button
                className="btn btn-primary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                onClick={() => setIsModalOpen(true)}
              >
                <Plus size={14} /> Add Flag
              </button>
            </div>

            <div className="feature-list">
              {data.features.map(feature => (
                <FeatureToggle
                  key={feature.feature_name}
                  feature={feature}
                  onUpdate={fetchData}
                  onCardClick={setSelectedFeature}
                />
              ))}
              {data.features.length === 0 && !loading && (
                <p className="dashboard-subtitle">No features configured.</p>
              )}
            </div>
          </div>

          {/* Live Activity Feed */}
          <div className="glass-panel" style={{ flexGrow: 1 }}>
            <div className="panel-header">
              <div className="panel-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-success)' }}>
                <Activity size={20} />
              </div>
              <h2 className="panel-title">Live Activity Feed</h2>
            </div>
            <LiveActivityFeed feed={data.live_feed} />
          </div>

        </div>
      </div>
      <AddFeatureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
      />
      <RolloutRulesModal
        isOpen={!!selectedFeature}
        feature={selectedFeature ? (data.features.find(f => f.feature_name === selectedFeature.feature_name) || selectedFeature) : null}
        onClose={() => setSelectedFeature(null)}
        onSuccess={fetchData}
      />
    </div>
  );
}

function App() {
  return <AppContent />;
}

export default App;
