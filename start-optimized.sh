#!/bin/bash

# Optimized Production Server Startup Script
# This script starts the server with optimal settings for performance

echo "🚀 Starting Ambika Backend in Optimized Production Mode..."

# Set NODE_ENV to production
export NODE_ENV=production

# Set optimal Node.js flags for performance
export NODE_OPTIONS="--max-old-space-size=1024 --gc-interval=1000"

# Enable keep-alive for better connection handling
export UV_THREADPOOL_SIZE=16

# Log startup information
echo "📊 System Information:"
echo "   - Node.js version: $(node --version)"
echo "   - Memory limit: 1GB"
echo "   - Thread pool size: 16"
echo "   - Environment: $NODE_ENV"

# Check if MongoDB is accessible
echo "🔍 Checking database connectivity..."
if ! mongosh --eval "db.runCommand('ping')" --quiet > /dev/null 2>&1; then
    echo "⚠️  Warning: MongoDB connection check failed. Server will attempt to connect anyway."
fi

# Start the server
echo "🎯 Starting optimized server..."
exec node server.js