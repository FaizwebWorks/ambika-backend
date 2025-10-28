#!/bin/bash

# Production Deployment Script for Backend

echo "🚀 Starting Backend Production Deployment..."

# Exit on any error
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_status "Node.js version: $(node --version)"
print_status "npm version: $(npm --version)"

# Install dependencies
print_status "Installing production dependencies..."
npm ci --only=production

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    print_warning ".env.production file not found. Creating from template..."
    cp .env.example .env.production 2>/dev/null || touch .env.production
    print_warning "Please configure your .env.production file with production values"
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p public/uploads
mkdir -p logs

# Set proper permissions
chmod 755 public/uploads
chmod 755 logs

# Run any database migrations or setup scripts
if [ -f "setup-optimization.sh" ]; then
    print_status "Running optimization setup..."
    chmod +x setup-optimization.sh
    ./setup-optimization.sh
fi

# Test the application
print_status "Testing application..."
NODE_ENV=production npm test --if-present

print_status "Backend deployment completed successfully!"
print_warning "Don't forget to:"
print_warning "1. Configure your .env.production file"
print_warning "2. Set up your process manager (PM2, forever, etc.)"
print_warning "3. Configure your web server (nginx, apache, etc.)"
print_warning "4. Set up SSL certificates"
print_warning "5. Configure monitoring and logging"

echo ""
echo "🎉 Ready to start with: NODE_ENV=production npm start"