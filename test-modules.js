// Quick test to check middleware exports
console.log('Testing middleware exports...\n');

try {
  console.log('1. Testing performance middleware...');
  const performance = require('./middleware/performance');
  console.log('✅ Performance middleware functions:', Object.keys(performance));
  
  console.log('\n2. Testing rate limiting middleware...');
  const rateLimiting = require('./middleware/rateLimiting');
  console.log('✅ Rate limiting middleware functions:', Object.keys(rateLimiting));
  
  console.log('\n3. Testing error handler middleware...');
  const errorHandler = require('./middleware/errorHandler');
  console.log('✅ Error handler exports:', Object.keys(errorHandler));
  
  console.log('\n4. Testing routes...');
  const userRoutes = require('./routes/userRoutes');
  console.log('✅ User routes loaded successfully');
  
  console.log('\n🎉 All middleware and routes loaded successfully!');
  console.log('✅ Server should start without errors now.');
  
} catch (error) {
  console.error('❌ Error loading modules:', error.message);
  console.error('Stack:', error.stack);
}
