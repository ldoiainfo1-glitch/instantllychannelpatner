/**
 * Debug script to check Nagpur position/application mismatch
 */

const mongoose = require('mongoose');

// MongoDB URI
const MONGODB_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner.oe0ixs2.mongodb.net/channelpartner';

// Import models
const Application = require('./api/models/Application');
const Position = require('./api/models/Position');

async function checkNagpurIssue() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected!\n');

    // Find Mangesh Pardhi's application
    console.log('🔍 Checking Mangesh Pardhi application...');
    const mangeshApp = await Application.findOne({ 'applicantInfo.phone': '9326461193' });
    
    if (mangeshApp) {
      console.log('\n📄 Mangesh Application:');
      console.log('   Position ID:', mangeshApp.positionId);
      console.log('   Location:', JSON.stringify(mangeshApp.location, null, 2));
      console.log('   Status:', mangeshApp.status);
      
      // Check if position exists with this ID
      console.log('\n🔍 Looking for matching position...');
      const position = await Position.findOne({ positionId: mangeshApp.positionId });
      
      if (position) {
        console.log('✅ Position FOUND with ID:', position.positionId);
        console.log('   Position details:', JSON.stringify(position.location, null, 2));
      } else {
        console.log('❌ Position NOT FOUND with ID:', mangeshApp.positionId);
        console.log('\n🔍 Searching for Nagpur positions in database...');
        
        const nagpurPositions = await Position.find({
          $or: [
            { 'location.district': /nagpur/i },
            { 'location.division': /nagpur/i },
            { positionId: /nagpur/i }
          ]
        }).limit(5);
        
        console.log(`\n📊 Found ${nagpurPositions.length} Nagpur positions:`);
        nagpurPositions.forEach(pos => {
          console.log(`   Position ID: ${pos.positionId}`);
          console.log(`   Location: ${JSON.stringify(pos.location)}`);
          console.log(`   Status: ${pos.status}`);
          console.log('   ---');
        });
      }
    } else {
      console.log('❌ Mangesh application not found!');
    }

    // Check all Nagpur-related applications
    console.log('\n\n🔍 Checking ALL Nagpur applications...');
    const nagpurApps = await Application.find({
      $or: [
        { 'location.district': /nagpur/i },
        { 'location.division': /nagpur/i },
        { positionId: /nagpur/i }
      ],
      status: 'approved'
    }).limit(10);

    console.log(`\n📊 Found ${nagpurApps.length} approved Nagpur applications:`);
    nagpurApps.forEach(app => {
      console.log(`\n   Name: ${app.applicantInfo.name}`);
      console.log(`   Position ID: ${app.positionId}`);
      console.log(`   Location: ${JSON.stringify(app.location)}`);
    });

    // Generate what the position ID SHOULD be for Mangesh
    if (mangeshApp && mangeshApp.location) {
      console.log('\n\n🔧 What position ID SHOULD be generated:');
      const loc = mangeshApp.location;
      const parts = [];
      
      if (loc.country) parts.push(loc.country.toLowerCase().replace(/\s+/g, '-'));
      if (loc.zone) parts.push(loc.zone.toLowerCase().replace(/\s+/g, '-'));
      if (loc.state) parts.push(loc.state.toLowerCase().replace(/\s+/g, '-'));
      if (loc.division) parts.push(loc.division.toLowerCase().replace(/\s+/g, '-'));
      if (loc.district) parts.push(loc.district.toLowerCase().replace(/\s+/g, '-'));
      if (loc.tehsil) parts.push(loc.tehsil.toLowerCase().replace(/\s+/g, '-'));
      if (loc.pincode) parts.push(loc.pincode.toLowerCase().replace(/\s+/g, '-'));
      if (loc.village) parts.push(loc.village.toLowerCase().replace(/\s+/g, '-'));
      
      let posType = 'president';
      if (loc.village) posType = 'village-head';
      else if (loc.pincode) posType = 'pincode-head';
      else if (loc.tehsil) posType = 'tehsil-head';
      else if (loc.district) posType = 'district-head';
      else if (loc.division) posType = 'division-head';
      else if (loc.state) posType = 'state-head';
      else if (loc.zone) posType = 'zone-head';
      
      const expectedId = `pos_${posType}_${parts.join('_')}`;
      console.log(`   Expected: ${expectedId}`);
      console.log(`   Actual:   ${mangeshApp.positionId}`);
      console.log(`   Match: ${expectedId === mangeshApp.positionId ? '✅' : '❌'}`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkNagpurIssue();
