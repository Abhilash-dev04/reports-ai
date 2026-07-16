import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '';

const authService = {
  login: async (username, password) => {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      username,
      password
    });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  },

  signUp: async (userData) => {
    const response = await axios.post(`${API_URL}/api/auth/signup`, {
      username: userData.username,
      password: userData.password
    });
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  getToken: () => {
    return localStorage.getItem('token');
  }
};

// Default export (for authService.logout style)
export default authService;

// Named exports (for import { logout } style)
export const login = authService.login;
export const signUp = authService.signUp;
export const logout = authService.logout;
export const isAuthenticated = authService.isAuthenticated;
export const getCurrentUser = authService.getCurrentUser;
export const getToken = authService.getToken;