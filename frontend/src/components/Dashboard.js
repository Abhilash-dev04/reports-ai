import React, { useState, useEffect } from 'react';
import { useAppState } from '../App';
import { FileText, Layers, Package, Database, Clock, TrendingUp, Activity, BarChart3 } from 'lucide-react';
import dashboardService from '../services/dashboardService';
import './Dashboard.css';

const Dashboard = () => {
  const { selectedState } = useAppState();
  const [kpis, setKpis] = useState({ total_reports: 0, total_modules: 0, total_packages: 0, data_sources: 0 });
  const [modules, setModules] = useState([]);
  const [frequency, setFrequency] = useState([]);
  const [packages, setPackages] = useState([]);
  const [datasource, setDatasource] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboardData(); }, [selectedState]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [kpiData, moduleData, freqData, pkgData, dsData, recentData] = await Promise.all([
        dashboardService.getKPIs(selectedState),
        dashboardService.getModules(selectedState),
        dashboardService.getFrequency(selectedState),
        dashboardService.getPackages(selectedState),
        dashboardService.getDataSource(selectedState),
        dashboardService.getRecentReports(selectedState, 8)
      ]);
      setKpis(kpiData);
      setModules(moduleData);
      setFrequency(freqData);
      setPackages(pkgData);
      setDatasource(dsData);
      setRecentReports(recentData);
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const kpiCards = [
    { label: 'Total Reports', value: kpis.total_reports, icon: FileText, color: 'accent' },
    { label: 'Modules', value: kpis.total_modules, icon: Layers, color: 'primary' },
    { label: 'Packages', value: kpis.total_packages, icon: Package, color: 'warning' },
    { label: 'Data Sources', value: kpis.data_sources, icon: Database, color: 'danger' }
  ];

  const getStateLabel = () => {
    if (selectedState === 'all') return 'All States';
    if (selectedState === 'AK') return 'Alaska';
    if (selectedState === 'NH') return 'New Hampshire';
    if (selectedState === 'ND') return 'North Dakota';
    return selectedState;
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of reports for <span className="state-highlight">{getStateLabel()}</span></p>
        </div>
        <div className="last-updated">
          <Clock size={14} />
          <span>Updated just now</span>
        </div>
      </div>

      {loading ? (
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      ) : (
        <>
          <div className="kpi-grid">
            {kpiCards.map((kpi, idx) => {
              const Icon = kpi.icon;
              return (
                <div key={idx} className={`kpi-card ${kpi.color}`}>
                  <div className="kpi-icon"><Icon size={24} /></div>
                  <div className="kpi-info">
                    <span className="kpi-value">{kpi.value}</span>
                    <span className="kpi-label">{kpi.label}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="dashboard-grid">
            <div className="dashboard-card">
              <div className="card-header">
                <BarChart3 size={18} />
                <h3>Modules Distribution</h3>
              </div>
              <div className="chart-list">
                {modules.map((item, idx) => (
                  <div key={idx} className="chart-item">
                    <div className="chart-label">
                      <span>{item.name}</span>
                      <span className="chart-value">{item.value}</span>
                    </div>
                    <div className="chart-bar-bg">
                      <div className="chart-bar" style={{ width: `${Math.min((item.value / (kpis.total_reports || 1)) * 100, 100)}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="dashboard-card">
              <div className="card-header">
                <Activity size={18} />
                <h3>Report Frequency</h3>
              </div>
              <div className="chart-list">
                {frequency.map((item, idx) => (
                  <div key={idx} className="chart-item">
                    <div className="chart-label">
                      <span>{item.name}</span>
                      <span className="chart-value">{item.value}</span>
                    </div>
                    <div className="chart-bar-bg">
                      <div className="chart-bar accent" style={{ width: `${Math.min((item.value / (kpis.total_reports || 1)) * 100, 100)}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="dashboard-card">
              <div className="card-header">
                <Package size={18} />
                <h3>Packages</h3>
              </div>
              <div className="package-list">
                {packages.map((item, idx) => (
                  <div key={idx} className="package-item">
                    <div className="package-dot"></div>
                    <span className="package-name">{item.name}</span>
                    <span className="package-count">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="dashboard-card">
              <div className="card-header">
                <Database size={18} />
                <h3>Data Sources</h3>
              </div>
              <div className="datasource-list">
                {datasource.map((item, idx) => (
                  <div key={idx} className="datasource-item">
                    <div className="datasource-icon"><Database size={16} /></div>
                    <div className="datasource-info">
                      <span className="datasource-name">{item.name}</span>
                      <span className="datasource-count">{item.value} reports</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="dashboard-card recent-reports">
            <div className="card-header">
              <TrendingUp size={18} />
              <h3>Recent Reports</h3>
            </div>
            <div className="reports-table">
              <div className="table-header">
                <span>Report ID</span>
                <span>Name</span>
                <span>Module</span>
                <span>Package</span>
                <span>State</span>
              </div>
              {recentReports.map((report, idx) => (
                <div key={idx} className="table-row">
                  <span className="report-id">{report.report_id}</span>
                  <span className="report-name">{report.report_name}</span>
                  <span className="report-module">{report.functional_area}</span>
                  <span className="report-package">{report.package_name}</span>
                  <span className="report-state">{report.state}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
