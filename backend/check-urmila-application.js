const mongoose = require('mongoose');
const Application = require('./api/models/Application');

const MONGO_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner';

async function checkApplication() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const application = await Application.findOne({ 
      'applicantInfo.phone': '7410169609',
      status: 'approved'
    });

    if (!application) {
      console.log('❌ No approved application found for Urmila');
    } else {
      console.log('✅ Found approved application:');
      console.log(`  Name: ${application.applicantInfo.name}`);
      console.log(`  Phone: ${application.applicantInfo.phone}`);
      console.log(`  Position: ${application.position?.level}`);
      console.log(`  Position ID: ${application.positionId}`);
      console.log(`  Status: ${application.status}`);
      console.log(`  Cash Credits Given: ${application.cashCreditsGiven || 0}`);
      console.log(`  Extra Credits Given: ${application.extraCreditsGiven || 0}`);
      
      // Parse positionId to show hierarchy
      console.log('\nPosition Hierarchy Analysis:');
      if (application.positionId) {
        const parts = application.positionId.split('_');
        console.log(`  Full positionId: ${application.positionId}`);
        console.log(`  Parts array: ${JSON.stringify(parts)}`);
        console.log(`  [0] Type: ${parts[0]}`);
        console.log(`  [1] Level-Head: ${parts[1]}`);
        console.log(`  [2] Country: ${parts[2]}`);
        console.log(`  [3] Zone: ${parts[3]}`);
        console.log(`  [4] State: ${parts[4]}`);
        console.log(`  [5] Division: ${parts[5]}`);
        console.log(`  [6] District: ${parts[6]}`);
        console.log(`  [7] Tehsil: ${parts[7]}`);
        console.log(`  [8] Pincode: ${parts[8]}`);
      } else {
        console.log(`  ❌ NO POSITIONID FOUND!`);
        console.log(`     This is causing the commission distribution to fail!`);
        console.log(`     Code at line 2812 tries: application.positionId.split('_')`);
        console.log(`     This throws error: Cannot read property 'split' of undefined/null`);
      }
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
  }
  process.exit(0);
}

checkApplication();
