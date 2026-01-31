/**
 * Reset Credits and Commission Script
 * User: Urmila Jagveer Kagda
 * Phone: 7410169609
 * Area: pincode head - 401107 (Thane, Maharashtra)
 * 
 * This script will:
 * 1. Reset all credit fields to 0
 * 2. Reset commission balance to 0
 * 3. Clear credit and commission history
 */

const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner';

const userSchema = new mongoose.Schema({
  name: String,
  phone: String,
  credits: Number,
  cashCredits: Number,
  extraCredits: Number,
  cashHistory: Array,
  extraHistory: Array,
  creditsHistory: Array,
  commissionBalance: Number,
  commissionHistory: Array
}, { collection: 'users', strict: false });

const User = mongoose.model('User', userSchema);

async function resetCreditsAndCommission() {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔄 RESET CREDITS & COMMISSION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find user by phone
    const user = await User.findOne({ phone: '7410169609' });

    if (!user) {
      console.log('❌ User not found with phone: 7410169609');
      console.log('   Please verify the phone number\n');
      process.exit(1);
    }

    console.log('👤 Found User:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Phone: ${user.phone}`);
    console.log(`   Area: ${user.pincode || 'Not set'}\n`);

    console.log('💰 BEFORE RESET:');
    console.log(`   Total Credits: ${(user.credits || 0).toLocaleString('en-IN')}`);
    console.log(`   Cash Credits: ${(user.cashCredits || 0).toLocaleString('en-IN')}`);
    console.log(`   Extra Credits: ${(user.extraCredits || 0).toLocaleString('en-IN')}`);
    console.log(`   Commission Balance: ${(user.commissionBalance || 0).toLocaleString('en-IN')}`);
    console.log(`   Credits History: ${(user.creditsHistory || []).length} entries`);
    console.log(`   Cash History: ${(user.cashHistory || []).length} entries`);
    console.log(`   Extra History: ${(user.extraHistory || []).length} entries`);
    console.log(`   Commission History: ${(user.commissionHistory || []).length} entries\n`);

    // Reset all credit and commission fields
    user.credits = 0;
    user.cashCredits = 0;
    user.extraCredits = 0;
    user.commissionBalance = 0;
    
    // Clear all histories
    user.cashHistory = [];
    user.extraHistory = [];
    user.creditsHistory = [];
    user.commissionHistory = [];

    await user.save();

    console.log('✅ CREDITS & COMMISSION RESET SUCCESSFUL!\n');

    console.log('💰 AFTER RESET:');
    console.log(`   Total Credits: ${user.credits}`);
    console.log(`   Cash Credits: ${user.cashCredits}`);
    console.log(`   Extra Credits: ${user.extraCredits}`);
    console.log(`   Commission Balance: ${user.commissionBalance}`);
    console.log(`   Credits History: ${user.creditsHistory.length} entries`);
    console.log(`   Cash History: ${user.cashHistory.length} entries`);
    console.log(`   Extra History: ${user.extraHistory.length} entries`);
    console.log(`   Commission History: ${user.commissionHistory.length} entries\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ RESET COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error resetting credits and commission:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

console.log('\n🚀 Starting reset in 2 seconds...');
console.log('⚠️  This will reset ALL credits and commission for user 7410169609\n');

setTimeout(() => {
  resetCreditsAndCommission();
}, 2000);
