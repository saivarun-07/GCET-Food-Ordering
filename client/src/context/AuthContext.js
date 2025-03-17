import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verificationStep, setVerificationStep] = useState('register'); // 'register', 'verify', 'login'
  const [error, setError] = useState('');
  const [apiError, setApiError] = useState(null);
  const [verificationToken, setVerificationToken] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get('/api/auth/current-user');
      setUser(response.data);
      setApiError(null);
    } catch (error) {
      console.error('Authentication check failed:', error.response?.data?.message || error.message);
      setUser(null);
      
      // Only set API error if it's not a 401 (which is expected when not logged in)
      if (error.response?.status !== 401) {
        setApiError({
          message: error.response?.data?.message || 'Failed to check authentication status',
          status: error.response?.status
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setError('');
      setApiError(null);
      
      console.log('Registering user:', userData);
      const response = await axios.post('/api/auth/register', userData);
      console.log('Registration response:', response.data);
      
      if (response.data.verificationToken) {
        setVerificationToken(response.data.verificationToken);
      }
      
      setVerificationStep('verify');
      return response.data;
    } catch (error) {
      console.error('Error registering:', error);
      setError(error.response?.data?.message || 'Failed to register');
      setApiError({
        message: error.response?.data?.message || 'Failed to register',
        status: error.response?.status
      });
      throw error;
    }
  };

  const verifyEmail = async (email, token) => {
    try {
      setError('');
      setApiError(null);
      
      console.log('Verifying email:', { email, token });
      const response = await axios.post('/api/auth/verify-email', { email, token });
      console.log('Email verification response:', response.data);
      
      setUser(response.data);
      setVerificationStep('login');
      return response.data;
    } catch (error) {
      console.error('Error verifying email:', error);
      setError(error.response?.data?.message || 'Invalid verification code');
      setApiError({
        message: error.response?.data?.message || 'Failed to verify email',
        status: error.response?.status
      });
      throw error;
    }
  };

  const resendVerification = async (email) => {
    try {
      setError('');
      setApiError(null);
      
      console.log('Resending verification to:', email);
      const response = await axios.post('/api/auth/resend-verification', { email });
      console.log('Resend verification response:', response.data);
      
      if (response.data.verificationToken) {
        setVerificationToken(response.data.verificationToken);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error resending verification:', error);
      setError(error.response?.data?.message || 'Failed to resend verification');
      setApiError({
        message: error.response?.data?.message || 'Failed to resend verification',
        status: error.response?.status
      });
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      setError('');
      setApiError(null);
      
      console.log('Logging in:', { email });
      const response = await axios.post('/api/auth/login', { email, password });
      console.log('Login response:', response.data);
      
      setUser(response.data);
      setVerificationStep('login');
      return response.data;
    } catch (error) {
      console.error('Error logging in:', error);
      setError(error.response?.data?.message || 'Invalid credentials');
      setApiError({
        message: error.response?.data?.message || 'Failed to login',
        status: error.response?.status
      });
      throw error;
    }
  };

  const resetVerification = () => {
    setVerificationStep('register');
    setVerificationToken(null);
    setError('');
    setApiError(null);
  };

  const logout = async () => {
    try {
      await axios.get('/api/auth/logout');
      setUser(null);
      setApiError(null);
    } catch (error) {
      console.error('Error logging out:', error);
      setApiError({
        message: error.response?.data?.message || 'Failed to logout',
        status: error.response?.status
      });
    }
  };

  const updateProfile = async (profileData) => {
    try {
      setApiError(null);
      const response = await axios.put('/api/auth/profile', profileData);
      setUser(response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      setApiError({
        message: error.response?.data?.message || 'Failed to update profile',
        status: error.response?.status
      });
      throw error;
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        loading, 
        register,
        verifyEmail,
        resendVerification,
        login,
        verificationStep,
        verificationToken,
        resetVerification,
        error,
        apiError,
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