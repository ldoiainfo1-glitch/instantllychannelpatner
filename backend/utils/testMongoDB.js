/**
 * Test MongoDB connection and performance
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function testMongoDB() {
  console.log('🧪 Starting MongoDB Performance Test...\n');
  
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    // Test 1: Connection Speed
    console.log('📡 TEST 1: Connection Speed');
    const connectStart = Date.now();
    await mongoose.connect(process.env.MONGODB_URI);
    const connectTime = Date.now() - connectStart;
    console.log(`   ✅ Connected in ${connectTime}ms`);
    if (connectTime > 2000) {
      console.log(`   ⚠️  WARNING: Connection is slow (>2s)`);
    }
    console.log(`   Database: ${mongoose.connection.name}\n`);

    const db = mongoose.connection.db;

    // Test 2: Check Collections
    console.log('📚 TEST 2: Collections');
    const collections = await db.listCollections().toArray();
    console.log(`   Found ${collections.length} collections:`);
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });
    console.log();

    // Test 3: Check Indexes
    console.log('🔍 TEST 3: Database Indexes');
    
    if (collections.find(c => c.name === 'users')) {
      const userIndexes = await db.collection('users').indexes();
      console.log(`   Users collection: ${userIndexes.length} indexes`);
      userIndexes.forEach(idx => {
        console.log(`     - ${idx.name}: ${JSON.stringify(idx.key)}`);
      });
    }
    
    if (collections.find(c => c.name === 'applications')) {
      const appIndexes = await db.collection('applications').indexes();
      console.log(`   Applications collection: ${appIndexes.length} indexes`);
      appIndexes.forEach(idx => {
        console.log(`     - ${idx.name}: ${JSON.stringify(idx.key)}`);
      });
    }
    
    if (collections.find(c => c.name === 'promotions')) {
      const promoIndexes = await db.collection('promotions').indexes();
      console.log(`   Promotions collection: ${promoIndexes.length} indexes`);
      promoIndexes.forEach(idx => {
        console.log(`     - ${idx.name}: ${JSON.stringify(idx.key)}`);
      });
    }
    console.log();

    // Test 4: Query Performance
    console.log('⚡ TEST 4: Query Performance');
    
    // Test user query by phone
    if (collections.find(c => c.name === 'users')) {
      const count = await db.collection('users').countDocuments();
      console.log(`   Users in database: ${count}`);
      
      const queryStart = Date.now();
      const user = await db.collection('users').findOne({ phone: '9403311046' });
      const queryTime = Date.now() - queryStart;
      console.log(`   Query by phone: ${queryTime}ms ${queryTime > 100 ? '⚠️ SLOW' : '✅ FAST'}`);
      if (user) console.log(`   Found user: ${user.name}`);
    }
    
    // Test promotion query
    if (collections.find(c => c.name === 'promotions')) {
      const promoCount = await db.collection('promotions').countDocuments();
      console.log(`   Promotions in database: ${promoCount}`);
      
      const queryStart = Date.now();
      const promos = await db.collection('promotions')
        .find({})
        .sort({ date: -1 })
        .limit(10)
        .toArray();
      const queryTime = Date.now() - queryStart;
      console.log(`   Query 10 promotions: ${queryTime}ms ${queryTime > 200 ? '⚠️ SLOW' : '✅ FAST'}`);
    }
    
    // Test application query
    if (collections.find(c => c.name === 'applications')) {
      const appCount = await db.collection('applications').countDocuments();
      console.log(`   Applications in database: ${appCount}`);
      
      const queryStart = Date.now();
      const apps = await db.collection('applications')
        .find({ status: 'approved' })
        .limit(10)
        .toArray();
      const queryTime = Date.now() - queryStart;
      console.log(`   Query approved apps: ${queryTime}ms ${queryTime > 200 ? '⚠️ SLOW' : '✅ FAST'}`);
    }
    console.log();

    // Test 5: Ping Database
    console.log('🏓 TEST 5: Database Ping');
    const pingStart = Date.now();
    await db.admin().ping();
    const pingTime = Date.now() - pingStart;
    console.log(`   Ping time: ${pingTime}ms ${pingTime > 50 ? '⚠️ HIGH LATENCY' : '✅ LOW LATENCY'}`);
    console.log();

    // Summary
    console.log('📊 SUMMARY:');
    console.log(`   Connection: ${connectTime}ms`);
    console.log(`   Ping: ${pingTime}ms`);
    console.log(`   Collections: ${collections.length}`);
    
    if (connectTime > 2000 || pingTime > 100) {
      console.log('\n⚠️  ISSUES DETECTED:');
      console.log('   - MongoDB Atlas might be on FREE tier (M0)');
      console.log('   - Consider upgrading to M2 ($9/month) or M10 ($57/month)');
      console.log('   - MongoDB might be in a far region (high latency)');
    } else {
      console.log('\n✅ MongoDB performance looks good!');
    }

    await mongoose.connection.close();
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testMongoDB();
