import axios from 'axios';
const API_URL = process.env.REACT_APP_API_URL || '';

const authService = {
  login: async (username, password) => {
    const response = await axios.post(`${API_URL}/api/auth/login`, { username, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  },
  signUp: async (userData) => {
    const response = await axios.post(`${API_URL}/api/auth/signup`, {
      username: userData.username, password: userData.password
    });
    return response.data;
  },
  resetPassword: async (username, newPassword) => {
    const response = await axios.post(`${API_URL}/api/auth/reset-password`, {
      username, new_password: newPassword
    });
    return response.data;
  },
  logout: () => { localStorage.removeItem('token'); localStorage.removeItem('user'); },
  isAuthenticated: () => !!localStorage.getItem('token'),
  getCurrentUser: () => { const user = localStorage.getItem('user'); return user ? JSON.parse(user) : null; },
  getToken: () => localStorage.getItem('token')
};

export const login = authService.login;
export const signUp = authService.signUp;
export const resetPassword = authService.resetPassword;
export const logout = authService.logout;
export const isAuthenticated = authService.isAuthenticated;
export const getCurrentUser = authService.getCurrentUser;
export const getToken = authService.getToken;
export default authService;
