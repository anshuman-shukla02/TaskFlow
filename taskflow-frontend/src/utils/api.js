import { API_URL } from "./api";
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '${API_URL}';

const api = axios.create({
  baseURL: API_URL,
});

// Add a request interceptor to include the auth token based on active role
api.interceptors.request.use((config) => {
  const activeRole = sessionStorage.getItem('activeRole');
  const token = localStorage.getItem(`token_${activeRole}`);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
export { API_URL };

