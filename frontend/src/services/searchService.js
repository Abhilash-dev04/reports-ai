import api from './axiosConfig';

const searchService = {
  search: async (query, mode = 'traditional', state = 'all') => {
    const response = await api.get('/api/search', {
      params: {
        q: query,
        mode,
        state,
        limit: 20,
        minimum_condition_match: 0.8,
      },
    });
    return response.data;
  },

  getReportById: async (reportId) => {
    const response = await api.get(`/api/reports/${encodeURIComponent(reportId)}`);
    return response.data;
  },

  submitReportRequest: async (reportData) => {
    const response = await api.post('/api/report-requests', reportData);
    return response.data;
  },

  contactDev: async (payload) => {
    const response = await api.post('/api/contact', payload);
    return response.data;
  },
};

export default searchService;
