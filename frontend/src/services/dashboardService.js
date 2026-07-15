import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const dashboardService = {
  getKPIs: async (state = "all") => {
    const response = await axios.get(`${API_URL}/api/dashboard/kpis`, {
      params: { state }
    });
    return response.data;
  },

  getModuleDistribution: async (state = "all") => {
    const response = await axios.get(`${API_URL}/api/dashboard/modules`, {
      params: { state }
    });
    return response.data;
  },

  getFrequencyDistribution: async (state = "all") => {
    const response = await axios.get(`${API_URL}/api/dashboard/frequency`, {
      params: { state }
    });
    return response.data;
  },

  getPackageDistribution: async (state = "all") => {
    const response = await axios.get(`${API_URL}/api/dashboard/packages`, {
      params: { state }
    });
    return response.data;
  },

  getDataSourceDistribution: async (state = "all") => {
    const response = await axios.get(`${API_URL}/api/dashboard/datasource`, {
      params: { state }
    });
    return response.data;
  }
};

export default dashboardService;
