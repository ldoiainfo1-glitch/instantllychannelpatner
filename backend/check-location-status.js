/**
 * Check Location Standardization Status
 * Shows which zones have been standardized and which still need work
 */

const mongoose = require('mongoose');

// MongoDB URI
const MONGODB_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner.oe0ixs2.mongodb.net/channelpartner';

// Import Location model
const Location = require('./api/models/Location');

async function checkStatus() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected!\n');

    // Get all unique zones
    const zones = await Location.distinct('zone');
    console.log(`📊 Total Zones Found: ${zones.length}`);
    console.log('Zones:', zones.join(', '), '\n');

    // Check each zone
    for (const zone of zones.sort()) {
      const count = await Location.countDocuments({ zone });
      const states = await Location.distinct('state', { zone });
      
      console.log(`\n📍 ${zone}:`);
      console.log(`   Total Locations: ${count}`);
      console.log(`   States: ${states.length} (${states.slice(0, 5).join(', ')}${states.length > 5 ? '...' : ''})`);
      
      // Sample a few locations to check format
      const samples = await Location.find({ zone }).limit(3).select('zone state district -_id');
      console.log('   Sample formats:');
      samples.forEach(s => {
        console.log(`      Zone: "${s.zone}" | State: "${s.state}" | District: "${s.district || 'N/A'}"`);
      });
    }

    // Check for non-standardized names (still have extra spaces, weird cases, etc)
    console.log('\n\n🔍 Checking for potential issues...');
    
    const withExtraSpaces = await Location.countDocuments({
      $or: [
        { zone: /\s{2,}/ },
        { state: /\s{2,}/ },
        { district: /\s{2,}/ }
      ]
    });
    console.log(`   Locations with extra spaces: ${withExtraSpaces}`);

    const allCaps = await Location.countDocuments({
      state: /^[A-Z\s]+$/
    });
    console.log(`   States in ALL CAPS: ${allCaps}`);

    console.log('\n✅ Status check complete!');
    console.log('\nNext steps:');
    console.log('- If zones look good, the standardization worked!');
    console.log('- If you see issues, run the standardize script again');
    console.log('- The frontend will now show matching hierarchy on both sites\n');

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkStatus();
