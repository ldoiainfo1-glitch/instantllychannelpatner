const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner';

const User = mongoose.model('User', new mongoose.Schema({}, { collection: 'users', strict: false }));

async function resetUrmilaComplete() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const user = await User.findOne({ phone: '7410169609' });
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    console.log('📊 BEFORE RESET:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Phone: ${user.phone}`);
    console.log(`   Total Credits: ₹${(user.credits || 0).toLocaleString('en-IN')}`);
    console.log(`   Cash Credits: ₹${(user.cashCredits || 0).toLocaleString('en-IN')}`);
    console.log(`   Extra Credits: ₹${(user.extraCredits || 0).toLocaleString('en-IN')}`);
    console.log(`   Commission Balance: ₹${(user.commissionBalance || 0).toLocaleString('en-IN')}`);

    // Reset everything to 0
    user.credits = 0;
    user.cashCredits = 0;
    user.extraCredits = 0;
    user.commissionBalance = 0;
    user.cashHistory = [];
    user.extraHistory = [];
    user.creditsHistory = [];
    user.commissionHistory = [];

    await user.save();

    // Verify by fetching again
    const verifyUser = await User.findOne({ phone: '7410169609' });

    console.log('\n✅ AFTER RESET (VERIFIED):');
    console.log(`   Total Credits: ₹${verifyUser.credits || 0}`);
    console.log(`   Cash Credits: ₹${verifyUser.cashCredits || 0}`);
    console.log(`   Extra Credits: ₹${verifyUser.extraCredits || 0}`);
    console.log(`   Commission Balance: ₹${verifyUser.commissionBalance || 0}`);
    console.log(`   Cash History: ${(verifyUser.cashHistory || []).length} entries`);
    console.log(`   Extra History: ${(verifyUser.extraHistory || []).length} entries`);
    console.log(`   Commission History: ${(verifyUser.commissionHistory || []).length} entries`);
    
    console.log('\n✅ All credits and commission reset to 0 and verified!');
    console.log('🔄 User should logout/login again or clear browser cache');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

resetUrmilaComplete();
