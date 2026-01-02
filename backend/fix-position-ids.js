/**
 * Fix Position IDs to match Application Position IDs
 * This ensures applications show up in the channel partner list
 */

const mongoose = require('mongoose');

// MongoDB URI
const MONGODB_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner';

// Import models
const Position = require('./api/models/Position');
const Application = require('./api/models/Application');

async function fixPositionIds() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected!\n');

    // Step 1: Get all applications with their position IDs
    console.log('📋 Fetching all approved applications...');
    const applications = await Application.find({ status: 'Approved' }).select('positionId userId location');
    console.log(`Found ${applications.length} approved applications\n`);

    // Step 2: Group applications by location to find the pattern
    const locationMap = new Map();
    
    for (const app of applications) {
      const posId = app.positionId;
      console.log(`\n📍 Application: ${posId}`);
      console.log(`   Location in app:`, app.location);
      
      // Extract location from positionId
      // Format: pos_<role>_<country>_<zone>_<state>_<division>_<district>_<tehsil>_<pincode>_<village>
      const parts = posId.split('_');
      const role = parts[1]; // district-head, zone-head, etc.
      
      console.log(`   Role: ${role}`);
      
      // Find matching position
      const existingPosition = await Position.findOne({ positionId: posId });
      
      if (existingPosition) {
        console.log(`   ✅ Position already exists with matching ID`);
      } else {
        console.log(`   ❌ No position found with this ID`);
        
        // Try to find position by location
        const query = {};
        if (app.location.country) query['location.country'] = app.location.country;
        if (app.location.zone) query['location.zone'] = app.location.zone;
        if (app.location.state) query['location.state'] = app.location.state;
        if (app.location.division) query['location.division'] = app.location.division;
        if (app.location.district) query['location.district'] = app.location.district;
        if (app.location.tehsil) query['location.tehsil'] = app.location.tehsil;
        if (app.location.pincode) query['location.pincode'] = app.location.pincode;
        if (app.location.village) query['location.village'] = app.location.village;
        
        const positionsByLocation = await Position.find(query).select('positionId designation location');
        
        if (positionsByLocation.length > 0) {
          console.log(`   🔍 Found ${positionsByLocation.length} positions at this location:`);
          for (const pos of positionsByLocation) {
            console.log(`      Current ID: ${pos.positionId}`);
            console.log(`      Should be:  ${posId}`);
            
            // Update the position ID to match the application
            await Position.updateOne(
              { _id: pos._id },
              { $set: { positionId: posId } }
            );
            console.log(`      ✅ Updated position ID!`);
          }
        } else {
          console.log(`   ⚠️  No positions found at this location - might need to create one`);
        }
      }
    }

    console.log('\n\n✅ Position ID fix complete!');
    console.log('Now applications should appear in the channel partner list.\n');

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixPositionIds();
