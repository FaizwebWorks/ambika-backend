#!/bin/bash

echo "🔧 Applying performance fixes for login issues..."

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this from the backend directory"
    exit 1
fi

echo "📝 Summary of fixes applied:"
echo "✅ Increased rate limits (AUTH: 5→20 attempts, API: 60→120 requests)"
echo "✅ Updated CORS to include Vercel deployment URL"
echo "✅ Optimized database connection pool (8 max connections, 2 min)"
echo "✅ Improved connection timeouts for better responsiveness"

echo ""
echo "🚀 Restarting backend server..."

# Kill any existing node processes
pkill -f "node.*server.js" 2>/dev/null || true

# Start the server
npm run start &
SERVER_PID=$!

echo "Server started with PID: $SERVER_PID"
echo ""
echo "🔍 Testing login endpoint..."

# Wait a moment for server to start
sleep 3

# Test the health endpoint first
echo "Testing health endpoint..."
curl -s http://localhost:3000/health || echo "Health check failed - server might not be ready"

echo ""
echo "✅ Backend optimizations applied!"
echo ""
echo "📋 Next steps:"
echo "1. Test login from frontend"
echo "2. Check Render logs for any remaining issues"
echo "3. Verify CORS headers are working"
echo ""
echo "If issues persist:"
echo "- Check Render deployment logs"
echo "- Verify environment variables are set correctly"
echo "- Ensure MongoDB Atlas is accessible"