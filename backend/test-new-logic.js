const mongoose = require('mongoose');
require('dotenv').config();

const Application = require('./api/models/Application');

async function testNewLogic() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');
    
    // Get Urmila's application
    const application = await Application.findOne({ 'applicantInfo.phone': '7410169609' }).lean();
    
    // Extract hierarchy FROM POSITIONID
    const posIdParts = application.positionId.split('_');
    const hierarchy = {
      country: posIdParts[2] || 'india',
      zone: posIdParts[3] || null,
      state: posIdParts[4] || null,
      division: posIdParts[5] || null,
      district: posIdParts[6] || null,
      tehsil: posIdParts[7] || null,
      pincode: posIdParts[8] || null
    };
    
    console.log('📍 Hierarchy extracted:', hierarchy);
    console.log('\n');
    
    // Test each level search
    const levels = ['tehsil', 'district', 'division', 'state', 'zone', 'country'];
    
    for (const levelName of levels) {
      let query = { status: 'approved', 'applicantInfo.phone': { $ne: '7410169609' } };
      
      if (levelName === 'country') {
        query.positionId = { $regex: /pos_president_india|pos_country-head_india/i };
      } else if (levelName === 'zone' && hierarchy.zone) {
        const zonePattern = `pos_zone-head_india_${hierarchy.zone}`;
        query.positionId = { $regex: new RegExp(zonePattern.replace(/-/g, '[-_]'), 'i') };
      } else if (levelName === 'state' && hierarchy.state) {
        const statePattern = `pos_state-head_india_${hierarchy.zone}_${hierarchy.state}`;
        query.positionId = { $regex: new RegExp(statePattern.replace(/-/g, '[-_]'), 'i') };
      } else if (levelName === 'division' && hierarchy.division) {
        const divPattern = `pos_division-head_india_${hierarchy.zone}_${hierarchy.state}_${hierarchy.division}`;
        query.positionId = { $regex: new RegExp(divPattern.replace(/-/g, '[-_]'), 'i') };
      } else if (levelName === 'district' && hierarchy.district) {
        const distPattern = `pos_district-head_india_${hierarchy.zone}_${hierarchy.state}_${hierarchy.division}_${hierarchy.district}`;
        query.positionId = { $regex: new RegExp(distPattern.replace(/-/g, '[-_]'), 'i') };
      } else if (levelName === 'tehsil' && hierarchy.tehsil) {
        const tehsilPattern = `pos_tehsil-head_india_${hierarchy.zone}_${hierarchy.state}_${hierarchy.division}_${hierarchy.district}_${hierarchy.tehsil}`;
        query.positionId = { $regex: new RegExp(tehsilPattern.replace(/-/g, '[-_]'), 'i') };
      }
      
      console.log(`\n🔎 ${levelName.toUpperCase()}:`);
      console.log('   Query:', JSON.stringify(query, null, 2));
      
      const app = await Application.findOne(query).lean();
      if (app) {
        console.log(`   ✅ FOUND: ${app.applicantInfo.name} (${app.applicantInfo.phone})`);
        console.log(`   Position: ${app.positionId}`);
      } else {
        console.log('   ✗ EMPTY');
      }
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testNewLogic();
