const mongoose = require('mongoose');
const Location = require('./api/models/Location');
require('dotenv').config();

async function addZoneSuffix() {
  try {
    // Connect to MongoDB
    const mongoUri = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner.oe0ixs2.mongodb.net/channelpartner';
    
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get current zones
    const currentZones = await Location.distinct('zone');
    console.log('📋 Current zones:', currentZones);

    // Update each zone to add " Zone" suffix
    const zoneMapping = {
      'Central': 'Central Zone',
      'East': 'East Zone',
      'North': 'North Zone',
      'North East': 'North East Zone',
      'South': 'South Zone',
      'West': 'West Zone'
    };

    console.log('\n🔧 Updating zones to add "Zone" suffix...\n');

    for (const [oldZone, newZone] of Object.entries(zoneMapping)) {
      const result = await Location.updateMany(
        { zone: oldZone },
        { $set: { zone: newZone } }
      );
      console.log(`✅ ${oldZone} → ${newZone}: Updated ${result.modifiedCount} entries`);
    }

    // Verify the update
    const updatedZones = await Location.distinct('zone');
    console.log('\n✅ Final zones in database:', updatedZones);

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
addZoneSuffix();
