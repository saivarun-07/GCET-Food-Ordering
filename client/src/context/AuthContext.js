import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create axios instance with default config
  const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    },
    withCredentials: true
  });

  // Add request interceptor to include JWT token
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

  // Add response interceptor to handle errors
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      console.error('Response interceptor error:', error);
      if (error.response?.status === 401) {
        // Handle unauthorized access
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );

  // Check authentication status
  const checkAuth = useCallback(async () => {
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
  }, [api]);

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
      setLoading(true);
      const response = await api.post('/api/auth/login', { email, password });
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
        setError(null);
        return { success: true };
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.response?.data?.message === 'Please verify your email first') {
        return { 
          success: false, 
          error: 'Please verify your email before logging in',
          email: error.response.data.email
        };
      }
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed. Please try again.' 
      };
    } finally {
      setLoading(false);
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
  }, [checkAuth]);

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