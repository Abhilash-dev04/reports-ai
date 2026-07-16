import axios from 'axios';
const API_URL = process.env.REACT_APP_API_URL || '';

const dashboardService = {
  getKPIs: async (state = 'all') => {
    const response = await axios.get(`${API_URL}/api/dashboard/kpis?state=${state}`);
    return response.data;
  },
  getModules: async (state = 'all') => {
    const response = await axios.get(`${API_URL}/api/dashboard/modules?state=${state}`);
    return response.data;
  },
  getFrequency: async (state = 'all') => {
    const response = await axios.get(`${API_URL}/api/dashboard/frequency?state=${state}`);
    return response.data;
  },
  getPackages: async (state = 'all') => {
    const response = await axios.get(`${API_URL}/api/dashboard/packages?state=${state}`);
    return response.data;
  },
  getDataSource: async (state = 'all') => {
    const response = await axios.get(`${API_URL}/api/dashboard/datasource?state=${state}`);
    return response.data;
  },
  getRecentReports: async (state = 'all', limit = 8) => {
    const response = await axios.get(`${API_URL}/api/search?q=&state=${state}&limit=${limit}`);
    return response.data;
  }
};
export default dashboardService;
