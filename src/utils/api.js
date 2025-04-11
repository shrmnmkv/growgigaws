import axios from 'axios';
import { toast } from 'react-hot-toast';

// Function to get the token from localStorage
const getToken = () => localStorage.getItem('token');

// Create an Axios instance
const api = axios.create({
  // Use a relative path for baseURL. Requests will go to the same origin
  // as the frontend (e.g., http://your-ec2-ip/api/...)
  // Nginx will then proxy requests starting with /api to the backend.
  baseURL: '/', 
});

// Enable debug mode to see detailed logs
const DEBUG_API = true;

// Add a request interceptor to include the token in headers
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
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

// Add a response interceptor for handling errors (optional)
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
        console.log("Unauthorized access - redirecting to login");
        localStorage.removeItem('token');
        // Redirect to login, preserving the intended destination
        // Check if we are already on the login page to avoid loops
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
        }
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