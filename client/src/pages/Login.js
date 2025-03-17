import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const Login = () => {
  const navigate = useNavigate();
  const { register, verifyEmail, resendVerification, login, verificationStep, verificationToken, error, apiError } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    verificationCode: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (verificationStep === 'register') {
        await register(formData);
        toast.success('Registration successful! Please check your email for verification code.');
      } else if (verificationStep === 'verify') {
        await verifyEmail(formData.email, formData.verificationCode);
        toast.success('Email verified successfully! Please login.');
      } else if (verificationStep === 'login') {
        await login(formData.email, formData.password);
        toast.success('Login successful!');
        navigate('/');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'An error occurred');
    }
  };

  const handleResendVerification = async () => {
    try {
      await resendVerification(formData.email);
      toast.success('Verification code resent! Please check your email.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend verification code');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {verificationStep === 'register' ? 'Create your account' :
             verificationStep === 'verify' ? 'Verify your email' :
             'Sign in to your account'}
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            {verificationStep === 'register' && (
              <>
                <div>
                  <label htmlFor="name" className="sr-only">Name</label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="sr-only">Phone Number</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Phone Number"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
              </>
            )}
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            {verificationStep === 'register' && (
              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            )}
            {verificationStep === 'verify' && (
              <div>
                <label htmlFor="verificationCode" className="sr-only">Verification Code</label>
                <input
                  id="verificationCode"
                  name="verificationCode"
                  type="text"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Enter verification code"
                  value={formData.verificationCode}
                  onChange={handleChange}
                />
              </div>
            )}
            {verificationStep === 'login' && (
              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            )}
          </div>

          {verificationStep === 'verify' && (
            <div className="text-sm text-center">
              <button
                type="button"
                onClick={handleResendVerification}
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Resend verification code
              </button>
            </div>
          )}

          {verificationToken && (
            <div className="text-sm text-center text-gray-600">
              Verification code: {verificationToken}
            </div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {verificationStep === 'register' ? 'Register' :
               verificationStep === 'verify' ? 'Verify Email' :
               'Sign in'}
            </button>
          </div>
        </form>

        {error && (
          <div className="text-red-500 text-sm text-center">
            {error}
          </div>
        )}

        {apiError && (
          <div className="text-red-500 text-sm text-center">
            {apiError.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default Login; 