import React, { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import dashboardService from "../services/dashboardService";
import "./Dashboard.css";

const COLORS = ["#1e3a8a", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"];

const Dashboard = () => {
  const [kpiData, setKpiData] = useState({});
  const [moduleData, setModuleData] = useState([]);
  const [frequencyData, setFrequencyData] = useState([]);
  const [packageData, setPackageData] = useState([]);
  const [dataSourceData, setDataSourceData] = useState([]);
  const [activeState, setActiveState] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchData = async (state = "all") => {
    setLoading(true);
    try {
      const kpi = await dashboardService.getKPIs(state);
      setKpiData(kpi);

      const modules = await dashboardService.getModuleDistribution(state);
      setModuleData(modules);

      const freq = await dashboardService.getFrequencyDistribution(state);
      setFrequencyData(freq);

      const pkg = await dashboardService.getPackageDistribution(state);
      setPackageData(pkg);

      const ds = await dashboardService.getDataSourceDistribution(state);
      setDataSourceData(ds);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(activeState);
  }, [activeState, fetchData]);

  const handleStateClick = (state) => {
    setActiveState(state);
  };

  if (loading) return <div className="dashboard-loading">Loading dashboard...</div>;

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Reports AI Dashboard</h1>

      <div className="state-tabs">
        {["all", "AK", "NH", "ND"].map((state) => (
          <button
            key={state}
            className={`state-tab ${activeState === state ? "active" : ""}`}
            onClick={() => handleStateClick(state)}
          >
            {state === "all" ? "All States" : state}
          </button>
        ))}
      </div>

      <div className="kpi-cards">
        <div className="kpi-card">
          <h3>Total Reports</h3>
          <p className="kpi-value">{kpiData.total_reports || 0}</p>
        </div>
        <div className="kpi-card">
          <h3>Total Modules</h3>
          <p className="kpi-value">{kpiData.total_modules || 0}</p>
        </div>
        <div className="kpi-card">
          <h3>Total Packages</h3>
          <p className="kpi-value">{kpiData.total_packages || 0}</p>
        </div>
        <div className="kpi-card">
          <h3>Data Sources</h3>
          <p className="kpi-value">{kpiData.data_sources || 0}</p>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Module Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={moduleData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#1e3a8a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Frequency Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={frequencyData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {frequencyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Package Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={packageData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={150} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Data Source (MMIS vs ORR)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={dataSourceData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {dataSourceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
