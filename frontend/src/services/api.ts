import axios from 'axios';
import { getToken, logout } from '../modules/Authentication/utils/auth.ts';

const api = axios.create({
    baseURL: 'http://localhost:5000/api', // <--- musí byť HTTPS!
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor – pridanie tokenu
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor – zachytenie 401, redirect na login a vymazanie auth z fe
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const originalRequest = error.config;

        if (
            error.response &&
            error.response.status === 401 &&
            !originalRequest.url.includes('/auth/login')
        ) {
            logout();
        }

        return Promise.reject(error);
    }
);


export default api;
