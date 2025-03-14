import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phoneVerificationStep, setPhoneVerificationStep] = useState('phone'); // 'phone', 'otp'
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [apiError, setApiError] = useState(null);

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

  const sendOTP = async (phoneNumber, name) => {
    try {
      setError('');
      setApiError(null);
      
      console.log('Sending OTP request with:', { phone: phoneNumber, name });
      const response = await axios.post('/api/auth/send-otp', { phone: phoneNumber, name });
      console.log('OTP response:', response.data);
      
      setPhone(phoneNumber);
      setPhoneVerificationStep('otp');
      return response.data;
    } catch (error) {
      console.error('Error sending OTP:', error);
      setError(error.response?.data?.message || 'Failed to send OTP');
      setApiError({
        message: error.response?.data?.message || 'Failed to send OTP',
        status: error.response?.status
      });
      throw error;
    }
  };

  const verifyOTP = async (otp) => {
    try {
      setError('');
      setApiError(null);
      
      console.log('Verifying OTP with:', { phone, otp });
      const response = await axios.post('/api/auth/verify-otp', { phone, otp });
      console.log('Verify OTP response:', response.data);
      
      setUser(response.data);
      setPhoneVerificationStep('phone');
      return response.data;
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setError(error.response?.data?.message || 'Invalid OTP');
      setApiError({
        message: error.response?.data?.message || 'Failed to verify OTP',
        status: error.response?.status
      });
      throw error;
    }
  };

  const resetVerification = () => {
    setPhoneVerificationStep('phone');
    setPhone('');
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
        sendOTP, 
        verifyOTP, 
        phoneVerificationStep,
        resetVerification,
        phone,
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