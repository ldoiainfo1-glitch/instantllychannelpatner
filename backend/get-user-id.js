const mongoose = require('mongoose');
const User = require('./api/models/User');

const MONGODB_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner';

async function getUserId() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const phone = '7410169609'; // Urmila
    const user = await User.findOne({ phone });

    if (!user) {
      console.log('❌ User not found');
    } else {
      console.log('User ID:', user._id.toString());
      console.log('Name:', user.name);
      console.log('Phone:', user.phone);
      console.log('Credits:', user.credits);
      console.log('Cash Credits:', user.cashCredits);
      console.log('Commission Balance:', user.commissionBalance || 0);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

getUserId();
