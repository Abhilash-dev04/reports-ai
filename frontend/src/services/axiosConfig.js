import axios from 'axios';
const client = axios.create({ baseURL: process.env.REACT_APP_API_URL || '' });
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
export default client;
