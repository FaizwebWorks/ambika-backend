#!/bin/bash

echo "🧪 Testing Backend Functionality After Memory Optimization..."
echo ""

# Backend URL
BACKEND_URL="http://localhost:3000"
if [ "$1" = "prod" ]; then
    BACKEND_URL="https://ambika-international.onrender.com"
fi

echo "Testing: $BACKEND_URL"
echo ""

# Test 1: Health Check
echo "1. Testing Health Check..."
response=$(curl -s -w "%{http_code}" -o /dev/null "$BACKEND_URL/health")
if [ "$response" = "200" ]; then
    echo "   ✅ Health check passed"
else
    echo "   ❌ Health check failed (HTTP $response)"
fi

# Test 2: Products API
echo "2. Testing Products API..."
response=$(curl -s -w "%{http_code}" -o /dev/null "$BACKEND_URL/api/products")
if [ "$response" = "200" ]; then
    echo "   ✅ Products API working"
else
    echo "   ❌ Products API failed (HTTP $response)"
fi

# Test 3: Categories API
echo "3. Testing Categories API..."
response=$(curl -s -w "%{http_code}" -o /dev/null "$BACKEND_URL/api/categories")
if [ "$response" = "200" ]; then
    echo "   ✅ Categories API working"
else
    echo "   ❌ Categories API failed (HTTP $response)"
fi

# Test 4: CORS Headers
echo "4. Testing CORS Headers..."
cors_header=$(curl -s -H "Origin: https://ambika-international-ixiy2810o-faizwebworks-projects.vercel.app" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type" \
    -X OPTIONS "$BACKEND_URL/api/users/login" \
    -I | grep -i "access-control-allow-origin")

if [ -n "$cors_header" ]; then
    echo "   ✅ CORS headers present"
else
    echo "   ❌ CORS headers missing"
fi

# Test 5: Memory Usage (if health endpoint provides it)
echo "5. Checking Memory Usage..."
memory_info=$(curl -s "$BACKEND_URL/health" | grep -o '"memory":"[^"]*"' | cut -d'"' -f4)
if [ -n "$memory_info" ]; then
    echo "   ✅ Memory usage: $memory_info"
else
    echo "   ℹ️  Memory info not available from health endpoint"
fi

echo ""
echo "🔍 Test Summary:"
echo "   - All core APIs should return HTTP 200"
echo "   - CORS headers should be present for frontend access"
echo "   - Memory usage should be significantly lower than before"
echo ""

echo "✅ If all tests pass, your optimized backend is ready!"
echo "❌ If any test fails, check the logs and fix the issue before deploying"