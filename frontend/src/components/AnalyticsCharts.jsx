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

  // Modern typography & colors matching a premium fintech theme
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#4B5563',
          font: { family: "'Inter', sans-serif", size: 11, weight: '500' },
          usePointStyle: true,
          pointStyleWidth: 8,
          padding: 16,
        }
      },
      tooltip: {
        backgroundColor: '#1E293B',
        titleColor: '#FFFFFF',
        bodyColor: '#F3F4F6',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        cornerRadius: 8,
        titleFont: { family: "'Inter', sans-serif", weight: '600' },
        bodyFont: { family: "'Inter', sans-serif" },
      }
    },
    scales: {
      x: { 
        ticks: { 
          color: '#9CA3AF', 
          font: { size: 10, family: "'Inter', sans-serif" },
          maxRotation: 0,
          minRotation: 0
        }, 
        grid: { color: 'rgba(0,0,0,0.02)', drawTicks: false },
        border: { display: false }
      },
      y: { 
        ticks: { 
          color: '#9CA3AF', 
          font: { size: 10, family: "'Inter', sans-serif" } 
        }, 
        grid: { color: 'rgba(0,0,0,0.02)', drawTicks: false },
        border: { display: false }
      }
    }
  };

  // noScaleOptions (used for Doughnut without legend/scales to prevent shifting)
  const noScaleOptions = {
    ...commonOptions,
    plugins: {
      ...commonOptions.plugins,
      legend: { display: false }
    },
    scales: {
      x: { display: false },
      y: { display: false }
    }
  };

  // doughnutOptionsWithLegend (used for Doughnut charts, positioned at the bottom)
  const doughnutOptionsWithLegend = {
    ...commonOptions,
    plugins: {
      ...commonOptions.plugins,
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          color: '#6B7280',
          font: { family: "'Inter', sans-serif", size: 10, weight: '500' },
          usePointStyle: true,
          pointStyleWidth: 6,
          padding: 12,
        }
      }
    },
    scales: {
      x: { display: false },
      y: { display: false }
    }
  };

  // Label Formatting Helpers
  const formatLabel = (name) => {
    return name.split('_').map(word => {
      if (word.toLowerCase() === 'ui') return 'UI';
      return word.charAt(0).toUpperCase() + word.slice(1);
    });
  };
  
  const formatLegendLabel = (name) => {
    return name.split('_').map(word => {
      if (word.toLowerCase() === 'ui') return 'UI';
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
  };

  // 1. Feature Usage (Success vs Failure)
  const barData = {
    labels: features.map(f => formatLabel(f.feature_name)),
    datasets: [
      {
        label: 'Success',
        data: features.map(f => {
          const item = analytics.find(a => a.feature_name === f.feature_name && a.usage_status === 'used');
          return item ? item.count : 0;
        }),
        backgroundColor: '#10B981', // Premium Emerald Green
        borderRadius: 4,
      },
      {
        label: 'Failed',
        data: features.map(f => {
          const item = analytics.find(a => a.feature_name === f.feature_name && a.usage_status === 'failed');
          return item ? item.count : 0;
        }),
        backgroundColor: '#EF4444', // Premium Rose Red
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

  // 2. Average Rollout Distribution (Doughnut)
  const avgRollout = features.reduce((acc, f) => acc + (f.is_enabled ? f.rollout_percentage : 0), 0) / features.length;
    
  const doughnutData = {
    labels: ['Enabled Reach (%)', 'Disabled Reach (%)'],
    datasets: [
      {
        data: [avgRollout, 100 - avgRollout],
        backgroundColor: [
          '#4F46E5', // Indigo
          '#E5E7EB', // Neutral light grey
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
      { border: '#4F46E5', bg: 'rgba(79, 70, 229, 0.05)' }, // Indigo
      { border: '#0D9488', bg: 'rgba(13, 148, 136, 0.05)' }, // Teal
      { border: '#EA580C', bg: 'rgba(234, 88, 12, 0.05)' }, // Orange
      { border: '#E11D48', bg: 'rgba(225, 29, 72, 0.05)' }, // Rose
    ];
    return {
      label: formatLegendLabel(f.feature_name),
      data: minutes.map(m => {
        const item = timeline.find(t => t.minute === m && t.feature_name === f.feature_name);
        return item ? item.count : 0;
      }),
      borderColor: colors[i % colors.length].border,
      backgroundColor: colors[i % colors.length].bg,
      fill: true,
      tension: 0.4,
      pointRadius: 3,
      pointHoverRadius: 6,
      borderWidth: 2.5,
    };
  });

  const lineData = {
    labels: minutes,
    datasets: lineDatasets
  };

  // 4. Targeting Rules Activation (Doughnut)
  const ruleLabels = ruleMatchAnalytics.map(r => r.matched_rule_id === 'default' ? 'Global Default' : r.matched_rule_id);
  const ruleCounts = ruleMatchAnalytics.map(r => r.count);
  const ruleColors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#9CA3AF'];
  const ruleDoughnutData = {
    labels: ruleLabels.length > 0 ? ruleLabels : ['No Rules Evaluated'],
    datasets: [
      {
        data: ruleCounts.length > 0 ? ruleCounts : [1],
        backgroundColor: ruleCounts.length > 0 
          ? ruleLabels.map((_, i) => ruleColors[i % ruleColors.length])
          : ['#E5E7EB'],
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
        label: 'Evaluations',
        data: geoCounts.length > 0 ? geoCounts : [0],
        backgroundColor: '#0D9488', // Teal
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

  // 6. Device Distribution (Doughnut)
  const devLabels = deviceDistribution.map(d => d.device_type || 'Unknown');
  const devCounts = deviceDistribution.map(d => d.count);
  const getDeviceColor = (type) => {
    if (type === 'iOS') return '#8B5CF6'; // Violet
    if (type === 'Android') return '#10B981'; // Emerald
    if (type === 'Web') return '#3B82F6'; // Blue
    return '#9CA3AF';
  };
  const devDoughnutData = {
    labels: devLabels.length > 0 ? devLabels : ['No Data'],
    datasets: [
      {
        data: devCounts.length > 0 ? devCounts : [1],
        backgroundColor: devLabels.length > 0 ? devLabels.map(getDeviceColor) : ['#E5E7EB'],
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
        backgroundColor: '#4F46E5', // Indigo
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
    <div className="charts-grid">
      
      {/* SECTION 1: SYSTEM TELEMETRY */}
      <div style={{ gridColumn: '1 / -1' }}>
        <div className="section-title" style={{ marginBottom: '0.75rem' }}>System Telemetry</div>
      </div>

      <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
        <div className="chart-card-title">Real-Time Activity Timeline (10m)</div>
        <div style={{ height: '220px' }}>
          <Line data={lineData} options={commonOptions} />
        </div>
      </div>

      <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
        <div className="chart-card-title">Usage & Failure Events</div>
        <div style={{ height: '240px' }}>
          <Bar data={barData} options={barOptions} />
        </div>
      </div>
      
      {/* SECTION 2: MURMUR HASHING & ROLLOUT STRATEGY */}
      <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
        <div className="section-title" style={{ marginBottom: '0.75rem' }}>Murmur Hashing & Rollout Strategy</div>
      </div>

      <div className="chart-card">
        <div className="chart-card-title">Average Rollout Exposure</div>
        <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '200px', height: '200px', position: 'relative' }}>
            <Doughnut data={doughnutData} options={{...noScaleOptions, cutout: '78%'}} />
            <div style={{ 
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>{Math.round(avgRollout)}%</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', tracking: '0.5px', marginTop: '2px' }}>Avg Reach</div>
            </div>
          </div>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-card-title">Targeting Rule Matches</div>
        <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '190px', height: '190px' }}>
            <Doughnut data={ruleDoughnutData} options={{...doughnutOptionsWithLegend, cutout: '72%'}} />
          </div>
        </div>
      </div>

      {/* SECTION 3: DEMOGRAPHIC INTELLIGENCE */}
      <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
        <div className="section-title" style={{ marginBottom: '0.75rem' }}>Demographic Intelligence</div>
      </div>

      <div className="chart-card">
        <div className="chart-card-title">Device Type Distribution</div>
        <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '190px', height: '190px' }}>
            <Doughnut data={devDoughnutData} options={{...doughnutOptionsWithLegend, cutout: '72%'}} />
          </div>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-card-title">Geospatial Adoption</div>
        <div style={{ height: '220px' }}>
          <Bar data={geoBarData} options={geoOptions} />
        </div>
      </div>

      <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
        <div className="chart-card-title">Age Cohort Saturation</div>
        <div style={{ height: '220px' }}>
          <Bar data={ageBarData} options={ageOptions} />
        </div>
      </div>
    </div>
  );
}

export default AnalyticsCharts;
