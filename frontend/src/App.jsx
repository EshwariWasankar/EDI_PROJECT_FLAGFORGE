import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import FeatureToggle from './components/FeatureToggle';
import ExecutiveCards from './components/ExecutiveCards';
import AnalyticsCharts from './components/AnalyticsCharts';
import RolloutIntelligence from './components/RolloutIntelligence';
import LiveActivityFeed from './components/LiveActivityFeed';
import AddFeatureModal from './components/AddFeatureModal';
import RolloutRulesModal from './components/RolloutRulesModal';
import { Search, SlidersHorizontal, ArrowUpDown, User, Plus, Activity, Shield, Settings, Flag, BarChart3 } from 'lucide-react';
import './index.css';

function AppContent() {
  const [activeView, setActiveView] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
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

  const filteredFeatures = data.features.filter(f => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      f.feature_name.toLowerCase().includes(q) ||
      (f.display_name && f.display_name.toLowerCase().includes(q)) ||
      (f.flag_key && f.flag_key.toLowerCase().includes(q))
    );
  });

  const enabledFeatures = filteredFeatures.filter(f => f.is_enabled);
  const disabledFeatures = filteredFeatures.filter(f => !f.is_enabled);

  const renderContent = () => {
    switch (activeView) {
      case 'analytics':
        return (
          <div>
            <div className="section-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Analytics Engine</h2>
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
        );

      case 'intelligence':
        return (
          <div>
            <div className="section-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Rollout Intelligence (MurmurHash3)</h2>
            </div>
            <div className="glass-panel">
              <RolloutIntelligence intelligence={data.intelligence} features={data.features} />
            </div>
          </div>
        );

      case 'features':
        return (
          <div>
            <div className="section-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Feature Flags</h2>
            </div>
            <div className="kanban-board">
              {/* Active Column */}
              <div className="kanban-column">
                <div className="kanban-column-header">
                  <h3 className="kanban-column-title">Active</h3>
                  <span className="kanban-column-count">{enabledFeatures.length}</span>
                </div>
                {enabledFeatures.map(feature => (
                  <FeatureToggle
                    key={feature.feature_name}
                    feature={feature}
                    onUpdate={fetchData}
                    onCardClick={setSelectedFeature}
                  />
                ))}
                {enabledFeatures.length === 0 && (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.8125rem', border: '1px dashed var(--border-light)', borderRadius: 'var(--radius-md)' }}>
                    No active flags
                  </div>
                )}
              </div>

              {/* Disabled Column */}
              <div className="kanban-column">
                <div className="kanban-column-header">
                  <h3 className="kanban-column-title">Disabled</h3>
                  <span className="kanban-column-count">{disabledFeatures.length}</span>
                </div>
                {disabledFeatures.map(feature => (
                  <FeatureToggle
                    key={feature.feature_name}
                    feature={feature}
                    onUpdate={fetchData}
                    onCardClick={setSelectedFeature}
                  />
                ))}
                {disabledFeatures.length === 0 && (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.8125rem', border: '1px dashed var(--border-light)', borderRadius: 'var(--radius-md)' }}>
                    No disabled flags
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'dashboard':
      default:
        return (
          <div>
            {/* KPI Cards */}
            <ExecutiveCards data={data} />

            {/* Main Grid: Features + Activity + Charts */}
            <div className="dashboard-grid">
              {/* Left: Features as Kanban + Charts */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Feature Kanban */}
                <div>
                  <div className="section-header">
                    <div className="section-title">Feature Flags</div>
                  </div>
                  <div className="kanban-board" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                    {/* Active */}
                    <div className="kanban-column">
                      <div className="kanban-column-header">
                        <h3 className="kanban-column-title">Active</h3>
                        <span className="kanban-column-count">{enabledFeatures.length}</span>
                      </div>
                      {enabledFeatures.map(feature => (
                        <FeatureToggle
                          key={feature.feature_name}
                          feature={feature}
                          onUpdate={fetchData}
                          onCardClick={setSelectedFeature}
                        />
                      ))}
                      {enabledFeatures.length === 0 && (
                        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.8125rem', border: '1px dashed var(--border-light)', borderRadius: 'var(--radius-md)' }}>
                          No active flags
                        </div>
                      )}
                    </div>

                    {/* Disabled */}
                    <div className="kanban-column">
                      <div className="kanban-column-header">
                        <h3 className="kanban-column-title">Disabled</h3>
                        <span className="kanban-column-count">{disabledFeatures.length}</span>
                      </div>
                      {disabledFeatures.map(feature => (
                        <FeatureToggle
                          key={feature.feature_name}
                          feature={feature}
                          onUpdate={fetchData}
                          onCardClick={setSelectedFeature}
                        />
                      ))}
                      {disabledFeatures.length === 0 && (
                        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.8125rem', border: '1px dashed var(--border-light)', borderRadius: 'var(--radius-md)' }}>
                          No disabled flags
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Analytics Charts */}
                <div>
                  <div className="section-header">
                    <div className="section-title">Analytics</div>
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
              </div>

              {/* Right Sidebar: Activity Feed + Rollout Intel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Live Activity Feed */}
                <div className="glass-panel">
                  <div className="panel-header">
                    <div className="panel-icon" style={{ background: 'var(--accent-success-bg)', color: 'var(--accent-success)' }}>
                      <Activity size={18} />
                    </div>
                    <h2 className="panel-title">Live Activity</h2>
                  </div>
                  <LiveActivityFeed feed={data.live_feed} />
                </div>

                {/* Rollout Intelligence */}
                <div className="glass-panel">
                  <div className="panel-header">
                    <div className="panel-icon" style={{ background: 'var(--accent-purple-bg)', color: 'var(--accent-purple)' }}>
                      <Shield size={18} />
                    </div>
                    <h2 className="panel-title">Rollout Intelligence</h2>
                  </div>
                  <RolloutIntelligence intelligence={data.intelligence} features={data.features} />
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <Sidebar 
        activeView={activeView} 
        onViewChange={setActiveView}
        features={data.features}
        devices={data.devices}
      />

      {/* Main Content */}
      <div className="main-content">
        {/* Top Bar */}
        <header className="topbar">
          <div className="topbar-search">
            <Search size={16} color="var(--text-tertiary)" />
            <input 
              type="text" 
              placeholder="Search flags..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="topbar-actions">
            <button className="topbar-btn">
              <ArrowUpDown size={14} />
              Sort by
            </button>
            <button className="topbar-btn">
              <SlidersHorizontal size={14} />
              Filters
            </button>
            <button className="topbar-btn">
              <User size={14} />
              Me
            </button>
            <button 
              className="topbar-btn topbar-btn-primary"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus size={14} />
              Add Flag
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="content-area">
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-tertiary)' }}>
              Loading...
            </div>
          ) : (
            renderContent()
          )}
        </div>

        {/* Footer sync info */}
        <div style={{ 
          padding: '0.5rem 2rem', 
          borderTop: '1px solid var(--border-light)', 
          fontSize: '0.6875rem', 
          color: 'var(--text-tertiary)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'var(--bg-surface)'
        }}>
          <div className="status-dot" style={{ width: '5px', height: '5px' }}></div>
          <span>System Operational — Last sync: {lastUpdated.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Modals */}
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
