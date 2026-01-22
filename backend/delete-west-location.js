/**
 * Delete "West" zone location (India > West > Maharashtra > Pune)
 */

const mongoose = require('mongoose');

// MongoDB URI
const MONGODB_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner';

// Import models
const Location = require('./api/models/Location');

async function deleteWestLocation() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find the "West" location
    console.log('📋 Finding locations with zone="West"...');
    const westLocations = await Location.find({ zone: 'West' });
    
    console.log(`Found ${westLocations.length} location(s) with zone="West"`);
    
    if (westLocations.length === 0) {
      console.log('✅ No "West" locations found. Already deleted!');
      process.exit(0);
    }
    
    console.log('\nLocations to delete:');
    westLocations.forEach((loc, index) => {
      console.log(`\n${index + 1}. ID: ${loc._id}`);
      console.log(`   Country: ${loc.country || 'N/A'}`);
      console.log(`   Zone: ${loc.zone || 'N/A'}`);
      console.log(`   State: ${loc.state || 'N/A'}`);
      console.log(`   Division: ${loc.division || 'N/A'}`);
      console.log(`   District: ${loc.district || 'N/A'}`);
      console.log(`   Created: ${loc.createdAt || 'N/A'}`);
    });
    
    console.log('\n⚠️  DELETING...');
    
    // Delete all "West" locations
    const result = await Location.deleteMany({ zone: 'West' });
    
    console.log(`\n✅ Successfully deleted ${result.deletedCount} location(s) with zone="West"`);
    console.log('\n📊 Impact:');
    console.log('   - "West" will no longer appear in location dropdowns');
    console.log('   - "West" zone-head position will disappear from available positions');
    console.log('   - Autocomplete will not suggest "West" anymore');
    
    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteWestLocation();
