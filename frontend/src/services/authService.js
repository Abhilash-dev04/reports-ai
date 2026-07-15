import api from '../utils/axiosConfig';

export const login = async (username, password) => {
  const response = await api.post('/auth/login', { username, password });
  if (response.data.access_token) {
    localStorage.setItem('token', response.data.access_token);
    localStorage.setItem('username', response.data.username);
  }
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  window.location.href = '/login';
};

export const getCurrentUser = () => {
  return {
    token: localStorage.getItem('token'),
    username: localStorage.getItem('username'),
  };
};

export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};
