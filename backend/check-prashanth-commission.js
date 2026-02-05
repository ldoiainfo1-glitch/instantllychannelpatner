const mongoose = require('mongoose');
const User = require('./api/models/User');

const MONGODB_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner';

async function checkPrashanth() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const phone = '9742067525'; // Prashanth
    const user = await User.findOne({ phone });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('='.repeat(80));
    console.log(`USER: ${user.name} (${user.phone})`);
    console.log('='.repeat(80));
    console.log(`Commission Balance: ₹${user.commissionBalance || 0} (WITHDRAWABLE)`);
    console.log('='.repeat(80));

    console.log('\n📜 COMMISSION HISTORY:');
    if (user.commissionHistory && user.commissionHistory.length > 0) {
      user.commissionHistory.forEach((entry, i) => {
        console.log(`\n[${i + 1}] ${entry.type.toUpperCase()} ${entry.subType ? `(${entry.subType})` : ''}`);
        console.log(`    Amount: ₹${entry.amount}`);
        console.log(`    Balance: ₹${entry.balance}`);
        console.log(`    Percent: ${entry.percent || 'N/A'}%`);
        console.log(`    Level: ${entry.level || 'N/A'}`);
        console.log(`    Position: ${entry.positionLevel || 'N/A'}`);
        console.log(`    Location: ${entry.positionLocation || 'N/A'}`);
        console.log(`    Description: ${entry.description}`);
        console.log(`    Date: ${entry.date}`);
      });
    } else {
      console.log('  (empty)');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkPrashanth();
