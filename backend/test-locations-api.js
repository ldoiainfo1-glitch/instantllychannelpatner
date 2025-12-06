const fetch = require('node-fetch');

async function testAPI() {
  const baseURL = 'http://localhost:5000/api';
  
  console.log('Testing Location Management API...\n');
  
  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthRes = await fetch('http://localhost:5000/health');
    const health = await healthRes.json();
    console.log('✅ Health:', health);
    
    // Test 2: Get zones
    console.log('\n2. Testing /api/locations/zones...');
    const zonesRes = await fetch(`${baseURL}/locations/zones`);
    const zones = await zonesRes.json();
    console.log('✅ Zones:', zones.slice(0, 5));
    
    // Test 3: Get locations with pagination
    console.log('\n3. Testing /api/locations/manage...');
    const manageRes = await fetch(`${baseURL}/locations/manage?page=1&limit=5`);
    const manageData = await manageRes.json();
    console.log('✅ Manage endpoint:', {
      success: manageData.success,
      total: manageData.pagination?.total,
      locations: manageData.locations?.length
    });
    
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testAPI();
