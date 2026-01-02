/**
 * Quick fix for specific Nagpur positions
 */

const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner';

const Position = require('./api/models/Position');
const Application = require('./api/models/Application');

async function quickFix() {
  try {
    console.log('🔌 Connecting...');
    await mongoose.connect(MONGODB_URI, { 
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected\n');

    // Get Nagpur application
    const nagpurApp = await Application.findOne({ 
      positionId: /nagpur/i,
      status: 'Approved'
    }).limit(1);
    
    if (nagpurApp) {
      console.log('📍 Found Nagpur application:');
      console.log('   Position ID:', nagpurApp.positionId);
      console.log('   Location:', JSON.stringify(nagpurApp.location, null, 2));
      
      // Find position at this location
      const position = await Position.findOne({
        'location.district': nagpurApp.location.district
      });
      
      if (position) {
        console.log('\n🔍 Found position:');
        console.log('   Current ID:', position.positionId);
        console.log('   Should be:', nagpurApp.positionId);
        
        // Update it
        await Position.updateOne(
          { _id: position._id },
          { $set: { positionId: nagpurApp.positionId } }
        );
        console.log('   ✅ UPDATED!\n');
      }
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

quickFix();
