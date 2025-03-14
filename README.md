# GCET Food Ordering System

A full-stack web application for ordering food within GCET college campus. Students can order food by selecting their block and class number, and track their orders in real-time.

## Features

- Google Authentication (restricted to @gcet.edu.in domain)
- User Profile Management (Block and Class selection)
- Menu browsing and ordering
- Real-time order tracking
- Admin dashboard for managing orders and menu items
- Responsive design for mobile and desktop

## Tech Stack

- Frontend: React, Tailwind CSS
- Backend: Node.js, Express
- Database: MongoDB
- Authentication: Google OAuth 2.0

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Google OAuth 2.0 credentials

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd gcet-food-ordering
   ```

2. Install dependencies:
   ```bash
   # Install backend dependencies
   npm install

   # Install frontend dependencies
   cd client
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/gcet-food-ordering
   SESSION_SECRET=your_session_secret
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   CLIENT_URL=http://localhost:3000
   NODE_ENV=development
   ```

4. Set up Google OAuth 2.0:
   - Go to the Google Cloud Console
   - Create a new project
   - Enable the Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs:
     - http://localhost:5000/api/auth/google/callback (development)
     - https://your-domain.com/api/auth/google/callback (production)

5. Start the development servers:
   ```bash
   # Start backend server (from root directory)
   npm run server

   # Start frontend server (from client directory)
   cd client
   npm start
   ```

6. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Deployment

1. Build the frontend:
   ```bash
   cd client
   npm run build
   ```

2. Set up environment variables on your hosting platform

3. Deploy the application to your preferred hosting service

## Contributing

1. Fork the repository
2. Create a new branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License. 