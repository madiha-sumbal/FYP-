// apiService.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';


const BASE_URL = 'http://192.168.10.8:3000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('driverToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token from storage:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      AsyncStorage.removeItem('driverToken');
    }
    return Promise.reject(error);
  }
);


   
// apiService.js - Login function check
export const authAPI = {
  login: (email, password) => 
    api.post('/driver/login', { 
      email: email.toLowerCase().trim(), 
      password: password 
    }),
  
  register: (driverData) => 
    api.post('/driver/register', driverData),
};
// Add transporter APIs for managing driver requests
export const transporterAPI = {
  getDriverRequests: () => api.get('/transporter/driver-requests'),
  approveDriverRequest: (requestId, transporterId, notes) => 
    api.post('/transporter/approve-driver-request', { requestId, transporterId, notes }),
  rejectDriverRequest: (requestId, transporterId, notes) => 
    api.post('/transporter/reject-driver-request', { requestId, transporterId, notes }),
};
export const driverAPI = {
  getProfile: () => api.get('/drivers/profile'),
  updateProfile: (profileData) => api.put('/drivers/profile', profileData),
};

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

// Utility function to set auth token
export const setAuthToken = async (token) => {
  try {
    if (token) {
      await AsyncStorage.setItem('driverToken', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      await AsyncStorage.removeItem('driverToken');
      delete api.defaults.headers.common['Authorization'];
    }
  } catch (error) {
    console.error('Error handling token storage:', error);
    throw error;
  }
};

// Utility function to get auth token
export const getAuthToken = async () => {
  try {
    const token = await AsyncStorage.getItem('driverToken');
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

export default api;
