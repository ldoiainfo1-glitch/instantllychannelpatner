const mongoose = require('mongoose');
const Position = require('./api/models/Position');
require('dotenv').config();

async function removeUnwantedZones() {
  try {
    // Connect to MongoDB
    const mongoUri = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner.oe0ixs2.mongodb.net/channelpartner';
    
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check what zones exist in Location collection
    const Location = require('./api/models/Location');
    console.log('\n🔍 Checking zones in Location collection:');
    const allZones = await Location.distinct('zone');
    console.log(`Found ${allZones.length} unique zones:`, allZones);
    
    // Find ALL zone positions first to see what we have
    console.log('\n🔍 Now checking Zone Head positions:');
    const allZoneHeads = await Position.find({
      post: 'Zone Head'
    }).sort({ sNo: 1 });
    
    console.log(`\nFound ${allZoneHeads.length} Zone Head positions:`);
    allZoneHeads.forEach(pos => {
      console.log(`   - ${pos.post} | Zone: "${pos.location.zone}" | Area: ${pos.designation} | ID: ${pos.positionId || pos._id}`);
    });

    // Now find positions with UNKNOWN or WESTERN zones (case-insensitive)
    const unwantedZones = ['UNKNOWN', 'WESTERN', 'unknown', 'western'];
    
    console.log('\n🔍 Searching for positions with unwanted zones:', unwantedZones);
    
    const positionsToDelete = await Position.find({
      post: 'Zone Head',
      $or: [
        { 'location.zone': { $in: unwantedZones } },
        { 'designation': { $regex: /unknown|western/i } }
      ]
    });

    console.log(`\n📋 Found ${positionsToDelete.length} positions to delete:`);
    positionsToDelete.forEach(pos => {
      console.log(`   - ${pos.post} (Zone: ${pos.location.zone}, Designation: ${pos.designation}, ID: ${pos.positionId || pos._id})`);
    });

    if (positionsToDelete.length > 0) {
      // Delete the positions
      const result = await Position.deleteMany({
        'location.zone': { $in: unwantedZones }
      });

      console.log(`\n✅ Successfully deleted ${result.deletedCount} positions`);
      console.log('   - UNKNOWN zone positions removed');
      console.log('   - WESTERN zone positions removed');
    } else {
      console.log('\n✅ No positions found with UNKNOWN or WESTERN zones');
    }

    // Now fix the Location collection - Remove Unknown and Western zones
    console.log('\n🔧 Fixing Location collection...');
    
    // Delete entries with Unknown or Western zones
    const deleteResult = await Location.deleteMany({
      zone: { $in: ['Unknown', 'Western', 'unknown', 'western'] }
    });
    console.log(`✅ Deleted ${deleteResult.deletedCount} location entries with Unknown/Western zones`);
    
    // Update any entries that have "Western" to "West"
    const updateResult = await Location.updateMany(
      { zone: { $in: ['Western', 'western'] } },
      { $set: { zone: 'West' } }
    );
    console.log(`✅ Updated ${updateResult.modifiedCount} location entries from Western to West`);

    // Verify the fix
    const remainingZones = await Location.distinct('zone');
    console.log(`\n✅ Final zones in database:`, remainingZones);

    // Close connection
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
removeUnwantedZones();
