/**
 * Check Maharashtra divisions in database
 */

const mongoose = require('mongoose');

// MongoDB URI
const MONGODB_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner';

// Import models
const Location = require('./api/models/Location');
const Application = require('./api/models/Application');
const Position = require('./api/models/Position');

async function checkMaharashtraDivisions() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('=' .repeat(60));
    console.log('📋 MAHARASHTRA DIVISIONS IN LOCATION TABLE');
    console.log('='.repeat(60));
    
    // Get all distinct divisions in Maharashtra
    const divisions = await Location.distinct('division', { 
      state: 'Maharashtra',
      division: { $ne: null, $ne: '' }
    });
    
    console.log(`\nFound ${divisions.length} divisions in Maharashtra:`);
    divisions.sort().forEach((div, index) => {
      console.log(`  ${index + 1}. ${div}`);
    });
    
    // Get count of locations per division
    console.log('\n' + '='.repeat(60));
    console.log('📊 LOCATION COUNT PER DIVISION');
    console.log('='.repeat(60) + '\n');
    
    for (const division of divisions.sort()) {
      const count = await Location.countDocuments({ 
        state: 'Maharashtra', 
        division: division 
      });
      console.log(`${division}: ${count} locations`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 MAHARASHTRA DIVISION APPLICATIONS');
    console.log('='.repeat(60) + '\n');
    
    // Check applications for Maharashtra divisions
    const maharashtraApps = await Application.find({ 
      'location.state': 'Maharashtra',
      'location.division': { $ne: null, $ne: '' }
    });
    
    console.log(`Found ${maharashtraApps.length} applications for Maharashtra divisions:`);
    
    if (maharashtraApps.length > 0) {
      maharashtraApps.forEach((app, index) => {
        console.log(`\n${index + 1}. ${app.applicantInfo?.name || 'N/A'}`);
        console.log(`   Division: ${app.location?.division}`);
        console.log(`   Position ID: ${app.positionId}`);
        console.log(`   Status: ${app.status}`);
      });
    } else {
      console.log('   (No applications found for divisions)');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 MAHARASHTRA DIVISION POSITIONS');
    console.log('='.repeat(60) + '\n');
    
    // Check positions
    const maharashtraPositions = await Position.find({ 
      'location.state': 'Maharashtra',
      'location.division': { $ne: null, $ne: '' }
    });
    
    console.log(`Found ${maharashtraPositions.length} positions for Maharashtra divisions:`);
    
    if (maharashtraPositions.length > 0) {
      maharashtraPositions.forEach((pos, index) => {
        console.log(`\n${index + 1}. ${pos.designation}`);
        console.log(`   Division: ${pos.location?.division}`);
        console.log(`   Position ID: ${pos.positionId}`);
      });
    } else {
      console.log('   (No positions found for divisions)');
    }

    console.log('\n\n✅ Diagnostic complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkMaharashtraDivisions();
