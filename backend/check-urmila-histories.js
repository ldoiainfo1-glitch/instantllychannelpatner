const mongoose = require('mongoose');
const User = require('./api/models/User');

const MONGO_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner';

async function checkHistories() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const urmila = await User.findOne({ phone: '7410169609' }).select('name phone credits cashCredits extraCredits commissionBalance cashHistory extraHistory creditsHistory commissionHistory');

    if (!urmila) {
      console.log('❌ Urmila not found');
      return;
    }

    console.log(`👤 ${urmila.name} (${urmila.phone})`);
    console.log(`Credits: ${urmila.credits} (Cash: ${urmila.cashCredits}, Extra: ${urmila.extraCredits})`);
    console.log(`Commission Balance: ${urmila.commissionBalance || 0}\n`);

    console.log(`📋 cashHistory (${urmila.cashHistory?.length || 0} entries):`);
    if (urmila.cashHistory && urmila.cashHistory.length > 0) {
      urmila.cashHistory.forEach((entry, idx) => {
        console.log(`  ${idx + 1}. ${entry.type} | ₹${entry.amount} | Balance: ₹${entry.balance} | ${entry.description} | ${new Date(entry.date).toLocaleString('en-IN')}`);
      });
    } else {
      console.log('  No cash history');
    }

    console.log(`\n📋 creditsHistory (${urmila.creditsHistory?.length || 0} entries):`);
    if (urmila.creditsHistory && urmila.creditsHistory.length > 0) {
      urmila.creditsHistory.forEach((entry, idx) => {
        console.log(`  ${idx + 1}. ${entry.type} | ₹${entry.amount} | ${entry.description?.substring(0, 50)} | ${new Date(entry.date).toLocaleString('en-IN')}`);
      });
    } else {
      console.log('  No credits history');
    }

    console.log(`\n📋 commissionHistory (${urmila.commissionHistory?.length || 0} entries):`);
    if (urmila.commissionHistory && urmila.commissionHistory.length > 0) {
      urmila.commissionHistory.forEach((entry, idx) => {
        console.log(`  ${idx + 1}. ${entry.subType || 'unknown'} | ₹${entry.amount} | ${entry.percent}% | ${new Date(entry.date).toLocaleString('en-IN')}`);
      });
    } else {
      console.log('  No commission history');
    }

    await mongoose.disconnect();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
  }
  process.exit(0);
}

checkHistories();
