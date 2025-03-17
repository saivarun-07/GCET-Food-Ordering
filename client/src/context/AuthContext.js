import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create axios instance with default config
  const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'https://gcet-food-ordering-backend.onrender.com',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  // Add request interceptor to add token to headers
  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Add response interceptor to handle token expiration
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        setUser(null);
      }
      return Promise.reject(error);
    }
  );

  // Check authentication status
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const response = await api.get('/api/auth/current-user');
      setUser(response.data.user);
      setError(null);
    } catch (error) {
      console.error('Authentication check failed:', error.message);
      setUser(null);
      setError('Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // Register new user
  const register = async (userData) => {
    try {
      console.log('Registering user:', userData);
      const response = await api.post('/api/auth/register', {
        ...userData,
        authMethod: 'email'
      });
      
      // In development, show the verification token
      if (process.env.NODE_ENV === 'development' && response.data.verificationToken) {
        console.log('Verification token:', response.data.verificationToken);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error registering:', error.response?.data || error.message);
      throw error;
    }
  };

  // Verify email
  const verifyEmail = async (email, verificationCode) => {
    try {
      const response = await api.post('/api/auth/verify-email', {
        email,
        verificationCode
      });

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      setError(null);
      return response.data;
    } catch (error) {
      console.error('Error verifying email:', error.response?.data || error.message);
      throw error;
    }
  };

  // Resend verification code
  const resendVerification = async (email) => {
    try {
      const response = await api.post('/api/auth/resend-verification', { email });
      return response.data;
    } catch (error) {
      console.error('Error resending verification:', error.response?.data || error.message);
      throw error;
    }
  };

  // Login
  const login = async (email, password) => {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      setError(null);
      return response.data;
    } catch (error) {
      console.error('Error logging in:', error.response?.data || error.message);
      throw error;
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setError(null);
  };

  // Update user profile
  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/api/auth/profile', profileData);
      setUser(response.data.user);
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error.response?.data || error.message);
      throw error;
    }
  };

  // Check auth status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        register,
        verifyEmail,
        resendVerification,
        login,
        logout,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 