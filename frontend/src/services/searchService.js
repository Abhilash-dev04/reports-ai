import axios from 'axios';
const API_URL = process.env.REACT_APP_API_URL || '';

const searchService = {
  search: async (query, type = 'traditional', state = 'all') => {
    const stateParam = state !== 'all' ? `&state=${state}` : '';
    const response = await axios.get(
      `${API_URL}/api/search?q=${encodeURIComponent(query)}&type=${type}${stateParam}`
    );
    return response.data;
  },
  getReportById: async (reportId) => {
    const response = await axios.get(`${API_URL}/api/reports/${reportId}`);
    return response.data;
  },
  addReport: async (reportData) => {
    const response = await axios.post(`${API_URL}/api/reports`, reportData);
    return response.data;
  }
};
export default searchService;
