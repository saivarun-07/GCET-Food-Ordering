#!/bin/bash

# Install backend dependencies
npm install

# Create client/build directory if it doesn't exist
mkdir -p client/build

# Install frontend dependencies and build
cd client
npm install
npm run build

# Back to root
cd ..

echo "Build completed successfully!" 