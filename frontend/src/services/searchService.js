import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const searchService = {
  search: async (query, type = "traditional") => {
    const response = await axios.get(`${API_URL}/api/search`, {
      params: { q: query, type }
    });
    return response.data;
  },

  addReport: async (reportData) => {
    const response = await axios.post(`${API_URL}/api/reports`, reportData);
    return response.data;
  },

  contactDevTeam: async (message) => {
    const response = await axios.post(`${API_URL}/api/contact`, { message });
    return response.data;
  }
};

export default searchService;
