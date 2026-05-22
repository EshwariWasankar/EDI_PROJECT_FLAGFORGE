import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function AnalyticsCharts({
  analytics,
  timeline,
  features,
  ruleMatchAnalytics = [],
  geospatialAdoption = [],
  deviceDistribution = [],
  ageCohortSaturation = []
}) {
  if (!features || features.length === 0) return null;

  // Global Chart Options
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#94A3B8',
          font: { family: "'Inter', sans-serif", size: 11 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#F8FAFC',
        bodyColor: '#94A3B8',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 10,
        boxPadding: 4
      }
    },
    scales: {
      x: { 
        ticks: { color: '#64748B' }, 
        grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false } 
      },
      y: { 
        ticks: { color: '#64748B' }, 
        grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false } 
      }
    }
  };

  const noScaleOptions = {
    ...commonOptions,
    scales: {
      x: { display: false },
      y: { display: false }
    }
  };

  // 1. Feature Usage (Success vs Failure)
  const barData = {
    labels: features.map(f => f.feature_name.split('_').join(' ')),
    datasets: [
      {
        label: 'Success',
        data: features.map(f => {
          const item = analytics.find(a => a.feature_name === f.feature_name && a.usage_status === 'used');
          return item ? item.count : 0;
        }),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderRadius: 4,
      },
      {
        label: 'Failed',
        data: features.map(f => {
          const item = analytics.find(a => a.feature_name === f.feature_name && a.usage_status === 'failed');
          return item ? item.count : 0;
        }),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderRadius: 4,
      },
    ],
  };

  const barOptions = {
    ...commonOptions,
    scales: {
      x: { stacked: true, ...commonOptions.scales.x },
      y: { stacked: true, ...commonOptions.scales.y }
    }
  };

  // 2. Average Rollout Dist (Doughnut)
  const avgRollout = features.reduce((acc, f) => acc + (f.is_enabled ? f.rollout_percentage : 0), 0) / features.length;
    
  const doughnutData = {
    labels: ['Enabled Reach (%)', 'Disabled Reach (%)'],
    datasets: [
      {
        data: [avgRollout, 100 - avgRollout],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(30, 41, 59, 0.8)',
        ],
        borderWidth: 0,
        hoverOffset: 4
      },
    ],
  };

  // 3. Activity Timeline
  const minutes = [...new Set(timeline.map(t => t.minute))].sort();
  const lineDatasets = features.map((f, i) => {
    const colors = [
      { border: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' },
      { border: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)' },
      { border: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' }
    ];
    return {
      label: f.feature_name.split('_').join(' '),
      data: minutes.map(m => {
        const item = timeline.find(t => t.minute === m && t.feature_name === f.feature_name);
        return item ? item.count : 0;
      }),
      borderColor: colors[i % colors.length].border,
      backgroundColor: colors[i % colors.length].bg,
      fill: true,
      tension: 0.4,
      pointRadius: 2,
      pointHoverRadius: 5
    };
  });

  const lineData = {
    labels: minutes,
    datasets: lineDatasets
  };

  // 4. Targeting Rules Activation (Doughnut)
  const ruleLabels = ruleMatchAnalytics.map(r => r.matched_rule_id === 'default' ? 'Global Default' : r.matched_rule_id);
  const ruleCounts = ruleMatchAnalytics.map(r => r.count);
  const ruleDoughnutData = {
    labels: ruleLabels.length > 0 ? ruleLabels : ['No Rules Evaluated'],
    datasets: [
      {
        data: ruleCounts.length > 0 ? ruleCounts : [1],
        backgroundColor: ruleCounts.length > 0 ? [
          'rgba(139, 92, 246, 0.85)', // Purple
          'rgba(20, 184, 166, 0.85)', // Teal
          'rgba(59, 130, 246, 0.85)', // Blue
          'rgba(245, 158, 11, 0.85)', // Amber
          'rgba(16, 185, 129, 0.85)', // Emerald
          'rgba(71, 85, 105, 0.8)'    // Dark slate
        ] : ['rgba(30, 41, 59, 0.4)'],
        borderWidth: 0,
        hoverOffset: 4
      }
    ]
  };

  // 5. Geospatial Adoption Rate (Horizontal Bar)
  const geoLabels = geospatialAdoption.map(g => g.location || 'Unknown');
  const geoCounts = geospatialAdoption.map(g => g.count);
  const geoBarData = {
    labels: geoLabels.length > 0 ? geoLabels : ['No Data'],
    datasets: [
      {
        label: 'Success Evaluations',
        data: geoCounts.length > 0 ? geoCounts : [0],
        backgroundColor: 'rgba(20, 184, 166, 0.8)',
        borderRadius: 4
      }
    ]
  };
  const geoOptions = {
    ...commonOptions,
    indexAxis: 'y',
    plugins: {
      ...commonOptions.plugins,
      legend: { display: false }
    }
  };

  // 6. Device Distribution Efficiency (Doughnut)
  const devLabels = deviceDistribution.map(d => d.device_type || 'Unknown');
  const devCounts = deviceDistribution.map(d => d.count);
  const getDeviceColor = (type) => {
    if (type === 'iOS') return 'rgba(139, 92, 246, 0.8)';
    if (type === 'Android') return 'rgba(16, 185, 129, 0.8)';
    if (type === 'Web') return 'rgba(59, 130, 246, 0.8)';
    return 'rgba(100, 116, 139, 0.8)';
  };
  const devDoughnutData = {
    labels: devLabels.length > 0 ? devLabels : ['No Data'],
    datasets: [
      {
        data: devCounts.length > 0 ? devCounts : [1],
        backgroundColor: devLabels.length > 0 ? devLabels.map(getDeviceColor) : ['rgba(30, 41, 59, 0.4)'],
        borderWidth: 0,
        hoverOffset: 4
      }
    ]
  };

  // 7. Age Cohort Saturation (Bar)
  const cohortsOrder = ['Under 18', '18-25', '26-45', '46+'];
  const cohortAverages = cohortsOrder.map(c => {
    const item = ageCohortSaturation.find(d => d.cohort === c);
    return item ? item.activation_ratio : 0;
  });
  const ageBarData = {
    labels: cohortsOrder,
    datasets: [
      {
        label: 'Activation Ratio (%)',
        data: cohortAverages,
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
        borderRadius: 4
      }
    ]
  };
  const ageOptions = {
    ...commonOptions,
    plugins: {
      ...commonOptions.plugins,
      legend: { display: false }
    },
    scales: {
      ...commonOptions.scales,
      y: {
        ...commonOptions.scales.y,
        min: 0,
        max: 100,
        ticks: {
          ...commonOptions.scales.y.ticks,
          callback: (value) => `${value}%`
        }
      }
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
      
      {/* SECTION 1: SYSTEM TELEMETRY */}
      <div style={{ gridColumn: '1 / -1', marginBottom: '-0.5rem' }}>
        <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--accent-brand)', margin: 0, fontWeight: 600 }}>System Telemetry</h4>
      </div>

      <div style={{ height: '280px', position: 'relative' }}>
        <h3 className="dashboard-subtitle" style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Usage & Failure Events</h3>
        <Bar data={barData} options={barOptions} />
      </div>
      
      <div style={{ height: '280px', position: 'relative' }}>
        <h3 className="dashboard-subtitle" style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Average Rollout Exposure</h3>
        <div style={{ height: '240px' }}>
          <Doughnut data={doughnutData} options={{...noScaleOptions, cutout: '75%'}} />
        </div>
      </div>
      
      <div style={{ height: '280px', position: 'relative', gridColumn: '1 / -1' }}>
        <h3 className="dashboard-subtitle" style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Real-Time Activity Timeline (10m)</h3>
        <Line data={lineData} options={commonOptions} />
      </div>

      {/* SECTION 2: DEMOGRAPHIC & RULE TARGETING INTELLIGENCE */}
      <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--glass-border)', paddingTop: '2rem', marginTop: '1rem', marginBottom: '-0.5rem' }}>
        <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--accent-purple)', margin: 0, fontWeight: 600 }}>Targeting & Demographic Intelligence</h4>
      </div>

      {/* Rule Match Doughnut */}
      <div style={{ height: '280px', position: 'relative' }}>
        <h3 className="dashboard-subtitle" style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Targeting Rule Matches</h3>
        <div style={{ height: '240px' }}>
          <Doughnut data={ruleDoughnutData} options={{...noScaleOptions, cutout: '75%'}} />
        </div>
      </div>

      {/* Device Distribution Doughnut */}
      <div style={{ height: '280px', position: 'relative' }}>
        <h3 className="dashboard-subtitle" style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Device Type Efficiency</h3>
        <div style={{ height: '240px' }}>
          <Doughnut data={devDoughnutData} options={{...noScaleOptions, cutout: '75%'}} />
        </div>
      </div>

      {/* Geospatial Adoption Bar */}
      <div style={{ height: '280px', position: 'relative' }}>
        <h3 className="dashboard-subtitle" style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Geospatial Adoption Rate</h3>
        <Bar data={geoBarData} options={geoOptions} />
      </div>

      {/* Age Cohort Saturation Bar */}
      <div style={{ height: '280px', position: 'relative' }}>
        <h3 className="dashboard-subtitle" style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Age Cohort Saturation</h3>
        <Bar data={ageBarData} options={ageOptions} />
      </div>
      
    </div>
  );
}

export default AnalyticsCharts;
