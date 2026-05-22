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

  // Light theme chart options
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#6B7280',
          font: { family: "'Inter', sans-serif", size: 11, weight: '500' },
          usePointStyle: true,
          pointStyleWidth: 8,
          padding: 16,
        }
      },
      tooltip: {
        backgroundColor: '#1A1A1A',
        titleColor: '#FFFFFF',
        bodyColor: '#D4D4D8',
        borderColor: '#374151',
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        cornerRadius: 8,
        titleFont: { weight: '600' },
      }
    },
    scales: {
      x: { 
        ticks: { color: '#9CA3AF', font: { size: 11 } }, 
        grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false } 
      },
      y: { 
        ticks: { color: '#9CA3AF', font: { size: 11 } }, 
        grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false } 
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
        backgroundColor: '#1A1A1A',
        borderRadius: 4,
      },
      {
        label: 'Failed',
        data: features.map(f => {
          const item = analytics.find(a => a.feature_name === f.feature_name && a.usage_status === 'failed');
          return item ? item.count : 0;
        }),
        backgroundColor: '#D4D4D8',
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
          '#1A1A1A',
          '#E5E5E5',
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
      { border: '#1A1A1A', bg: 'rgba(26, 26, 26, 0.06)' },
      { border: '#7C3AED', bg: 'rgba(124, 58, 237, 0.06)' },
      { border: '#16A34A', bg: 'rgba(22, 163, 74, 0.06)' },
      { border: '#3B82F6', bg: 'rgba(59, 130, 246, 0.06)' },
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
      pointHoverRadius: 5,
      borderWidth: 2,
    };
  });

  const lineData = {
    labels: minutes,
    datasets: lineDatasets
  };

  // 4. Targeting Rules Activation (Doughnut)
  const ruleLabels = ruleMatchAnalytics.map(r => r.matched_rule_id === 'default' ? 'Global Default' : r.matched_rule_id);
  const ruleCounts = ruleMatchAnalytics.map(r => r.count);
  const ruleColors = ['#1A1A1A', '#7C3AED', '#0D9488', '#3B82F6', '#D97706', '#16A34A', '#9CA3AF'];
  const ruleDoughnutData = {
    labels: ruleLabels.length > 0 ? ruleLabels : ['No Rules Evaluated'],
    datasets: [
      {
        data: ruleCounts.length > 0 ? ruleCounts : [1],
        backgroundColor: ruleCounts.length > 0 
          ? ruleLabels.map((_, i) => ruleColors[i % ruleColors.length])
          : ['#E5E5E5'],
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
        backgroundColor: '#0D9488',
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
    if (type === 'iOS') return '#7C3AED';
    if (type === 'Android') return '#16A34A';
    if (type === 'Web') return '#3B82F6';
    return '#9CA3AF';
  };
  const devDoughnutData = {
    labels: devLabels.length > 0 ? devLabels : ['No Data'],
    datasets: [
      {
        data: devCounts.length > 0 ? devCounts : [1],
        backgroundColor: devLabels.length > 0 ? devLabels.map(getDeviceColor) : ['#E5E5E5'],
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
        backgroundColor: '#1A1A1A',
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

      <div className="chart-card">
        <div className="chart-card-title">Usage & Failure Events</div>
        <div style={{ height: '240px' }}>
          <Bar data={barData} options={barOptions} />
        </div>
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
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{Math.round(avgRollout)}%</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Avg Reach</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
        <div className="chart-card-title">Real-Time Activity Timeline (10m)</div>
        <div style={{ height: '220px' }}>
          <Line data={lineData} options={commonOptions} />
        </div>
      </div>

      {/* SECTION 2: DEMOGRAPHIC & RULE TARGETING */}
      <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
        <div className="section-title" style={{ marginBottom: '0.75rem' }}>Targeting & Demographic Intelligence</div>
      </div>

      <div className="chart-card">
        <div className="chart-card-title">Targeting Rule Matches</div>
        <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '190px', height: '190px' }}>
            <Doughnut data={ruleDoughnutData} options={{...noScaleOptions, cutout: '72%'}} />
          </div>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-card-title">Device Type Distribution</div>
        <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '190px', height: '190px' }}>
            <Doughnut data={devDoughnutData} options={{...noScaleOptions, cutout: '72%'}} />
          </div>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-card-title">Geospatial Adoption</div>
        <div style={{ height: '220px' }}>
          <Bar data={geoBarData} options={geoOptions} />
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-card-title">Age Cohort Saturation</div>
        <div style={{ height: '220px' }}>
          <Bar data={ageBarData} options={ageOptions} />
        </div>
      </div>
    </div>
  );
}

export default AnalyticsCharts;
