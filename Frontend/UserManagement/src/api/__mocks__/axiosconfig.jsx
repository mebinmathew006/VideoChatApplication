// src/api/__mocks__/axiosconfig.jsx
import axios from 'axios';

// Mock axios instance with your base URL
const axiosInstance = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptors if needed
axiosInstance.interceptors.request.use(
  (config) => {
    // Mock token logic if needed
    const token = 'mock-token';
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;