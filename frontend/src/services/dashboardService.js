import api from '../utils/axiosConfig';

export const getDashboardSummary = async (state = null) => {
  const params = state ? { state } : {};
  const response = await api.get('/dashboard/summary', { params });
  return response.data;
};

export const getNotifications = async () => {
  const response = await api.get('/api/notify');
  return response.data;
};
