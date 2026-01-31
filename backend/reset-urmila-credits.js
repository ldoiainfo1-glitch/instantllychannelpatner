const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner';

const User = mongoose.model('User', new mongoose.Schema({}, { collection: 'users', strict: false }));

async function resetUrmilaCredits() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const user = await User.findOne({ phone: '7410169609' });
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    console.log('📊 BEFORE:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Phone: ${user.phone}`);
    console.log(`   Total Credits: ₹${(user.credits || 0).toLocaleString('en-IN')}`);
    console.log(`   Cash Credits: ₹${(user.cashCredits || 0).toLocaleString('en-IN')}`);
    console.log(`   Extra Credits: ₹${(user.extraCredits || 0).toLocaleString('en-IN')}`);
    console.log(`   Commission Balance: ₹${(user.commissionBalance || 0).toLocaleString('en-IN')}`);
    console.log(`   Cash History: ${(user.cashHistory || []).length} entries`);
    console.log(`   Extra History: ${(user.extraHistory || []).length} entries`);

    user.credits = 0;
    user.cashCredits = 0;
    user.extraCredits = 0;
    user.cashHistory = [];
    user.extraHistory = [];
    user.creditsHistory = [];

    await user.save();

    console.log('\n✅ AFTER:');
    console.log(`   Total Credits: ₹${user.credits}`);
    console.log(`   Cash Credits: ₹${user.cashCredits}`);
    console.log(`   Extra Credits: ₹${user.extraCredits}`);
    console.log(`   Cash History: ${user.cashHistory.length} entries`);
    console.log(`   Extra History: ${user.extraHistory.length} entries`);
    console.log('\n✅ Urmila\'s credits reset to 0');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

resetUrmilaCredits();
