// Test script to verify the complete application flow
const fetch = require('node-fetch');

async function testApplicationFlow() {
    console.log('🧪 Testing Complete Application Flow\n');
    
    // 1. Test Dynamic Positions Generation
    console.log('1️⃣ Testing Dynamic Positions...');
    const positionsResponse = await fetch('https://instantllychannelpatner.onrender.com/api/dynamic-positions?country=India');
    const positions = await positionsResponse.json();
    
    console.log(`   ✅ Generated ${positions.length} positions`);
    console.log(`   📋 President Position ID: ${positions[0]._id}`);
    console.log(`   📋 Zone Position ID: ${positions[1]._id}`);
    
    // 2. Test Position ID Format
    console.log('\n2️⃣ Testing Position ID Format...');
    const presidentId = positions[0]._id;
    const zoneId = positions[1]._id;
    
    if (presidentId.startsWith('pos_president_')) {
        console.log('   ✅ President ID format correct:', presidentId);
    } else {
        console.log('   ❌ President ID format incorrect:', presidentId);
    }
    
    if (zoneId.startsWith('pos_zone-head_')) {
        console.log('   ✅ Zone ID format correct:', zoneId);
    } else {
        console.log('   ❌ Zone ID format incorrect:', zoneId);
    }
    
    // 3. Test Position Status Check
    console.log('\n3️⃣ Testing Position Status Check...');
    const statusResponse = await fetch(`https://instantllychannelpatner.onrender.com/api/dynamic-positions/status/${presidentId}`);
    const status = await statusResponse.json();
    
    console.log('   📊 Position Status:', status);
    
    // 4. Test Applications Collection
    console.log('\n4️⃣ Testing Applications by Position...');
    const appsByPositionResponse = await fetch('https://instantllychannelpatner.onrender.com/api/dynamic-positions/applications-by-position');
    const appsByPosition = await appsByPositionResponse.json();
    
    console.log('   📋 Total Applications:', appsByPosition.totalApplications);
    console.log('   📋 Positions with Applications:', appsByPosition.positionsWithApplications);
    
    // 5. Test Location Filtering
    console.log('\n5️⃣ Testing Location Filtering...');
    const goaResponse = await fetch('https://instantllychannelpatner.onrender.com/api/dynamic-positions?country=India&zone=South%20India&state=Goa');
    const goaPositions = await goaResponse.json();
    
    console.log(`   🏖️ Goa positions: ${goaPositions.length}`);
    if (goaPositions.length > 0) {
        console.log(`   📍 Head of Goa ID: ${goaPositions[0]._id}`);
    }
    
    console.log('\n✅ Application Flow Test Complete!');
}

// Run the test
testApplicationFlow().catch(console.error);
