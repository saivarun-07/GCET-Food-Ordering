import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';

// Configure axios
axios.defaults.withCredentials = true; // Include credentials in requests

// Set base URL - useful if the API is hosted on a different domain in production
// In development, the proxy in package.json will handle this
axios.defaults.baseURL = process.env.REACT_APP_API_URL || '';

// Add request interceptor to log requests and add /api prefix if needed
axios.interceptors.request.use(request => {
  // Log requests in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Axios Request:', request.method, request.url, request.data);
  }
  
  // Add additional request processing here if needed
  return request;
});

// Log requests in development
if (process.env.NODE_ENV === 'development') {
  axios.interceptors.response.use(
    response => {
      console.log('Axios Response:', response.status, response.data);
      return response;
    },
    error => {
      console.error('Axios Error:', 
        error.response?.status, 
        error.response?.data || error.message
      );
      return Promise.reject(error);
    }
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <ToastContainer position="bottom-right" autoClose={3000} />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
); 