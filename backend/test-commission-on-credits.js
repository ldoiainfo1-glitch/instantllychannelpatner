/**
 * Test Script: Commission Distribution on Cash Credits Given
 * 
 * This script tests the new commission system where commission distributes
 * when CASH CREDITS are given to user account (not when ads are created)
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner';

const userSchema = new mongoose.Schema({
  name: String,
  phone: String,
  credits: Number,
  cashCredits: Number,
  extraCredits: Number,
  cashHistory: Array,
  extraHistory: Array,
  commissionBalance: Number,
  commissionHistory: Array
}, { collection: 'users', strict: false });

const applicationSchema = new mongoose.Schema({
  status: String,
  applicantInfo: {
    name: String,
    phone: String,
    pincode: String,
    tehsil: String,
    district: String,
    division: String,
    state: String,
    zone: String,
    country: String
  },
  positionId: String,
  position: {
    level: String
  },
  userId: mongoose.Schema.Types.ObjectId
}, { collection: 'applications', strict: false });

const User = mongoose.model('TestUser', userSchema);
const Application = mongoose.model('TestApplication', applicationSchema);

async function testCommissionDistribution() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected!\n');

    // Find Urmila (the person who will receive credits)
    console.log('🔍 Finding Urmila Jagveer Kagda...');
    const urmila = await User.findOne({ phone: '7410169609' });
    
    if (!urmila) {
      console.error('❌ Urmila not found with phone 7410169609');
      process.exit(1);
    }

    console.log(`✅ Found: ${urmila.name}`);
    console.log(`   Phone: ${urmila.phone}\n`);

    // Get Urmila's application to find hierarchy
    const urmilaApp = await Application.findOne({ 
      'applicantInfo.phone': urmila.phone,
      status: 'approved'
    });

    if (!urmilaApp) {
      console.error('❌ Urmila has no approved application');
      process.exit(1);
    }

    console.log('📍 Urmila\'s Hierarchy:');
    console.log(`   Pincode: ${urmilaApp.applicantInfo?.pincode}`);
    console.log(`   Tehsil: ${urmilaApp.applicantInfo?.tehsil}`);
    console.log(`   District: ${urmilaApp.applicantInfo?.district}`);
    console.log(`   Division: ${urmilaApp.applicantInfo?.division}`);
    console.log(`   State: ${urmilaApp.applicantInfo?.state}`);
    console.log(`   Zone: ${urmilaApp.applicantInfo?.zone}`);
    console.log(`   Country: ${urmilaApp.applicantInfo?.country || 'India'}\n`);

    // Find Pankaj Rathod (State level - Maharashtra)
    console.log('🔍 Finding Pankaj Rathod (State - Maharashtra)...');
    const pankajApp = await Application.findOne({
      status: 'approved',
      positionId: /state.*head.*maharashtra/i
    });

    let pankaj = null;
    if (pankajApp) {
      pankaj = await User.findById(pankajApp.userId);
      console.log(`✅ Found: ${pankaj?.name} - ${pankaj?.phone}`);
    } else {
      console.log('⚠️  Not found (position empty)');
    }

    // Find Prashanth Awanti (Country level - India)
    console.log('🔍 Finding Prashanth Awanti (Country - India)...');
    const prashanthApp = await Application.findOne({
      status: 'approved',
      positionId: /president|india.*head/i
    });

    let prashanth = null;
    if (prashanthApp) {
      prashanth = await User.findById(prashanthApp.userId);
      console.log(`✅ Found: ${prashanth?.name} - ${prashanth?.phone}\n`);
    } else {
      console.log('⚠️  Not found (position empty)\n');
    }

    // Display current balances BEFORE
    console.log('💰 BEFORE - Current Credits:');
    console.log('─'.repeat(80));
    console.log(`${urmila.name}:`);
    console.log(`   Cash Credits: ${(urmila.cashCredits || 0).toLocaleString('en-IN')}`);
    console.log(`   Extra Credits: ${(urmila.extraCredits || 0).toLocaleString('en-IN')}`);
    console.log(`   Total: ${(urmila.credits || 0).toLocaleString('en-IN')}`);
    
    if (pankaj) {
      console.log(`\n${pankaj.name}:`);
      console.log(`   Cash Credits: ${(pankaj.cashCredits || 0).toLocaleString('en-IN')}`);
      console.log(`   Total: ${(pankaj.credits || 0).toLocaleString('en-IN')}`);
    }
    
    if (prashanth) {
      console.log(`\n${prashanth.name}:`);
      console.log(`   Cash Credits: ${(prashanth.cashCredits || 0).toLocaleString('en-IN')}`);
      console.log(`   Total: ${(prashanth.credits || 0).toLocaleString('en-IN')}`);
    }
    console.log('─'.repeat(80) + '\n');

    // Simulate admin giving credits
    const CASH_AMOUNT = 1200; // ₹1,200 cash
    const EXTRA_AMOUNT = 3600; // ₹3,600 extra
    const TOTAL = 4800;

    console.log('🎁 SIMULATING: Admin gives credits to Urmila');
    console.log(`   Cash Credits: ₹${CASH_AMOUNT.toLocaleString('en-IN')}`);
    console.log(`   Extra Credits: ${EXTRA_AMOUNT.toLocaleString('en-IN')}`);
    console.log(`   Total: ${TOTAL.toLocaleString('en-IN')}\n`);

    console.log('💸 EXPECTED Commission Distribution (on ₹1,200 cash):');
    console.log('─'.repeat(80));
    console.log(`${urmila.name} (Self - 20%): ₹${(CASH_AMOUNT * 0.20).toFixed(0)}`);
    if (pankaj) {
      console.log(`${pankaj.name} (Parent #1 - 10%): ₹${(CASH_AMOUNT * 0.10).toFixed(0)}`);
    }
    if (prashanth) {
      console.log(`${prashanth.name} (Parent #2 - 5%): ₹${(CASH_AMOUNT * 0.05).toFixed(0)}`);
    }
    console.log('─'.repeat(80) + '\n');

    console.log('📝 NOTE: In production, commission distributes automatically when:');
    console.log('   1. Admin uses "Give Credits" button in dashboard');
    console.log('   2. POST /api/admin/users/:userId/give-credits');
    console.log('   3. Commission logic runs in admin.js (lines 2720-2900)\n');

    console.log('✅ Test completed! To see actual distribution:');
    console.log('   1. Open Channel Partner Admin dashboard');
    console.log('   2. Click "Give Credits" for Urmila');
    console.log('   3. Enter ₹1,200 cash + 3,600 extra = 4,800 total');
    console.log('   4. Check Cash Credits table - commission entries should appear');
    console.log('   5. Check hierarchy members - they should receive commission\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

testCommissionDistribution();
