import React from 'react';
import {
  LayoutDashboard,
  Flag,
  BarChart3,
  Shield,
  Settings,
  Zap,
  Globe,
  Users,
  Hexagon,
  Plus
} from 'lucide-react';

function Sidebar({ activeView, onViewChange, features = [], devices = [] }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'features', label: 'Features', icon: Flag, badge: features.length },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'intelligence', label: 'Rollout Intel', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const environments = [
    { name: 'Production', icon: Globe, count: features.filter(f => f.is_enabled).length },
    { name: 'Staging', icon: Zap },
    { name: 'Development', icon: Zap },
  ];

  // Generate initials from device_name
  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (idx) => {
    const colors = ['#F5F0E8', '#E8F0F5', '#F5E8EE', '#E8F5EC', '#F0E8F5'];
    return colors[idx % colors.length];
  };

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <Hexagon size={18} />
        </div>
        <span className="sidebar-brand-text">FlagForge</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`sidebar-nav-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => onViewChange(item.id)}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span className="nav-badge">{item.badge}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Environments */}
      <div className="sidebar-section-title">Environments</div>
      <div className="sidebar-section">
        {environments.map((env, idx) => (
          <button key={idx} className="sidebar-nav-item">
            <env.icon size={16} />
            <span>{env.name}</span>
            {env.count !== undefined && (
              <span className="nav-badge">{env.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Devices / Members */}
      <div className="sidebar-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '0.625rem' }}>
        <span>Devices</span>
        <Plus size={14} style={{ cursor: 'pointer', color: 'var(--text-tertiary)' }} />
      </div>
      <div className="sidebar-section" style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingBottom: '1.5rem' }}>
        {(devices || []).slice(0, 5).map((device, idx) => (
          <div key={device.device_id} className="sidebar-member">
            <div className="sidebar-avatar" style={{ background: getAvatarColor(idx) }}>
              {getInitials(device.device_name)}
            </div>
            <div className="sidebar-member-info">
              <span className="sidebar-member-name">{device.device_name}</span>
              <span className="sidebar-member-role">{device.device_id}</span>
            </div>
          </div>
        ))}
        {(!devices || devices.length === 0) && (
          <div style={{ padding: '0.5rem 0.625rem', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
            No devices registered
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
