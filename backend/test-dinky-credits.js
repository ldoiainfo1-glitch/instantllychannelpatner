/**
 * Test Script: Give Credits to Dinky Singh
 * 
 * This script helps test the new credit system by giving credits to Dinky Singh
 * Phone: 9833752025
 * Position: pos_president_india
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI;

const userSchema = new mongoose.Schema({
  name: String,
  phone: String,
  credits: Number,
  cashCredits: Number,
  extraCredits: Number,
  cashHistory: Array,
  extraHistory: Array,
  creditsHistory: Array
}, { collection: 'users', strict: false });

const User = mongoose.model('User', userSchema);

async function testGiveCredits() {
  try {
    console.log('🧪 Testing New Credit System with Dinky Singh\n');
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find Dinky Singh
    const dinky = await User.findOne({ phone: '9833752025' });
    
    if (!dinky) {
      console.log('❌ Dinky Singh not found with phone 9833752025');
      console.log('📋 Searching for similar users...\n');
      
      const similarUsers = await User.find({
        phone: { $regex: '9833752025', $options: 'i' }
      });
      
      if (similarUsers.length > 0) {
        console.log('Found users:');
        similarUsers.forEach(u => {
          console.log(`  - ${u.name} (${u.phone})`);
        });
      }
      
      process.exit(1);
    }

    console.log('👤 Found User:');
    console.log(`   Name: ${dinky.name}`);
    console.log(`   Phone: ${dinky.phone}\n`);

    console.log('💰 Current Credits:');
    console.log(`   Total: ${(dinky.credits || 0).toLocaleString('en-IN')}`);
    console.log(`   Cash: ${(dinky.cashCredits || 0).toLocaleString('en-IN')}`);
    console.log(`   Extra: ${(dinky.extraCredits || 0).toLocaleString('en-IN')}\n`);

    // Test Scenario: Give 100,000 total credits with 25,000 cash
    const amountPaid = 25000;
    const totalCredits = 100000;
    const extraCreditsToAdd = totalCredits - amountPaid;

    console.log('🎁 Giving Credits:');
    console.log(`   Amount Paid: ₹${amountPaid.toLocaleString('en-IN')}`);
    console.log(`   Total Credits: ${totalCredits.toLocaleString('en-IN')}`);
    console.log(`   Cash Credits: ${amountPaid.toLocaleString('en-IN')}`);
    console.log(`   Extra Credits: ${extraCreditsToAdd.toLocaleString('en-IN')}\n`);

    // Update credits
    dinky.cashCredits = (dinky.cashCredits || 0) + amountPaid;
    dinky.extraCredits = (dinky.extraCredits || 0) + extraCreditsToAdd;
    dinky.credits = dinky.cashCredits + dinky.extraCredits;

    // Initialize arrays if needed
    if (!dinky.cashHistory) dinky.cashHistory = [];
    if (!dinky.extraHistory) dinky.extraHistory = [];
    if (!dinky.creditsHistory) dinky.creditsHistory = [];

    // Add to cash history
    dinky.cashHistory.push({
      type: 'credit',
      amount: amountPaid,
      balance: dinky.cashCredits,
      description: `Test: Admin added ₹${amountPaid.toLocaleString('en-IN')}`,
      date: new Date()
    });

    // Add to extra history
    dinky.extraHistory.push({
      type: 'credit',
      amount: extraCreditsToAdd,
      balance: dinky.extraCredits,
      description: `Test: Admin added ${extraCreditsToAdd.toLocaleString('en-IN')} bonus credits`,
      date: new Date()
    });

    // Add to legacy history
    dinky.creditsHistory.push({
      type: 'bonus',
      amount: totalCredits,
      description: `Test: Admin gave ${totalCredits.toLocaleString('en-IN')} credits (₹${amountPaid.toLocaleString('en-IN')} paid + ${extraCreditsToAdd.toLocaleString('en-IN')} bonus)`,
      date: new Date()
    });

    await dinky.save();

    console.log('✅ Credits Added Successfully!\n');

    console.log('💰 New Balance:');
    console.log(`   Total: ${dinky.credits.toLocaleString('en-IN')}`);
    console.log(`   Cash: ${dinky.cashCredits.toLocaleString('en-IN')}`);
    console.log(`   Extra: ${dinky.extraCredits.toLocaleString('en-IN')}\n`);

    console.log('📊 Transaction History:');
    console.log(`   Cash Transactions: ${dinky.cashHistory.length}`);
    console.log(`   Extra Transactions: ${dinky.extraHistory.length}`);
    console.log(`   Total Transactions: ${dinky.creditsHistory.length}\n`);

    console.log('🎉 Test completed successfully!');
    console.log('\n📱 Next Steps:');
    console.log('   1. Login to Channel Partner portal with phone: 9833752025');
    console.log('   2. Go to Profile → Credits Tab');
    console.log('   3. Verify two tables are visible');
    console.log('   4. Check balances match above');
    console.log('   5. Try creating an ad to test deduction\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

testGiveCredits();
