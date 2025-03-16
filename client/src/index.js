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

// Explicitly set the backend API URL
axios.defaults.baseURL = 'https://gcet-food-ordering-backend.onrender.com';

// Add request interceptor to log requests and ensure credentials
axios.interceptors.request.use(request => {
  // Always ensure credentials are included in every request
  request.withCredentials = true;
  
  // Log requests in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Axios Request:', request.method, request.url, request.data);
  }
  
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