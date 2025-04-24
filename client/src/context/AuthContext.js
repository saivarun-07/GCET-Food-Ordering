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
      
      // Make sure we have all required fields
      if (!userData.name || !userData.phone || !userData.password) {
        console.error('Missing required fields for registration');
        return { 
          success: false, 
          message: 'Name, phone number, and password are all required'
        };
      }
      
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
      console.error('Error registering:', error.message);
      
      // Better error handling
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Registration server error:', error.response.status, error.response.data);
        return { 
          success: false, 
          message: error.response.data.message || `Server error (${error.response.status})`
        };
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response from server:', error.request);
        return { 
          success: false, 
          message: 'Could not connect to the server. Please try again later.'
        };
      } else {
        // Something happened in setting up the request that triggered an Error
        return { 
          success: false, 
          message: 'Registration failed: ' + error.message
        };
      }
    }
  };

  const login = async (phone, password) => {
    try {
      console.log('Login attempt with phone:', phone);
      
      // Make sure we have all required fields
      if (!phone || !password) {
        console.error('Missing required fields for login');
        return { 
          success: false, 
          message: 'Phone number and password are required'
        };
      }
      
      const response = await axios.post('/api/auth/login', { phone, password });
      
      console.log('Login response:', response.data);
      
      if (response.data.success) {
        const { token, user: userData } = response.data;
        localStorage.setItem('token', token);
        setUser(userData);
        return { success: true, user: userData };
      } else {
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      console.error('Error logging in:', error.message);
      
      // Better error handling
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Login server error:', error.response.status, error.response.data);
        return { 
          success: false, 
          message: error.response.data.message || `Server error (${error.response.status})`
        };
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response from server:', error.request);
        return { 
          success: false, 
          message: 'Could not connect to the server. Please try again later.'
        };
      } else {
        // Something happened in setting up the request that triggered an Error
        return { 
          success: false, 
          message: 'Login failed: ' + error.message
        };
      }
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