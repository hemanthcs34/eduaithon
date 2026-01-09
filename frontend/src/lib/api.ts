import axios from 'axios';

// HARDCODED for production stability
const API_URL = 'https://coursetwin-backend.onrender.com/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

export const fetcher = (url: string) => api.get(url).then((res) => res.data);
