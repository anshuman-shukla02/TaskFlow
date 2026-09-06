import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';

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

// Add a response interceptor to handle expired/invalid tokens
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const activeRole = sessionStorage.getItem('activeRole');
      if (activeRole) {
        localStorage.removeItem(`token_${activeRole}`);
        localStorage.removeItem(`user_${activeRole}`);
        sessionStorage.removeItem('activeRole');
      }
      // Redirect to auth page — avoid redirect loop if already on /auth
      if (window.location.pathname !== '/auth' && window.location.pathname !== '/') {
        window.location.href = '/auth';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_URL };
