import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "https://reports-ai.onrender.com";

const authService = {
  login: async (username, password) => {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      username,
      password
    });
    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("username", response.data.username);
      localStorage.setItem("role", response.data.role || "user");
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
  },

  resetPassword: async (username, newPassword) => {
    const response = await axios.post(`${API_URL}/api/auth/reset-password`, {
      username,
      new_password: newPassword
    });
    return response.data;
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

export default authService;

export const login = authService.login;
export const logout = authService.logout;
export const resetPassword = authService.resetPassword;
export const getCurrentUser = authService.getCurrentUser;
export const isAuthenticated = authService.isAuthenticated;
