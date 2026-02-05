const axios = require('axios');

// Test retroactive commission distribution for Urmila's 2400 credits
async function testRetroactiveDistribution() {
  try {
    const API_URL = 'http://localhost:5000';  // Change if your server runs on different port
    
    // Urmila's user ID - you'll need to get this from database
    const userId = '67a8c91491c2ff69c54ffdb6';  // Replace with actual userId
    
    console.log('🔄 Testing retroactive commission distribution...\n');
    console.log(`User ID: ${userId}`);
    console.log(`Cash Amount: ₹2400 (1200 + 1200)\n`);
    
    const response = await axios.post(
      `${API_URL}/admin/users/${userId}/distribute-commission-retroactive`,
      {
        cashAmount: 2400
      }
    );
    
    console.log('✅ SUCCESS!\n');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ ERROR:', error.response?.data || error.message);
  }
}

testRetroactiveDistribution();
