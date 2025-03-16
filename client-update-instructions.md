# Client-Side Updates for JWT Authentication

To make your authentication work properly, please update your client-side code to use the JWT token-based authentication we've implemented on the server.

## Update your AuthContext.js

Open your `client/src/context/AuthContext.js` file and make the following changes:

1. Add a token state:
```javascript
const [token, setToken] = useState(localStorage.getItem('authToken') || null);
```

2. Update your login/verification function to store the token:
```javascript
const verifyOtp = async (phone, otp) => {
  setError('');
  try {
    const response = await axios.post('/api/auth/verify-otp', { phone, otp });
    const userData = response.data;
    
    // Store token in localStorage and state
    if (userData.token) {
      localStorage.setItem('authToken', userData.token);
      setToken(userData.token);
      
      // Add token to axios defaults for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
    }
    
    setUser(userData);
    setPhoneVerificationStep('phone');
    return userData;
  } catch (error) {
    setError(error.response?.data?.message || 'Failed to verify OTP');
    throw error;
  }
};
```

3. Update your logout function to remove the token:
```javascript
const logout = async () => {
  try {
    await axios.get('/api/auth/logout');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    setUser(null);
    localStorage.removeItem('authToken');
    setToken(null);
    delete axios.defaults.headers.common['Authorization'];
  }
};
```

4. Update your checkAuth function to use the token:
```javascript
const checkAuth = async () => {
  try {
    // Set the token in axios headers if it exists
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await axios.get('/api/auth/current-user');
    setUser(response.data);
    setApiError(null);
  } catch (error) {
    console.error('Authentication check failed:', error.response?.data?.message || error.message);
    setUser(null);
    
    // If the token is invalid, clear it
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      setToken(null);
      delete axios.defaults.headers.common['Authorization'];
    }
    
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
```

5. Update your updateProfile function to handle the token:
```javascript
const updateProfile = async (profileData) => {
  try {
    const response = await axios.put('/api/auth/profile', profileData);
    const updatedUser = response.data;
    
    // Update token if a new one is provided
    if (updatedUser.token) {
      localStorage.setItem('authToken', updatedUser.token);
      setToken(updatedUser.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${updatedUser.token}`;
    }
    
    setUser(updatedUser);
    return updatedUser;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};
```

6. Set up token on initial load:
```javascript
// In your useEffect or component initialization
useEffect(() => {
  // Initialize axios with the token if it exists
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
  
  checkAuth();
}, []);
```

7. Update your context value to include token-related functions:
```javascript
return (
  <AuthContext.Provider value={{
    user,
    loading,
    error,
    setError,
    sendOtp,
    verifyOtp,
    logout,
    updateProfile,
    phoneVerificationStep,
    setPhoneVerificationStep,
    phone,
    setPhone,
    apiError,
    token,
    isAuthenticated: !!user
  }}>
    {children}
  </AuthContext.Provider>
);
```

## Deploy the Client Changes

After making these changes:
1. Commit them to your repository
2. Push the changes
3. Redeploy your client application on Render

These changes will ensure your application can authenticate using both session cookies AND JWT tokens, providing a more robust authentication system that works across different environments. 