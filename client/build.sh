#!/bin/bash

# Install dependencies
npm install

# Create production build
npm run build:prod

# Copy build files to the correct location
cp -r build/* ../public/

echo "Frontend build completed successfully!" 