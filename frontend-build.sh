#!/bin/bash

echo "Starting frontend build process..."

# Navigate to client directory
cd client

# Install dependencies
echo "Installing frontend dependencies..."
npm install

# Build the application
echo "Building frontend application..."
npm run build

# Check if build directory exists
if [ -d "build" ]; then
  echo "Build directory exists. Contents:"
  ls -la build/
else
  echo "Error: Build directory not found"
  exit 1
fi

echo "Frontend build process completed successfully!" 