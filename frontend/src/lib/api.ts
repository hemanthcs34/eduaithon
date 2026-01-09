import axios from 'axios';

// Smart API URL: Automatically detects production vs development
export const getApiUrl = () => {
  // Check if running in browser (client-side)
  if (typeof window !== 'undefined') {
    // If on Vercel production domain, use Render backend
    if (window.location.hostname.includes('vercel.app')) {
      return 'https://coursetwin-backend.onrender.com/api/v1';
    }
  }
  // Default to localhost for local development
  return 'http://localhost:8001/api/v1';
};

const API_URL = getApiUrl();

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
