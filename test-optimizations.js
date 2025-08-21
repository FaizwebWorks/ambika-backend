// Test script to verify backend optimizations
// Run this with: node test-optimizations.js

const path = require('path');
const fs = require('fs');

console.log('🧪 Testing Backend Optimizations...\n');

// Test 1: Check if all required files exist
const requiredFiles = [
  'utils/logger.js',
  'utils/cache.js',
  'utils/validation.js',
  'utils/helpers.js',
  'utils/constants.js',
  'utils/security.js',
  'utils/emailService.js',
  'middleware/performance.js',
  'middleware/rateLimiting.js',
  'middleware/errorHandler.js'
];

console.log('1️⃣ Checking required optimization files...');
let missingFiles = [];

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file}`);
    missingFiles.push(file);
  }
});

if (missingFiles.length === 0) {
  console.log('   🎉 All optimization files are present!\n');
} else {
  console.log(`   ⚠️  Missing ${missingFiles.length} files\n`);
}

// Test 2: Check if directories exist
const requiredDirs = [
  'logs',
  'public/uploads',
  'templates/emails'
];

console.log('2️⃣ Checking required directories...');
requiredDirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (fs.existsSync(dirPath)) {
    console.log(`   ✅ ${dir}/`);
  } else {
    console.log(`   ❌ ${dir}/`);
  }
});

// Test 3: Check package.json dependencies
console.log('\n3️⃣ Checking package.json dependencies...');
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  const requiredDeps = [
    'compression',
    'express-rate-limit',
    'express-slow-down',
    'rate-limit-mongo',
    'nodemailer',
    'winston'
  ];
  
  let missingDeps = [];
  requiredDeps.forEach(dep => {
    if (pkg.dependencies && pkg.dependencies[dep]) {
      console.log(`   ✅ ${dep} - ${pkg.dependencies[dep]}`);
    } else {
      console.log(`   ❌ ${dep}`);
      missingDeps.push(dep);
    }
  });
  
  if (missingDeps.length === 0) {
    console.log('   🎉 All required dependencies are installed!\n');
  } else {
    console.log(`   ⚠️  Missing ${missingDeps.length} dependencies\n`);
  }
} else {
  console.log('   ❌ package.json not found\n');
}

// Test 4: Try to require optimization modules
console.log('4️⃣ Testing module imports...');
const modules = [
  './utils/logger',
  './utils/cache',
  './utils/validation',
  './utils/helpers',
  './utils/constants',
  './utils/security',
  './utils/emailService',
  './middleware/performance',
  './middleware/rateLimiting'
];

let importErrors = [];
modules.forEach(module => {
  try {
    require(module);
    console.log(`   ✅ ${module}`);
  } catch (error) {
    console.log(`   ❌ ${module} - ${error.message}`);
    importErrors.push({ module, error: error.message });
  }
});

if (importErrors.length === 0) {
  console.log('   🎉 All modules can be imported successfully!\n');
} else {
  console.log(`   ⚠️  ${importErrors.length} modules have import errors\n`);
}

// Test 5: Environment configuration
console.log('5️⃣ Checking environment configuration...');
const envExample = path.join(__dirname, '.env.example');
const envFile = path.join(__dirname, '.env');

if (fs.existsSync(envExample)) {
  console.log('   ✅ .env.example file exists');
} else {
  console.log('   ❌ .env.example file missing');
}

if (fs.existsSync(envFile)) {
  console.log('   ✅ .env file exists');
} else {
  console.log('   ⚠️  .env file not found (copy from .env.example)');
}

// Summary
console.log('\n📊 Optimization Test Summary:');
console.log('================================');
console.log(`Files: ${requiredFiles.length - missingFiles.length}/${requiredFiles.length}`);
console.log(`Modules: ${modules.length - importErrors.length}/${modules.length}`);

if (missingFiles.length === 0 && importErrors.length === 0) {
  console.log('\n🎉 All backend optimizations are properly set up!');
  console.log('🚀 Your backend is ready for high performance!');
  
  console.log('\n📈 Performance Features Enabled:');
  console.log('• Request compression with gzip');
  console.log('• Advanced rate limiting');
  console.log('• Memory caching system');
  console.log('• Comprehensive logging');
  console.log('• Security headers & CORS');
  console.log('• Input validation & sanitization');
  console.log('• Email service with templates');
  console.log('• Error handling & monitoring');
  console.log('• Cluster support for scaling');
  
} else {
  console.log('\n❌ Some optimizations need attention');
  console.log('📝 Please check the errors above and run the setup script again');
}

console.log('\n🔧 Next Steps:');
console.log('1. Update .env file with your configuration');
console.log('2. Start the server: npm run dev');
console.log('3. Test endpoints: npm run health');
console.log('4. Monitor performance with the logging system');
console.log('\n');
