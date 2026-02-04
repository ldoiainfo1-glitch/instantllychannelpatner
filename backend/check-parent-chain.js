const mongoose = require('mongoose');
require('dotenv').config();

const Application = require('./api/models/Application');
const User = require('./api/models/User');

async function checkParentChain() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');
    
    // Get Urmila's application
    const urmila = await Application.findOne({ 'applicantInfo.phone': '7410169609' }).lean();
    console.log('🔍 URMILA:');
    console.log('  introducedBy:', urmila.introducedBy);
    console.log('  positionId:', urmila.positionId);
    
    // Parse positionId to extract hierarchy
    const parts = urmila.positionId.split('_');
    console.log('\n  Parsed positionId parts:', parts);
    // pos, pincode-head, india, west-zone, maharashtra, konkan, thane, thane, 401107
    
    // Expected parent hierarchy from positionId:
    // - Tehsil: Thane (parts[7])
    // - District: Thane (parts[6])
    // - Division: Konkan (parts[5])
    // - State: Maharashtra (parts[4])
    // - Zone: West Zone (parts[3])
    // - Country: India (parts[2])
    
    console.log('\n📋 EXPECTED PARENT HIERARCHY FROM POSITIONID:');
    console.log('  Country:', parts[2]);
    console.log('  Zone:', parts[3]);
    console.log('  State:', parts[4]);
    console.log('  Division:', parts[5]);
    console.log('  District:', parts[6]);
    console.log('  Tehsil:', parts[7]);
    console.log('  Pincode:', parts[8]);
    
    // Search for actual parents in this hierarchy
    console.log('\n\n🔎 SEARCHING FOR PARENTS IN HIERARCHY:');
    
    // Tehsil - thane
    console.log('\n1. Tehsil (Thane):');
    const tehsilApps = await Application.find({
      status: 'approved',
      positionId: { $regex: /pos_tehsil-head.*_thane_thane/i }
    }).lean();
    tehsilApps.forEach(app => {
      console.log(`   ✓ ${app.applicantInfo.name} (${app.applicantInfo.phone}) - ${app.positionId}`);
    });
    if (tehsilApps.length === 0) console.log('   ✗ EMPTY');
    
    // District - thane
    console.log('\n2. District (Thane):');
    const districtApps = await Application.find({
      status: 'approved',
      positionId: { $regex: /pos_district-head.*_thane$/i }
    }).lean();
    districtApps.forEach(app => {
      console.log(`   ✓ ${app.applicantInfo.name} (${app.applicantInfo.phone}) - ${app.positionId}`);
    });
    if (districtApps.length === 0) console.log('   ✗ EMPTY');
    
    // Division - konkan
    console.log('\n3. Division (Konkan):');
    const divisionApps = await Application.find({
      status: 'approved',
      positionId: { $regex: /pos_division-head.*_konkan/i }
    }).lean();
    divisionApps.forEach(app => {
      console.log(`   ✓ ${app.applicantInfo.name} (${app.applicantInfo.phone}) - ${app.positionId}`);
    });
    if (divisionApps.length === 0) console.log('   ✗ EMPTY');
    
    // State - maharashtra
    console.log('\n4. State (Maharashtra):');
    const stateApps = await Application.find({
      status: 'approved',
      positionId: { $regex: /pos_state-head.*_maharashtra/i }
    }).lean();
    stateApps.forEach(app => {
      console.log(`   ✓ ${app.applicantInfo.name} (${app.applicantInfo.phone}) - ${app.positionId}`);
    });
    if (stateApps.length === 0) console.log('   ✗ EMPTY');
    
    // Zone - west-zone
    console.log('\n5. Zone (West Zone):');
    const zoneApps = await Application.find({
      status: 'approved',
      positionId: { $regex: /pos_zone-head.*_west-zone/i }
    }).lean();
    zoneApps.forEach(app => {
      console.log(`   ✓ ${app.applicantInfo.name} (${app.applicantInfo.phone}) - ${app.positionId}`);
    });
    if (zoneApps.length === 0) console.log('   ✗ EMPTY');
    
    // Country - india
    console.log('\n6. Country (India):');
    const countryApps = await Application.find({
      status: 'approved',
      positionId: { $regex: /pos_president_india|pos_country-head_india/i }
    }).lean();
    countryApps.forEach(app => {
      console.log(`   ✓ ${app.applicantInfo.name} (${app.applicantInfo.phone}) - ${app.positionId}`);
    });
    if (countryApps.length === 0) console.log('   ✗ EMPTY');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkParentChain();
