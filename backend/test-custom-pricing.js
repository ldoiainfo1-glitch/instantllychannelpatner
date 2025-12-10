/**
 * Test Script for Custom Position Pricing API
 * 
 * This script tests the custom pricing endpoints to ensure they work correctly
 */

const API_BASE_URL = 'http://localhost:5000/api';  // Change to your backend URL

// Test 1: Get custom pricing for a position
async function testGetCustomPricing(positionId) {
    console.log('\n=== TEST 1: Get Custom Pricing ===');
    console.log(`Position ID: ${positionId}`);
    
    try {
        const response = await fetch(`${API_BASE_URL}/positions/${positionId}/custom-pricing`);
        const data = await response.json();
        
        console.log('✅ Response:', JSON.stringify(data, null, 2));
        return data;
    } catch (error) {
        console.error('❌ Error:', error.message);
        return null;
    }
}

// Test 2: Set custom pricing for a position
async function testSetCustomPricing(positionId) {
    console.log('\n=== TEST 2: Set Custom Pricing ===');
    console.log(`Position ID: ${positionId}`);
    
    const customPricing = {
        enabled: true,
        tiers: [
            { pay: 75000, profit: 63750, credit: 75000 },  // Custom: ₹75K instead of ₹90K
            { pay: 60000, profit: 51000, credit: 60000 },  // Custom: ₹60K instead of ₹75K
            { pay: 45000, profit: 38250, credit: 45000 }   // Custom: ₹45K instead of ₹60K
        ]
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/positions/${positionId}/custom-pricing`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(customPricing)
        });
        
        const data = await response.json();
        console.log('✅ Response:', JSON.stringify(data, null, 2));
        return data;
    } catch (error) {
        console.error('❌ Error:', error.message);
        return null;
    }
}

// Test 3: Disable custom pricing
async function testDisableCustomPricing(positionId) {
    console.log('\n=== TEST 3: Disable Custom Pricing ===');
    console.log(`Position ID: ${positionId}`);
    
    try {
        const response = await fetch(`${API_BASE_URL}/positions/${positionId}/custom-pricing`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: false, tiers: [] })
        });
        
        const data = await response.json();
        console.log('✅ Response:', JSON.stringify(data, null, 2));
        return data;
    } catch (error) {
        console.error('❌ Error:', error.message);
        return null;
    }
}

// Test 4: Delete custom pricing
async function testDeleteCustomPricing(positionId) {
    console.log('\n=== TEST 4: Delete Custom Pricing ===');
    console.log(`Position ID: ${positionId}`);
    
    try {
        const response = await fetch(`${API_BASE_URL}/positions/${positionId}/custom-pricing`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        console.log('✅ Response:', JSON.stringify(data, null, 2));
        return data;
    } catch (error) {
        console.error('❌ Error:', error.message);
        return null;
    }
}

// Test 5: Get all positions with custom pricing
async function testGetAllCustomPricing() {
    console.log('\n=== TEST 5: Get All Positions with Custom Pricing ===');
    
    try {
        const response = await fetch(`${API_BASE_URL}/positions/custom-pricing/all`);
        const data = await response.json();
        
        console.log('✅ Response:', JSON.stringify(data, null, 2));
        return data;
    } catch (error) {
        console.error('❌ Error:', error.message);
        return null;
    }
}

// Run all tests
async function runAllTests() {
    console.log('🧪 Starting Custom Pricing API Tests...\n');
    
    // First, get a position to test with
    console.log('Fetching a position to test with...');
    const positionsResponse = await fetch(`${API_BASE_URL}/positions?country=India&limit=1`);
    const positions = await positionsResponse.json();
    
    if (positions.length === 0) {
        console.error('❌ No positions found to test with');
        return;
    }
    
    const testPositionId = positions[0]._id;
    console.log(`\n✅ Using position: ${positions[0].designation} (ID: ${testPositionId})\n`);
    
    // Test sequence
    await testGetCustomPricing(testPositionId);           // Get initial state
    await testSetCustomPricing(testPositionId);           // Enable custom pricing
    await testGetCustomPricing(testPositionId);           // Verify it was set
    await testGetAllCustomPricing();                      // List all with custom pricing
    await testDisableCustomPricing(testPositionId);       // Disable it
    await testGetCustomPricing(testPositionId);           // Verify it was disabled
    await testSetCustomPricing(testPositionId);           // Enable again
    await testDeleteCustomPricing(testPositionId);        // Delete it
    await testGetCustomPricing(testPositionId);           // Verify it was deleted
    
    console.log('\n✅ All tests completed!');
}

// For Node.js
if (typeof window === 'undefined') {
    // Running in Node.js
    const fetch = require('node-fetch');
    runAllTests();
}

// Export for browser
if (typeof window !== 'undefined') {
    window.customPricingTests = {
        testGetCustomPricing,
        testSetCustomPricing,
        testDisableCustomPricing,
        testDeleteCustomPricing,
        testGetAllCustomPricing,
        runAllTests
    };
}
