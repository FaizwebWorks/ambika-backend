// CORS Test Script - Run this to test CORS configuration

const testCors = async () => {
  const testOrigins = [
    'https://ambika-international-ixiy2810o-faizwebworks-projects.vercel.app',
    'https://ambika-international.vercel.app',
    'http://localhost:5173'
  ];

  const backendUrl = 'https://ambika-international.onrender.com';

  console.log('🧪 Testing CORS configuration...\n');

  for (const origin of testOrigins) {
    try {
      console.log(`Testing origin: ${origin}`);
      
      // Test preflight request (OPTIONS)
      const preflightResponse = await fetch(`${backendUrl}/api/users/register`, {
        method: 'OPTIONS',
        headers: {
          'Origin': origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });

      console.log(`  Preflight Status: ${preflightResponse.status}`);
      console.log(`  CORS Headers:`, {
        'Access-Control-Allow-Origin': preflightResponse.headers.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Methods': preflightResponse.headers.get('Access-Control-Allow-Methods'),
        'Access-Control-Allow-Headers': preflightResponse.headers.get('Access-Control-Allow-Headers')
      });

      if (preflightResponse.status === 200 || preflightResponse.status === 204) {
        console.log(`  ✅ CORS working for ${origin}`);
      } else {
        console.log(`  ❌ CORS failed for ${origin}`);
      }

    } catch (error) {
      console.log(`  ❌ Error testing ${origin}:`, error.message);
    }
    
    console.log(''); // Empty line for readability
  }
};

// Run the test
testCors();