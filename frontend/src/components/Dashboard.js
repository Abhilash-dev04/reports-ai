import React, { useState, useEffect } from 'react';
import { getDashboardSummary } from '../services/dashboardService';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import {
  LayoutDashboard, FileText, Layers, Package, Database,
  TrendingUp, Activity, MapPin, ChevronRight
} from 'lucide-react';

const COLORS = {
  primary: ['#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF', '#1E3A8A'],
  secondary: ['#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE', '#EFF6FF'],
  accent: ['#0EA5E9', '#0284C7', '#0369A1', '#075985', '#0C4A6E'],
  dataSource: ['#3B82F6', '#0EA5E9'],
  states: {
    AK: '#3B82F6',
    NH: '#0EA5E9',
    ND: '#2563EB',
    ALL: '#64748B',
  }
};

const STATE_NAMES = {
  AK: 'Alaska',
  NH: 'New Hampshire',
  ND: 'North Dakota',
  ALL: 'All States',
};

const KPICard = ({ title, value, subtitle, icon: Icon, color, trend }) => (
  <div style={{
    background: '#FFFFFF',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)',
    border: '1px solid #F1F5F9',
    transition: 'all 0.3s ease',
    cursor: 'default',
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.boxShadow = '0 8px 24px rgba(37, 99, 235, 0.1)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)';
  }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
      <div style={{
        width: '44px',
        height: '44px',
        borderRadius: '10px',
        background: `linear-gradient(135deg, ${color}20, ${color}10)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Icon size={22} color={color} />
      </div>
      {trend && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 10px',
          background: trend > 0 ? '#ECFDF5' : '#FEF2F2',
          borderRadius: '20px',
        }}>
          <TrendingUp size={14} color={trend > 0 ? '#10B981' : '#EF4444'} />
          <span style={{ fontSize: '12px', fontWeight: '600', color: trend > 0 ? '#10B981' : '#EF4444' }}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        </div>
      )}
    </div>
    <div style={{ fontSize: '28px', fontWeight: '700', color: '#1E293B', marginBottom: '4px', letterSpacing: '-0.5px' }}>
      {value}
    </div>
    <div style={{ fontSize: '13px', fontWeight: '500', color: '#64748B', marginBottom: '2px' }}>{title}</div>
    {subtitle && <div style={{ fontSize: '11px', color: '#94A3B8' }}>{subtitle}</div>}
  </div>
);

const ChartCard = ({ title, subtitle, children, height = 300 }) => (
  <div style={{
    background: '#FFFFFF',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)',
    border: '1px solid #F1F5F9',
  }}>
    <div style={{ marginBottom: '20px' }}>
      <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#1E293B', marginBottom: '2px' }}>{title}</h3>
      {subtitle && <p style={{ fontSize: '12px', color: '#94A3B8' }}>{subtitle}</p>}
    </div>
    <div style={{ height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        padding: '10px 14px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      }}>
        <p style={{ fontSize: '12px', fontWeight: '600', color: '#1E293B', marginBottom: '4px' }}>{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ fontSize: '12px', color: '#64748B' }}>
            <span style={{ color: entry.color, fontWeight: '600' }}>{entry.name}:</span> {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  const [selectedState, setSelectedState] = useState('ALL');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const states = ['ALL', 'AK', 'NH', 'ND'];

  useEffect(() => {
    fetchData();
  }, [selectedState]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const stateParam = selectedState === 'ALL' ? null : selectedState;
      const result = await getDashboardSummary(stateParam);
      setData(result);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #DBEAFE',
          borderTop: '3px solid #3B82F6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#DC2626' }}>
        <p>{error}</p>
        <button
          onClick={fetchData}
          style={{
            marginTop: '16px',
            padding: '10px 20px',
            background: '#3B82F6',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >Retry</button>
      </div>
    );
  }

  const totalModules = data?.module_distribution?.length || 0;
  const totalPackages = data?.package_distribution?.length || 0;

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <LayoutDashboard size={24} color="#3B82F6" />
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1E293B', letterSpacing: '-0.5px' }}>
            Executive Dashboard
          </h1>
        </div>
        <p style={{ fontSize: '14px', color: '#64748B', marginLeft: '34px' }}>
          Real-time inventory overview across all states
        </p>
      </div>

      {/* State Toggle */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '28px',
        padding: '6px',
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        width: 'fit-content',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        {states.map((state) => (
          <button
            key={state}
            onClick={() => setSelectedState(state)}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: selectedState === state
                ? 'linear-gradient(135deg, #3B82F6, #2563EB)'
                : 'transparent',
              color: selectedState === state ? '#FFFFFF' : '#64748B',
              boxShadow: selectedState === state ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {state !== 'ALL' && <MapPin size={14} />}
              {state === 'ALL' ? 'All States' : state}
            </div>
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
        marginBottom: '28px',
      }}>
        <KPICard
          title="Total Reports"
          value={data?.total_reports?.toLocaleString() || '0'}
          subtitle={`Across ${STATE_NAMES[selectedState]}`}
          icon={FileText}
          color="#3B82F6"
          trend={12}
        />
        <KPICard
          title="Total Modules"
          value={totalModules}
          subtitle="Functional areas"
          icon={Layers}
          color="#0EA5E9"
          trend={8}
        />
        <KPICard
          title="Total Packages"
          value={totalPackages}
          subtitle="Package categories"
          icon={Package}
          color="#2563EB"
          trend={5}
        />
        <KPICard
          title="Data Sources"
          value={data?.data_source_distribution?.length || 0}
          subtitle="MMIS & ORR"
          icon={Database}
          color="#1D4ED8"
        />
        <KPICard
          title="Active Reports"
          value={data?.active_count?.toLocaleString() || '0'}
          subtitle={`${data?.inactive_count || 0} inactive`}
          icon={Activity}
          color="#10B981"
        />
        <KPICard
          title="Recent Additions"
          value={data?.recent_additions || 0}
          subtitle="Last 7 days"
          icon={TrendingUp}
          color="#F59E0B"
        />
      </div>

      {/* Charts Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
        gap: '24px',
        marginBottom: '28px',
      }}>
        {/* Module-wise Distribution */}
        <ChartCard title="Module-wise Distribution" subtitle="Reports by functional area">
          <BarChart data={data?.module_distribution?.slice(0, 8) || []} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis type="number" fontSize={11} tick={{ fill: '#94A3B8' }} />
            <YAxis dataKey="name" type="category" width={120} fontSize={11} tick={{ fill: '#64748B' }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {data?.module_distribution?.slice(0, 8).map((_, i) => (
                <Cell key={i} fill={COLORS.primary[i % COLORS.primary.length]} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        {/* Frequency-wise Distribution */}
        <ChartCard title="Frequency-wise Distribution" subtitle="Report execution frequency">
          <PieChart>
            <Pie
              data={data?.frequency_distribution || []}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={4}
              dataKey="value"
            >
              {data?.frequency_distribution?.map((_, i) => (
                <Cell key={i} fill={COLORS.primary[i % COLORS.primary.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" height={36} iconType="circle" />
          </PieChart>
        </ChartCard>

        {/* Package-wise Distribution */}
        <ChartCard title="Package-wise Distribution" subtitle="Top 10 packages by volume">
          <BarChart data={data?.package_distribution?.slice(0, 10) || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="name" fontSize={10} tick={{ fill: '#94A3B8' }} angle={-30} textAnchor="end" height={60} />
            <YAxis fontSize={11} tick={{ fill: '#94A3B8' }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#3B82F6" />
          </BarChart>
        </ChartCard>

        {/* Data Source Distribution */}
        <ChartCard title="Data Source Distribution" subtitle="MMIS vs ORR">
          <PieChart>
            <Pie
              data={data?.data_source_distribution || []}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={5}
              dataKey="value"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data?.data_source_distribution?.map((entry, i) => (
                <Cell key={i} fill={COLORS.dataSource[i % COLORS.dataSource.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ChartCard>
      </div>

      {/* State Comparison Section */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)',
        border: '1px solid #F1F5F9',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <MapPin size={20} color="#3B82F6" />
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1E293B' }}>State Comparison</h3>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}>
          {Object.entries(data?.state_counts || {}).map(([state, count]) => (
            <div
              key={state}
              onClick={() => setSelectedState(state)}
              style={{
                padding: '18px',
                borderRadius: '10px',
                border: selectedState === state ? '2px solid #3B82F6' : '1px solid #E2E8F0',
                background: selectedState === state ? '#EFF6FF' : '#FFFFFF',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (selectedState !== state) {
                  e.currentTarget.style.borderColor = '#93C5FD';
                  e.currentTarget.style.background = '#F8FAFC';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedState !== state) {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.background = '#FFFFFF';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#1E293B' }}>
                  {STATE_NAMES[state] || state}
                </span>
                <ChevronRight size={16} color="#94A3B8" />
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#3B82F6' }}>
                {count.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: '#94A3B8' }}>reports</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
