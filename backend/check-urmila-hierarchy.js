const mongoose = require('mongoose');
require('dotenv').config();

const Application = require('./api/models/Application');

async function checkHierarchy() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Get Urmila's application
    const urmila = await Application.findOne({ 'applicantInfo.phone': '7410169609' }).lean();
    console.log('\n🔍 URMILA APPLICATION:');
    console.log('Position ID:', urmila.positionId);
    console.log('Hierarchy:', {
      country: urmila.applicantInfo.country,
      zone: urmila.applicantInfo.zone,
      state: urmila.applicantInfo.state,
      division: urmila.applicantInfo.division,
      district: urmila.applicantInfo.district,
      tehsil: urmila.applicantInfo.tehsil,
      pincode: urmila.applicantInfo.pincode
    });
    
    // Check what the search query would find
    console.log('\n🔎 CHECKING POSITION HOLDERS IN HER PATH:');
    
    // Check tehsil
    const tehsilQuery = { 
      status: 'approved',
      'applicantInfo.phone': { $ne: '7410169609' },
      positionId: { $regex: new RegExp(`tehsil[-_\\s]*head.*thane`, 'i') }
    };
    const tehsilApps = await Application.find(tehsilQuery).lean();
    console.log('\nTehsil (Thane) - Query:', JSON.stringify(tehsilQuery, null, 2));
    console.log('Found:', tehsilApps.length, 'applications');
    tehsilApps.forEach(app => {
      console.log('  -', app.applicantInfo.name, app.applicantInfo.phone, 'Position:', app.positionId);
    });
    
    // Check district
    const districtQuery = { 
      status: 'approved',
      'applicantInfo.phone': { $ne: '7410169609' },
      positionId: { $regex: new RegExp(`district[-_\\s]*head.*thane`, 'i') }
    };
    const districtApps = await Application.find(districtQuery).lean();
    console.log('\nDistrict (Thane) - Query:', JSON.stringify(districtQuery, null, 2));
    console.log('Found:', districtApps.length, 'applications');
    districtApps.forEach(app => {
      console.log('  -', app.applicantInfo.name, app.applicantInfo.phone, 'Position:', app.positionId);
    });
    
    // Check division
    const divisionQuery = { 
      status: 'approved',
      'applicantInfo.phone': { $ne: '7410169609' },
      positionId: { $regex: new RegExp(`division[-_\\s]*head.*konkan`, 'i') }
    };
    const divisionApps = await Application.find(divisionQuery).lean();
    console.log('\nDivision (Konkan) - Query:', JSON.stringify(divisionQuery, null, 2));
    console.log('Found:', divisionApps.length, 'applications');
    divisionApps.forEach(app => {
      console.log('  -', app.applicantInfo.name, app.applicantInfo.phone, 'Position:', app.positionId);
    });
    
    // Check state
    const stateQuery = { 
      status: 'approved',
      'applicantInfo.phone': { $ne: '7410169609' },
      positionId: { $regex: new RegExp(`state[-_\\s]*head.*maharashtra`, 'i') }
    };
    const stateApps = await Application.find(stateQuery).lean();
    console.log('\nState (Maharashtra) - Query:', JSON.stringify(stateQuery, null, 2));
    console.log('Found:', stateApps.length, 'applications');
    stateApps.forEach(app => {
      console.log('  -', app.applicantInfo.name, app.applicantInfo.phone, 'Position:', app.positionId);
    });
    
    // Check zone
    const zoneQuery = { 
      status: 'approved',
      'applicantInfo.phone': { $ne: '7410169609' },
      positionId: { $regex: new RegExp(`zone[-_\\s]*head.*west[-_\\s]*zone`, 'i') }
    };
    const zoneApps = await Application.find(zoneQuery).lean();
    console.log('\nZone (West Zone) - Query:', JSON.stringify(zoneQuery, null, 2));
    console.log('Found:', zoneApps.length, 'applications');
    zoneApps.forEach(app => {
      console.log('  -', app.applicantInfo.name, app.applicantInfo.phone, 'Position:', app.positionId);
    });
    
    // Check Madhu Gourla
    console.log('\n🔍 CHECKING MADHU GOURLA:');
    const madhu = await Application.findOne({ 'applicantInfo.phone': '9849469789' }).lean();
    console.log('Position ID:', madhu.positionId);
    console.log('Hierarchy:', {
      country: madhu.applicantInfo.country,
      zone: madhu.applicantInfo.zone,
      state: madhu.applicantInfo.state,
      division: madhu.applicantInfo.division,
      district: madhu.applicantInfo.district,
      tehsil: madhu.applicantInfo.tehsil,
      pincode: madhu.applicantInfo.pincode
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkHierarchy();
