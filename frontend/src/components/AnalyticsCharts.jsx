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

function AnalyticsCharts({ analytics, timeline, features }) {
  if (!features || features.length === 0) return null;

  // Global Chart Options
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#94A3B8',
          font: { family: "'Inter', sans-serif", size: 12 }
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
        grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false } 
      },
      y: { 
        ticks: { color: '#64748B' }, 
        grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false } 
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

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
      
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
      
    </div>
  );
}

export default AnalyticsCharts;
