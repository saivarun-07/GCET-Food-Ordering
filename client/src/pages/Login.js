import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { 
    sendOTP, 
    verifyOTP, 
    phoneVerificationStep, 
    resetVerification, 
    phone,
    error,
    apiError
  } = useAuth();
  
  const [phoneInput, setPhoneInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  
  // If in development mode, prefill phone for testing
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setPhoneInput('1234567890'); // Example testing number
      setNameInput('Test User');
    }
  }, []);
  
  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    
    // Validate phone
    if (!phoneInput || phoneInput.length < 10) {
      setLocalError('Please enter a valid phone number');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log('Submitting phone:', phoneInput, 'name:', nameInput);
      const result = await sendOTP(phoneInput, nameInput);
      console.log('OTP sent successfully:', result);
    } catch (error) {
      console.error('Error sending OTP:', error);
      // Error will be displayed from context
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    
    // Validate OTP
    if (!otpInput || otpInput.length !== 6 || !/^\d+$/.test(otpInput)) {
      setLocalError('Please enter a valid 6-digit OTP');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log('Submitting OTP:', otpInput);
      const result = await verifyOTP(otpInput);
      console.log('OTP verified successfully:', result);
    } catch (error) {
      console.error('Error verifying OTP:', error);
      // Error will be displayed from context
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleBackToPhone = () => {
    resetVerification();
    setOtpInput('');
    setLocalError('');
  };

  const displayError = localError || error || (apiError && apiError.message);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome to GCET Food Ordering
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {phoneVerificationStep === 'phone' ? 
              'Enter your phone number to login or register' : 
              `Enter the verification code sent to ${phone}`
            }
          </p>
        </div>
        
        {displayError && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <p className="text-red-700">{displayError}</p>
            {apiError && apiError.status && (
              <p className="text-red-500 text-xs mt-1">Error code: {apiError.status}</p>
            )}
          </div>
        )}
        
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
            <p className="text-blue-700">Development Mode</p>
            <p className="text-xs text-blue-600">
              Using testing values: Phone: {phoneInput}, Name: {nameInput}
            </p>
          </div>
        )}
        
        {phoneVerificationStep === 'phone' ? (
          <form className="mt-8 space-y-6" onSubmit={handlePhoneSubmit}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div className="mb-4">
                <label htmlFor="phone" className="sr-only">Phone Number</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Phone Number"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="name" className="sr-only">Full Name (for new users)</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Full Name (required for new users)"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? 'Sending...' : 'Send Verification Code'}
              </button>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleOtpSubmit}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="otp" className="sr-only">Verification Code</label>
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="6-digit verification code"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  maxLength={6}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleBackToPhone}
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                Use a different phone number
              </button>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? 'Verifying...' : 'Verify and Login'}
              </button>
            </div>
          </form>
        )}
        
        <div className="mt-6">
          <p className="text-center text-sm text-gray-500">
            We'll send a verification code to verify your phone number
          </p>
          {process.env.NODE_ENV === 'development' && (
            <p className="text-center text-xs text-blue-500 mt-2">
              In development mode, the OTP will be shown in the API response for testing
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login; 