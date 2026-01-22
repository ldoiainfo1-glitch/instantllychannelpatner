/**
 * Check for "West" location references in database
 */

const mongoose = require('mongoose');

// MongoDB URI
const MONGODB_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner';

// Import models
const Location = require('./api/models/Location');
const Application = require('./api/models/Application');
const Position = require('./api/models/Position');

async function checkWestLocation() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check for different "West" variations
    const westVariations = ['West', 'west', 'West Zone', 'west zone', 'Western', 'western'];
    
    for (const variant of westVariations) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📋 Checking for zone="${variant}"...`);
      console.log('='.repeat(60));

      // Check Location table
      const locations = await Location.find({ zone: variant }).limit(3);
      console.log(`\nLocation table: ${locations.length} records`);
      if (locations.length > 0) {
        console.log('Sample:', JSON.stringify(locations[0], null, 2));
      }

      // Check Applications
      const applications = await Application.find({ 'location.zone': variant });
      console.log(`\nApplication table: ${applications.length} records`);
      if (applications.length > 0) {
        console.log('\nApplications:');
        for (const app of applications.slice(0, 3)) {
          console.log(`  - ${app.applicantInfo?.name || 'N/A'} (${app.applicantInfo?.phone || 'N/A'})`);
          console.log(`    Position ID: ${app.positionId}`);
          console.log(`    Zone: ${app.location?.zone}`);
          console.log(`    Status: ${app.status}`);
        }
      }

      // Check Positions
      const positions = await Position.find({ 'location.zone': variant });
      console.log(`\nPosition table: ${positions.length} records`);
      if (positions.length > 0) {
        console.log('\nPositions:');
        for (const pos of positions.slice(0, 3)) {
          console.log(`  - ${pos.designation}`);
          console.log(`    Position ID: ${pos.positionId}`);
          console.log(`    Zone: ${pos.location?.zone}`);
        }
      }
    }

    console.log('\n\n' + '='.repeat(60));
    console.log('📊 CHECKING FOR APPROVED APPLICATIONS (regardless of zone)');
    console.log('='.repeat(60));
    
    const approvedApps = await Application.find({ status: 'Approved' }).limit(10);
    console.log(`\nFound ${approvedApps.length} approved applications (showing first 10)`);
    
    for (const app of approvedApps) {
      console.log(`\n${'-'.repeat(40)}`);
      console.log(`Name: ${app.applicantInfo?.name || 'N/A'}`);
      console.log(`Phone: ${app.applicantInfo?.phone || 'N/A'}`);
      console.log(`Position ID: ${app.positionId}`);
      console.log(`Zone: ${app.location?.zone || 'N/A'}`);
      console.log(`Status: ${app.status}`);
      console.log(`Applied: ${app.appliedAt}`);
    }

    console.log('\n\n✅ Diagnostic complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkWestLocation();
