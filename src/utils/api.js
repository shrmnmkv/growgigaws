import axios from 'axios';
import { toast } from 'react-hot-toast';

// Create an API instance with base URL
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Enable debug mode to see detailed logs
const DEBUG_API = true;

// Add a request interceptor to add the auth token to all requests
api.interceptors.request.use(
  (config) => {
    // Add token to headers if it exists
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Enable credentials and CORS
    config.withCredentials = true;
    
    // Log request details if debugging is enabled
    if (DEBUG_API) {
      console.log(`API Request: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`, { 
        headers: config.headers,
        data: config.data 
      });
    }
    
    return config;
  },
  (error) => {
    console.error('Request configuration error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    // Log successful responses if debugging is enabled
    if (DEBUG_API) {
      console.log(`API Response: ${response.status} ${response.config.method.toUpperCase()} ${response.config.url}`, {
        data: response.data
      });
    }
    return response;
  },
  (error) => {
    // Check if the error is due to request cancellation
    if (axios.isCancel(error) || error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
      // Silently handle cancellation - no need to show error messages
      return Promise.reject(error);
    }

    // Always log detailed error information for debugging
    console.error('API Error:', {
      message: error.message,
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      headers: error.response?.headers
    });

    if (error.response) {
      // Server responded with an error
      const message = error.response.data?.message || 'An error occurred';
      
      // Only show toast errors for expected API calls (not during debugging)
      if (!error.config?.url?.includes('/fix-status')) {
        toast.error(message);
      }
      
      if (error.response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else if (error.response.status === 404) {
        // Detailed 404 error
        console.error(`API endpoint not found: ${error.config.method.toUpperCase()} ${error.config.url}`);
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('Network error - no response received:', error.request);
      toast.error('Unable to connect to server. Please check your connection.');
    } else {
      // Something else happened
      console.error('API Error:', error.message);
      toast.error('An unexpected error occurred.');
    }
    return Promise.reject(error);
  }
);

export default api;