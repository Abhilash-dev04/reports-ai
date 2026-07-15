import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const authService = {
  login: async (username, password) => {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      username,
      password
    });
    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem("token");
  },

  getCurrentUser: () => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload;
    } catch {
      return null;
    }
  },

  isAuthenticated: () => {
    return !!localStorage.getItem("token");
  }
};

// Default export
export default authService;

// Named exports for direct import
export const login = authService.login;
export const logout = authService.logout;
export const getCurrentUser = authService.getCurrentUser;
export const isAuthenticated = authService.isAuthenticated;
