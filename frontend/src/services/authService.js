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
    // Only sends username and password — backend sets role='user' by default
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

export default authService;