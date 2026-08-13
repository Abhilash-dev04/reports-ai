import React, { useEffect, useState } from 'react';
import {
  Activity,
  BarChart3,
  Clock,
  Database,
  FileText,
  Layers,
  Package,
  TrendingUp,
} from 'lucide-react';
import { useAppState } from '../App';
import dashboardService from '../services/dashboardService';
import DashboardSearch from './DashboardSearch';
import './Dashboard.css';

const stateNames = {
  all: 'All States',
  CA: 'California',
  TX: 'Texas',
  FL: 'Florida',
};

const Dashboard = () => {
  const { selectedState } = useAppState();
  const [kpis, setKpis] = useState({
    total_reports: 0,
    total_modules: 0,
    total_packages: 0,
    data_sources: 0,
  });
  const [modules, setModules] = useState([]);
  const [frequency, setFrequency] = useState([]);
  const [packages, setPackages] = useState([]);
  const [datasource, setDatasource] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [kpiData, moduleData, freqData, pkgData, dsData, recentData] =
          await Promise.all([
            dashboardService.getKPIs(selectedState),
            dashboardService.getModules(selectedState),
            dashboardService.getFrequency(selectedState),
            dashboardService.getPackages(selectedState),
            dashboardService.getDataSource(selectedState),
            dashboardService.getRecentReports(selectedState, 8),
          ]);

        setKpis(kpiData);
        setModules(moduleData);
        setFrequency(freqData);
        setPackages(pkgData);
        setDatasource(dsData);
        setRecentReports(recentData);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedState]);

  const kpiCards = [
    { label: 'Total Reports', value: kpis.total_reports, icon: FileText, tone: 'blue' },
    { label: 'Functional Areas', value: kpis.total_modules, icon: Layers, tone: 'violet' },
    { label: 'Packages', value: kpis.total_packages, icon: Package, tone: 'amber' },
    { label: 'Data Sources', value: kpis.data_sources, icon: Database, tone: 'cyan' },
  ];

  const renderBars = (items, tone = 'blue') => {
    const max = Math.max(1, ...items.map((item) => item.value));
    return (
      <div className="enterprise-bar-list">
        {items.slice(0, 7).map((item) => (
          <div className="enterprise-bar-item" key={item.name}>
            <div>
              <span>{item.name || 'Unknown'}</span>
              <strong>{Number(item.value || 0).toLocaleString()}</strong>
            </div>
            <div className="enterprise-bar-track">
              <span
                className={`enterprise-bar-fill ${tone}`}
                style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <main className="dashboard-page enterprise-page">
      <header className="enterprise-page-header">
        <div>
          <span className="enterprise-eyebrow">
            <Activity size={14} /> Live enterprise analytics
          </span>
          <h1>Enterprise Reports Overview</h1>
          <p>
            Filtered by <strong>{stateNames[selectedState] || selectedState}</strong>.
            Every metric and report updates with the selected state.
          </p>
        </div>
        <div className="enterprise-live-status">
          <span /> All systems normal
        </div>
      </header>

      <DashboardSearch />

      <section className="enterprise-kpi-grid">
        {kpiCards.map(({ label, value, icon: Icon, tone }) => (
          <article className="enterprise-kpi-card" key={label}>
            <div className={`enterprise-kpi-icon ${tone}`}><Icon size={21} /></div>
            <div>
              <span>{label}</span>
              <strong>{loading ? '—' : Number(value || 0).toLocaleString()}</strong>
            </div>
            <TrendingUp size={18} className="enterprise-kpi-trend" />
          </article>
        ))}
      </section>

      <section className="enterprise-dashboard-grid">
        <article className="enterprise-panel">
          <div className="enterprise-panel-header">
            <div><Layers size={18} /><span><strong>Functional Areas</strong><small>Reports by business domain</small></span></div>
          </div>
          {loading ? <div className="enterprise-skeleton tall" /> : renderBars(modules, 'blue')}
        </article>

        <article className="enterprise-panel">
          <div className="enterprise-panel-header">
            <div><Clock size={18} /><span><strong>Report Frequency</strong><small>Distribution by schedule</small></span></div>
          </div>
          {loading ? <div className="enterprise-skeleton tall" /> : renderBars(frequency, 'violet')}
        </article>

        <article className="enterprise-panel">
          <div className="enterprise-panel-header">
            <div><Package size={18} /><span><strong>Top Packages</strong><small>Most represented report packages</small></span></div>
          </div>
          {loading ? <div className="enterprise-skeleton tall" /> : renderBars(packages, 'amber')}
        </article>

        <article className="enterprise-panel">
          <div className="enterprise-panel-header">
            <div><Database size={18} /><span><strong>Data Sources</strong><small>Catalog coverage by source</small></span></div>
          </div>
          {loading ? <div className="enterprise-skeleton tall" /> : renderBars(datasource, 'cyan')}
        </article>
      </section>

      <section className="enterprise-panel enterprise-recent-panel">
        <div className="enterprise-panel-header">
          <div><BarChart3 size={18} /><span><strong>Recent Reports</strong><small>Recently updated catalog assets</small></span></div>
        </div>

        <div className="enterprise-table-wrap">
          <div className="enterprise-table enterprise-table-head">
            <span>Report ID</span><span>Report Name</span><span>Functional Area</span><span>Package</span><span>State</span>
          </div>
          {loading ? (
            <div className="enterprise-skeleton table" />
          ) : recentReports.length === 0 ? (
            <div className="enterprise-empty">No recent reports available.</div>
          ) : (
            recentReports.map((report) => (
              <div className="enterprise-table enterprise-table-row" key={report.report_id}>
                <span className="enterprise-report-id">{report.report_id}</span>
                <span className="enterprise-report-name">{report.report_name}</span>
                <span>{report.functional_area || '—'}</span>
                <span>{report.package_name || '—'}</span>
                <span><b>{report.state || '—'}</b></span>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
};

export default Dashboard;
