const mongoose = require('mongoose');
const Application = require('./api/models/Application');
const User = require('./api/models/User');

const MONGODB_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner';

async function checkPankajPosition() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find Pankaj's approved application
    const phone = '7559213601';
    const app = await Application.findOne({ 
      'applicantInfo.phone': phone, 
      status: 'approved' 
    });

    if (!app) {
      console.log('❌ No approved application found for Pankaj');
      return;
    }

    console.log('📋 PANKAJ\'S APPLICATION:');
    console.log('   positionId:', app.positionId);
    console.log('   status:', app.status);
    console.log('\n📍 applicantInfo HIERARCHY:');
    console.log('   pincode:', app.applicantInfo.pincode);
    console.log('   tehsil:', app.applicantInfo.tehsil);
    console.log('   district:', app.applicantInfo.district);
    console.log('   division:', app.applicantInfo.division);
    console.log('   state:', app.applicantInfo.state);
    console.log('   zone:', app.applicantInfo.zone);
    console.log('   country:', app.applicantInfo.country);

    console.log('\n🔍 TESTING ZONE SEARCH:');
    
    // Test 1: Search by positionId for Zone
    const zoneRegex = /zone.*head.*west[-_\s]*zone|west[-_\s]*zone.*zone[-_\s]*head/i;
    const zoneByPosition = await Application.findOne({
      status: 'approved',
      positionId: zoneRegex
    });
    console.log('   Zone by positionId regex:', zoneByPosition ? '✅ FOUND' : '❌ NOT FOUND');
    if (zoneByPosition) {
      console.log('   Found:', zoneByPosition.positionId);
    }

    // Test 2: Search by applicantInfo.zone field
    const zoneByField = await Application.findOne({
      status: 'approved',
      'applicantInfo.zone': /west zone/i
    });
    console.log('   Zone by applicantInfo.zone:', zoneByField ? '✅ FOUND' : '❌ NOT FOUND');
    if (zoneByField) {
      console.log('   Found:', zoneByField.applicantInfo.phone, '-', zoneByField.positionId);
    }

    console.log('\n🔍 TESTING STATE SEARCH:');
    
    // Test 3: Search by positionId for State
    const stateRegex = /state.*head.*maharashtra|maharashtra.*state[-_\s]*head/i;
    const stateByPosition = await Application.findOne({
      status: 'approved',
      positionId: stateRegex
    });
    console.log('   State by positionId regex:', stateByPosition ? '✅ FOUND' : '❌ NOT FOUND');
    if (stateByPosition) {
      console.log('   Found:', stateByPosition.positionId);
    }

    // Test 4: Search by applicantInfo.state field
    const stateByField = await Application.findOne({
      status: 'approved',
      'applicantInfo.state': /maharashtra/i
    });
    console.log('   State by applicantInfo.state:', stateByField ? '✅ FOUND' : '❌ NOT FOUND');
    if (stateByField) {
      console.log('   Found:', stateByField.applicantInfo.phone, '-', stateByField.positionId);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkPankajPosition();
