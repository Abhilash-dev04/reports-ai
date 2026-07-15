import api from '../utils/axiosConfig';

export const traditionalSearch = async (query, state = null) => {
  const params = { q: query };
  if (state) params.state = state;
  const response = await api.get('/search', { params });
  return response.data;
};

export const nlpSearch = async (query, state = null) => {
  const response = await api.post('/search/nlp', {
    query,
    state,
    limit: 20,
  });
  return response.data;
};

export const checkExcelSource = async (query, state = null) => {
  const params = { q: query };
  if (state) params.state = state;
  const response = await api.get('/search/check-excel', { params });
  return response.data;
};

export const addMissingData = async (data) => {
  const response = await api.post('/add-data', data);
  return response.data;
};

export const contactDevTeam = async (data) => {
  const response = await api.post('/contact-dev-team', data);
  return response.data;
};

export const exportToExcel = async (query = null) => {
  const params = query ? { q: query } : {};
  const response = await api.get('/export/excel', {
    params,
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'search_results.xlsx');
  document.body.appendChild(link);
  link.click();
  link.remove();
};
