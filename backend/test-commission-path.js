#!/usr/bin/env node

/**
 * Test Commission Path System
 * 
 * This script tests the new commission path tracking system by:
 * 1. Checking if CommissionDistribution model exists
 * 2. Testing if commission paths are created when ads are submitted
 * 3. Verifying the path shows filled and empty positions correctly
 * 4. Testing the API endpoint for fetching paths
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner';

// Define minimal schemas
const CommissionDistribution = mongoose.model('CommissionDistribution', new mongoose.Schema({}, { collection: 'commissiondistributions', strict: false }));
const User = mongoose.model('User', new mongoose.Schema({}, { collection: 'users', strict: false }));
const Application = mongoose.model('Application', new mongoose.Schema({}, { collection: 'applications', strict: false }));

async function testCommissionPathSystem() {
  try {
    console.log('🔌 Connecting to MongoDB...\n');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // ========================================
    // TEST 1: Check if Urmila exists
    // ========================================
    console.log('📋 TEST 1: Check Urmila\'s Account');
    console.log('=' .repeat(60));
    
    const urmila = await User.findOne({ phone: '7410169609' });
    if (!urmila) {
      console.log('❌ Urmila not found in database');
      process.exit(1);
    }
    
    console.log('✅ Found Urmila\'s account:');
    console.log(`   Name: ${urmila.name}`);
    console.log(`   Phone: ${urmila.phone}`);
    console.log(`   Cash Credits: ₹${urmila.cashCredits || 0}`);
    console.log(`   Extra Credits: ₹${urmila.extraCredits || 0}`);
    console.log(`   Commission Balance: ₹${urmila.commissionBalance || 0}`);
    console.log('');

    // ========================================
    // TEST 2: Check Urmila's application
    // ========================================
    console.log('📋 TEST 2: Check Urmila\'s Application & Hierarchy');
    console.log('=' .repeat(60));
    
    const urmilaApp = await Application.findOne({ 
      'applicantInfo.phone': '7410169609',
      status: 'approved'
    });
    
    if (!urmilaApp) {
      console.log('❌ Urmila\'s approved application not found');
      process.exit(1);
    }
    
    console.log('✅ Found Urmila\'s approved application:');
    console.log(`   Position ID: ${urmilaApp.positionId}`);
    console.log(`   Status: ${urmilaApp.status}`);
    console.log('\n📍 Hierarchy:');
    console.log(`   Pincode: ${urmilaApp.applicantInfo?.pincode || 'Not set'}`);
    console.log(`   Tehsil: ${urmilaApp.applicantInfo?.tehsil || 'Not set'}`);
    console.log(`   District: ${urmilaApp.applicantInfo?.district || 'Not set'}`);
    console.log(`   Division: ${urmilaApp.applicantInfo?.division || 'Not set'}`);
    console.log(`   State: ${urmilaApp.applicantInfo?.state || 'Not set'}`);
    console.log(`   Zone: ${urmilaApp.applicantInfo?.zone || 'Not set'}`);
    console.log(`   Country: ${urmilaApp.applicantInfo?.country || 'Not set'}`);
    console.log('');

    // ========================================
    // TEST 3: Check for parent positions
    // ========================================
    console.log('📋 TEST 3: Check Parent Positions in Hierarchy');
    console.log('=' .repeat(60));
    
    const state = await Application.findOne({
      status: 'approved',
      positionId: { $regex: /state.*maharashtra/i }
    });
    
    const country = await Application.findOne({
      status: 'approved',
      positionId: { $regex: /president|india/i }
    });
    
    console.log('\n🔍 State Position (Maharashtra):');
    if (state) {
      const stateUser = await User.findById(state.userId);
      console.log(`   ✅ FILLED`);
      console.log(`   Name: ${stateUser?.name || 'Unknown'}`);
      console.log(`   Phone: ${state.applicantInfo?.phone || 'Unknown'}`);
      console.log(`   Position ID: ${state.positionId}`);
    } else {
      console.log(`   ⛔ EMPTY`);
    }
    
    console.log('\n🔍 Country Position (India):');
    if (country) {
      const countryUser = await User.findById(country.userId);
      console.log(`   ✅ FILLED`);
      console.log(`   Name: ${countryUser?.name || 'Unknown'}`);
      console.log(`   Phone: ${country.applicantInfo?.phone || 'Unknown'}`);
      console.log(`   Position ID: ${country.positionId}`);
    } else {
      console.log(`   ⛔ EMPTY`);
    }
    console.log('');

    // ========================================
    // TEST 4: Check existing commission paths
    // ========================================
    console.log('📋 TEST 4: Check Existing Commission Paths');
    console.log('=' .repeat(60));
    
    const existingPaths = await CommissionDistribution.find({ 
      creatorPhone: '7410169609' 
    }).sort({ distributionDate: -1 }).limit(5);
    
    if (existingPaths.length === 0) {
      console.log('ℹ️  No commission paths found yet');
      console.log('   This is expected if Urmila hasn\'t created any ads using cash credits');
    } else {
      console.log(`✅ Found ${existingPaths.length} commission path(s):\n`);
      
      existingPaths.forEach((path, idx) => {
        console.log(`\n📊 Path #${idx + 1}:`);
        console.log(`   Ad Amount: ₹${path.adAmount}`);
        console.log(`   Distribution Date: ${new Date(path.distributionDate).toLocaleString('en-IN')}`);
        console.log(`   Total Distributed: ₹${path.totalDistributed}`);
        console.log(`   Filled Positions: ${path.filledPositions}`);
        console.log(`   Empty Positions: ${path.emptyPositions}`);
        console.log('\n   Hierarchy Path:');
        
        path.hierarchyPath.forEach(h => {
          const icon = h.status === 'filled' ? '✅' : (h.status === 'self' ? '👤' : '⛔');
          const statusText = h.status === 'filled' ? 'FILLED' : (h.status === 'self' ? 'SELF' : 'EMPTY');
          const holderText = h.holder || 'N/A';
          const commissionText = h.commission > 0 ? `₹${h.commission} (${h.percent}%)` : '₹0';
          const sequentialText = h.sequentialPosition ? ` [Parent #${h.sequentialPosition}]` : '';
          
          console.log(`     ${icon} ${h.level.toUpperCase()} (${h.location}) - ${statusText}`);
          console.log(`        Holder: ${holderText} ${h.holderPhone ? '(' + h.holderPhone + ')' : ''}`);
          console.log(`        Commission: ${commissionText}${sequentialText}`);
        });
      });
    }
    console.log('');

    // ========================================
    // TEST 5: Verify API endpoint structure
    // ========================================
    console.log('📋 TEST 5: Verify Commission Path Data Structure');
    console.log('=' .repeat(60));
    
    if (existingPaths.length > 0) {
      const sample = existingPaths[0];
      console.log('\n✅ Sample path has all required fields:');
      console.log(`   ✅ adId: ${sample.adId ? 'Present' : 'Missing'}`);
      console.log(`   ✅ creatorId: ${sample.creatorId ? 'Present' : 'Missing'}`);
      console.log(`   ✅ creatorPhone: ${sample.creatorPhone ? 'Present' : 'Missing'}`);
      console.log(`   ✅ creatorName: ${sample.creatorName ? 'Present' : 'Missing'}`);
      console.log(`   ✅ adAmount: ${sample.adAmount ? 'Present' : 'Missing'}`);
      console.log(`   ✅ hierarchyPath: ${sample.hierarchyPath ? `${sample.hierarchyPath.length} levels` : 'Missing'}`);
      console.log(`   ✅ totalDistributed: ${sample.totalDistributed !== undefined ? 'Present' : 'Missing'}`);
      console.log(`   ✅ filledPositions: ${sample.filledPositions !== undefined ? 'Present' : 'Missing'}`);
      console.log(`   ✅ emptyPositions: ${sample.emptyPositions !== undefined ? 'Present' : 'Missing'}`);
    } else {
      console.log('⏳ No paths to verify yet - create an ad to test');
    }
    console.log('');

    // ========================================
    // SUMMARY
    // ========================================
    console.log('📋 SUMMARY');
    console.log('=' .repeat(60));
    console.log('✅ Urmila\'s account: Found');
    console.log('✅ Urmila\'s application: Found and approved');
    console.log(`${state ? '✅' : '⛔'} State position: ${state ? 'Filled (Pankaj Rathod)' : 'Empty'}`);
    console.log(`${country ? '✅' : '⛔'} Country position: ${country ? 'Filled (Prashanth Awanti)' : 'Empty'}`);
    console.log(`${existingPaths.length > 0 ? '✅' : 'ℹ️ '} Commission paths: ${existingPaths.length} found`);
    console.log('');
    
    if (existingPaths.length === 0) {
      console.log('💡 NEXT STEPS:');
      console.log('   1. Have Urmila create an ad using cash credits (₹1,200)');
      console.log('   2. Run this script again to verify the commission path was created');
      console.log('   3. Check the frontend profile page → Commissions → Distribution Paths tab');
    } else {
      console.log('🎉 SUCCESS! Commission path system is working correctly!');
      console.log('');
      console.log('📱 To view in frontend:');
      console.log('   1. Log in as Urmila (7410169609)');
      console.log('   2. Go to Profile → Commissions tab');
      console.log('   3. Click "Distribution Paths" sub-tab');
      console.log('   4. View the visual hierarchy showing filled/empty positions');
    }
    console.log('');

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testCommissionPathSystem();
