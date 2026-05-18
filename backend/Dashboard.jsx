import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, Shield, Zap, Users, BarChart3, Clock, LayoutGrid, List,
  RefreshCcw, Save, Trash2, CheckCircle2, AlertCircle, TrendingUp, Info, Smartphone, BarChart
} from 'lucide-react';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [localFeatures, setLocalFeatures] = useState({}); // Tracking UI state
  const [dirtyFlags, setDirtyFeatures] = useState({}); // Tracking unsaved changes
  const [loading, setLoading] = useState(true);
  const [notif, setNotif] = useState(null);

  const API_URL = "http://127.0.0.1:5000";

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/dashboard-data`);
      const result = await response.json();
      setData(result);
      
      // Update local state ONLY for flags that aren't being edited
      const newLocal = { ...localFeatures };
      result.features.forEach(f => {
        if (!dirtyFlags[f.feature_name]) {
          newLocal[f.feature_name] = f;
        }
      });
      setLocalFeatures(newLocal);
      setLoading(false);
    } catch (err) {
      console.error("Fetch error", err);
    }
  }, [dirtyFlags, localFeatures]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleSliderChange = (name, val) => {
    setDirtyFeatures({ ...dirtyFlags, [name]: true });
    setLocalFeatures({
      ...localFeatures,
      [name]: { ...localFeatures[name], rollout_percentage: parseInt(val) }
    });
  };

  const handleToggle = (name) => {
    setDirtyFeatures({ ...dirtyFlags, [name]: true });
    setLocalFeatures({
      ...localFeatures,
      [name]: { ...localFeatures[name], is_enabled: localFeatures[name].is_enabled ? 0 : 1 }
    });
  };

  const saveFeature = async (name) => {
    const feat = localFeatures[name];
    try {
      await fetch(`${API_URL}/update-feature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feat)
      });
      const newDirty = { ...dirtyFlags };
      delete newDirty[name];
      setDirtyFeatures(newDirty);
      setNotif(`Saved ${name} successfully!`);
      setTimeout(() => setNotif(null), 3000);
    } catch (err) {
      alert("Error saving");
    }
  };

  if (loading || !data) return <div className="p-10 text-white bg-slate-950 min-h-screen">Loading FlagForge...</div>;

  return (
    <div className="min-h-screen bg-[#0a0c14] text-slate-200 font-sans p-6 selection:bg-cyan-500/30">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            FlagForge <span className="text-slate-600 text-sm font-normal ml-2 tracking-widest uppercase">Enterprise</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Real-time Deterministic Feature Rollouts</p>
        </div>
        <div className="flex gap-4">
          {notif && <div className="bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg border border-emerald-500/30 text-sm flex items-center gap-2 animate-bounce">
            <CheckCircle2 size={16} /> {notif}
          </div>}
          <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-full border border-slate-800 text-xs">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            Simulator Active: {data.devices.length} Devices
          </div>
        </div>
      </header>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <MetricCard icon={<Users className="text-blue-400" />} label="Total Devices" value={data.total_devices_count} sub="Fleet Size" />
        <MetricCard icon={<Activity className="text-cyan-400" />} label="Active (5m)" value={data.active_devices} sub="Live Load" />
        <MetricCard icon={<Zap className="text-emerald-400" />} label="Success Rate" value={`${data.success_rate}%`} sub="Stability" />
        <MetricCard icon={<TrendingUp className="text-purple-400" />} label="Most Used" value={data.most_used_feature.replace('_', ' ')} sub="Adoption Leader" />
        <MetricCard icon={<BarChart3 className="text-amber-400" />} label="Total Events" value={data.total_events.toLocaleString()} sub="Lifetime" />
        <MetricCard icon={<AlertCircle className="text-red-400" />} label="Failed Events" value={data.failed_events} sub="Errors" />
        <MetricCard icon={<Smartphone className="text-indigo-400" />} label="Avg Usage" value={`${data.avg_usage}`} sub="Per Device" />
        <MetricCard icon={<Shield className="text-pink-400" />} label="Active Flags" value={data.features.filter(f => f.is_enabled).length} sub="Control Plane" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Controls */}
        <div className="xl:col-span-2 space-y-6">
          <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-6">
              <Shield size={20} className="text-cyan-500" />
              <h2 className="text-xl font-semibold text-white">Feature Management</h2>
            </div>
            <div className="space-y-4">
              {Object.values(localFeatures).map(f => (
                <div key={f.feature_name} className="group bg-slate-900 border border-slate-800 p-5 rounded-xl hover:border-slate-700 transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-medium text-white">{f.feature_name}</span>
                        {dirtyFlags[f.feature_name] && <span className="text-[10px] bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded border border-amber-500/30 uppercase font-bold">Unsaved Changes</span>}
                      </div>
                      <p className="text-slate-500 text-xs mt-1">Rollout strategy: Deterministic MurmurHash3</p>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">0%</span>
                        <input 
                          type="range" 
                          className="w-32 accent-cyan-500 bg-slate-800 rounded-lg appearance-none cursor-pointer h-1.5"
                          value={f.rollout_percentage} 
                          onChange={(e) => handleSliderChange(f.feature_name, e.target.value)}
                        />
                        <span className="text-sm font-bold text-cyan-400 w-8">{f.rollout_percentage}%</span>
                      </div>

                      <button 
                        onClick={() => handleToggle(f.feature_name)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${f.is_enabled ? 'bg-cyan-500' : 'bg-slate-700'}`}
                      >
                        <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-all ${f.is_enabled ? 'left-7' : 'left-1'}`}></div>
                      </button>

                      <button 
                        disabled={!dirtyFlags[f.feature_name]}
                        onClick={() => saveFeature(f.feature_name)}
                        className={`p-2 rounded-lg transition-all ${dirtyFlags[f.feature_name] ? 'bg-cyan-600 text-white hover:bg-cyan-500' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}
                      >
                        <Save size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Analytics & Leaderboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <BarChart size={20} className="text-emerald-400" />
                <h2 className="text-lg font-semibold text-white">Adoption Leaderboard</h2>
              </div>
              <div className="space-y-4">
                {data.adoption.sort((a,b) => b.unique_users - a.unique_users).map(a => (
                  <div key={a.feature_name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300 font-mono">{a.feature_name}</span>
                      <span className="text-slate-500">{a.adoption_percentage}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-1000" 
                        style={{ width: `${a.adoption_percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <Zap size={20} className="text-amber-400" />
                <h2 className="text-lg font-semibold text-white">System Health</h2>
              </div>
              <div className="flex flex-col items-center justify-center h-32">
                <div className="text-4xl font-bold text-white mb-2">{data.success_rate}%</div>
                <p className="text-slate-500 text-xs uppercase tracking-widest">Global Success vs Failure</p>
                <div className="w-full flex h-3 mt-6 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: `${data.success_rate}%` }} title="Success" />
                  <div className="bg-red-500 h-full" style={{ width: `${100 - data.success_rate}%` }} title="Failure" />
                </div>
              </div>
            </section>
          </div>

          {/* Device Monitoring Section */}
          <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <LayoutGrid size={20} className="text-blue-400" />
              <h2 className="text-xl font-semibold text-white">Device Monitoring</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {data.devices.slice(0, 48).map(dev => (
                <div key={dev.device_id} className="bg-slate-800/40 p-2 rounded border border-slate-800 text-[9px] font-mono text-slate-500 hover:border-blue-500/50 transition-colors">
                  {dev.device_id.split('_').pop()}
                </div>
              ))}
              <div className="flex items-center justify-center text-[10px] text-slate-600 italic">+{data.total_devices_count - 48} more...</div>
            </div>
          </section>

          {/* Rollout Intelligence */}
          <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <BarChart3 size={20} className="text-purple-400" />
                <h2 className="text-xl font-semibold text-white">Rollout Intelligence</h2>
              </div>
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <Info size={12} /> Explaining deterministic selection logic
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-slate-500 text-xs border-b border-slate-800 uppercase tracking-tighter">
                    <th className="pb-3 px-2 font-semibold">Device Instance</th>
                    <th className="pb-3 px-2 font-semibold">Feature</th>
                    <th className="pb-3 px-2 font-semibold">MurmurHash3</th>
                    <th className="pb-3 px-2 font-semibold text-center">Score (0-99)</th>
                    <th className="pb-3 px-2 font-semibold">Access</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {data.intelligence.slice(0, 8).map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/20 group">
                      <td className="py-4 px-2 font-mono text-xs text-slate-400">{item.device_id.split('_').pop()}...</td>
                      <td className="py-4 px-2 text-slate-300">{item.feature_name}</td>
                      <td className="py-4 px-2 font-mono text-[10px] text-slate-500">{item.hash_value}</td>
                      <td className="py-4 px-2 text-center">
                        <div className="flex flex-col items-center">
                          <span className={item.is_enabled ? 'text-cyan-400 font-bold' : 'text-slate-600'}>{item.normalized_hash}</span>
                          <div className="w-16 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                            <div 
                              className={`h-full ${item.is_enabled ? 'bg-cyan-500' : 'bg-slate-700'}`} 
                              style={{ width: `${item.normalized_hash}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        {item.is_enabled ? (
                          <span className="flex items-center gap-1 text-emerald-400 text-xs font-semibold bg-emerald-500/10 px-2 py-1 rounded-full w-fit border border-emerald-500/20">
                            <CheckCircle2 size={12} /> ENABLED
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-slate-500 text-xs font-semibold bg-slate-800 px-2 py-1 rounded-full w-fit border border-slate-700">
                            <AlertCircle size={12} /> DISABLED
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Live Activity Feed */}
          <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm max-h-[400px] flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={20} className="text-amber-400" />
              <h2 className="text-xl font-semibold text-white">Live Event Feed</h2>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
              {data.live_feed.map((l, i) => (
                <div key={i} className="flex gap-3 items-start animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className={`mt-1 p-1 rounded-full ${l.usage_status === 'used' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-red-500/20 text-red-400'}`}>
                    {l.usage_status === 'used' ? <Zap size={10} /> : <AlertCircle size={10} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <span className="text-xs font-medium text-slate-300 underline underline-offset-4 decoration-slate-700">{l.feature_name}</span>
                      <span className="text-[10px] text-slate-600">{new Date(l.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">dev_{l.device_id.split('_').pop()}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* History */}
          <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <RefreshCcw size={20} className="text-blue-400" />
              <h2 className="text-xl font-semibold text-white">Change History</h2>
            </div>
            <div className="space-y-4">
              {data.history.map((h, i) => (
                <div key={i} className="relative pl-4 border-l border-slate-800 pb-2 last:pb-0">
                  <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-300">{h.feature_name}</span>
                    <span className="text-[9px] text-slate-600 uppercase font-bold">{new Date(h.changed_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px]">
                    <span className={h.is_enabled ? 'text-emerald-500' : 'text-slate-500'}>
                      {h.is_enabled ? 'ON' : 'OFF'}
                    </span>
                    <span className="text-slate-700">•</span>
                    <span className="text-cyan-400">{h.rollout_percentage}% Rollout</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Admin Tools */}
          <section className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-2xl p-6 backdrop-blur-sm">
            <h3 className="text-white font-bold text-sm mb-2">Platform Integrity</h3>
            <p className="text-slate-400 text-xs mb-4 leading-relaxed">Deterministic rollout allows for A/B testing and canary deployments without stateful synchronization.</p>
            <div className="grid grid-cols-2 gap-2">
               <button className="bg-slate-900 border border-slate-800 hover:border-red-500/50 hover:text-red-400 transition-all py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-2">
                 <Trash2 size={14} /> Clear Cache
               </button>
               <button className="bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:text-cyan-400 transition-all py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-2">
                 <RefreshCcw size={14} /> System Check
               </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ icon, label, value, sub }) => (
  <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl backdrop-blur-sm hover:translate-y-[-2px] transition-all">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-slate-800 rounded-xl">{icon}</div>
      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{sub}</span>
    </div>
    <div className="text-2xl font-bold text-white mb-1">{value}</div>
    <div className="text-xs text-slate-500 font-medium">{label}</div>
  </div>
);

export default Dashboard;