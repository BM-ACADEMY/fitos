import axios from 'axios';
import { useAuth } from '../store/auth';

const api = axios.create({ baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api` });

api.interceptors.request.use((config) => {
  const { token } = useAuth.getState();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuth.getState().logout();
      if (!location.pathname.match(/^\/(login|master|member|join)/)) location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
