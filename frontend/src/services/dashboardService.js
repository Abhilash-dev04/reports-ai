import api from './axiosConfig';

const isDemoMode = process.env.REACT_APP_DEMO_MODE === 'true';
const demoKPIs = { total_reports: 12, total_modules: 6, total_packages: 7, data_sources: 3 };
const demoModules = [
  { name: 'Provider Management', value: 3 }, { name: 'Claims', value: 2 },
  { name: 'Eligibility', value: 2 }, { name: 'Pharmacy', value: 2 },
  { name: 'Finance', value: 1 }, { name: 'Member Services', value: 2 },
];
const demoFrequency = [
  { name: 'Daily', value: 4 }, { name: 'Weekly', value: 3 },
  { name: 'Monthly', value: 4 }, { name: 'Quarterly', value: 1 },
];
const demoPackages = [
  { name: 'Provider Demo Package', value: 3 },
  { name: 'Claims Demo Package', value: 2 },
  { name: 'Eligibility Demo Package', value: 2 },
  { name: 'Pharmacy Demo Package', value: 2 },
  { name: 'Finance Demo Package', value: 1 },
];
const demoDataSources = [
  { name: 'DEMO_OLTP', value: 5 }, { name: 'DEMO_EDW', value: 4 },
  { name: 'DEMO_WAREHOUSE', value: 3 },
];
const demoRecentReports = [
  {
    report_id: 'DEMO-RPT-001',
    report_name: 'Provider Enrollment Summary',
    functional_area: 'Provider Management',
    package_name: 'Provider Demo Package',
    state: 'TX',
    frequency: 'Weekly',
  },
  {
    report_id: 'DEMO-RPT-002',
    report_name: 'Claims Payment Reconciliation',
    functional_area: 'Claims',
    package_name: 'Claims Demo Package',
    state: 'CA',
    frequency: 'Daily',
  },
  {
    report_id: 'DEMO-RPT-003',
    report_name: 'Member Eligibility Exceptions',
    functional_area: 'Eligibility',
    package_name: 'Eligibility Demo Package',
    state: 'FL',
    frequency: 'Daily',
  },
  {
    report_id: 'DEMO-RPT-004',
    report_name: 'Pharmacy Utilization Trends',
    functional_area: 'Pharmacy',
    package_name: 'Pharmacy Demo Package',
    state: 'CA',
    frequency: 'Monthly',
  },
  {
    report_id: 'DEMO-RPT-005',
    report_name: 'Provider Address Quality',
    functional_area: 'Provider Management',
    package_name: 'Provider Demo Package',
    state: 'TX',
    frequency: 'Weekly',
  },
];

const dashboardService = {
  getKPIs: async (state = 'all') => isDemoMode ? demoKPIs : (await api.get('/api/dashboard/kpis', { params: { state } })).data,
  getModules: async (state = 'all') => isDemoMode ? demoModules : (await api.get('/api/dashboard/modules', { params: { state } })).data,
  getFrequency: async (state = 'all') => isDemoMode ? demoFrequency : (await api.get('/api/dashboard/frequency', { params: { state } })).data,
  getPackages: async (state = 'all') => isDemoMode ? demoPackages : (await api.get('/api/dashboard/packages', { params: { state } })).data,
  getDataSource: async (state = 'all') => isDemoMode ? demoDataSources : (await api.get('/api/dashboard/datasource', { params: { state } })).data,
  getRecentReports: async (state = 'all', limit = 8) => {
    if (isDemoMode) {
      const rows = state === 'all' ? demoRecentReports : demoRecentReports.filter((r) => r.state === state);
      return rows.slice(0, limit);
    }
    return (await api.get('/api/reports/recent', { params: { state, limit } })).data;
  },
};
export default dashboardService;
