import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Check if token is for admin
      try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        if (decoded.userId) {
          setUser({
            id: decoded.userId,
            phone: decoded.phone,
            role: decoded.role || 'student'
          });
        }
      } catch (error) {
        console.error('Error decoding token:', error);
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const sendOTP = async (phone, name) => {
    try {
      const response = await axios.post('/api/auth/send-otp', { phone, name });
      setOtpSent(true);
      return response.data;
    } catch (error) {
      console.error('Error sending OTP:', error);
      throw error;
    }
  };

  const verifyOTP = async (phone, otp) => {
    try {
      const response = await axios.post('/api/auth/verify-otp', { phone, otp });
      const { token, ...userData } = response.data;
      localStorage.setItem('token', token);
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      console.log('Registering user:', userData);
      const response = await axios.post('/api/auth/register', {
        name: userData.name,
        phone: userData.phone,
        password: userData.password
      });
      
      console.log('Registration response:', response.data);
      
      if (response.data.success) {
        const { token, user: userData } = response.data;
        localStorage.setItem('token', token);
        setUser(userData);
        return { success: true, user: userData };
      } else {
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      console.error('Error registering:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const login = async (phone, password) => {
    try {
      const response = await axios.post('/api/auth/login', { phone, password });
      
      if (response.data.success) {
        const { token, user: userData } = response.data;
        localStorage.setItem('token', token);
        setUser(userData);
        return { success: true, user: userData };
      } else {
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      console.error('Error logging in:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setOtpSent(false);
  };

  const value = {
    user,
    loading,
    otpSent,
    sendOTP,
    verifyOTP,
    register,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 