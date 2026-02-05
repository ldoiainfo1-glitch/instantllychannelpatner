const mongoose = require('mongoose');
const User = require('./api/models/User');
const CommissionDistribution = require('./api/models/CommissionDistribution');

const MONGODB_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner';

async function clearUrmilaCommission() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find Urmila
    const urmila = await User.findOne({ phone: '7410169609' });
    if (!urmila) {
      console.log('❌ Urmila not found');
      return;
    }

    console.log('Before clearing:');
    console.log(`  Credits: ${urmila.credits}`);
    console.log(`  Cash Credits: ${urmila.cashCredits}`);
    console.log(`  Commission History: ${urmila.commissionHistory?.length || 0} entries`);
    console.log(`  Cash History: ${urmila.cashHistory?.length || 0} entries`);

    // Remove commission from cashCredits
    const commissionTotal = 240 + 480; // Two commission entries
    urmila.cashCredits = (urmila.cashCredits || 0) - commissionTotal;
    urmila.credits = urmila.cashCredits + (urmila.extraCredits || 0);

    // Remove commission entries from commissionHistory
    urmila.commissionHistory = urmila.commissionHistory.filter(entry => 
      entry.subType !== 'self'
    );

    // Remove commission entries from cashHistory (if any)
    const cashHistoryBefore = urmila.cashHistory?.length || 0;
    urmila.cashHistory = (urmila.cashHistory || []).filter(entry => 
      !entry.description?.includes('Commission')
    );
    const cashHistoryAfter = urmila.cashHistory?.length || 0;

    await urmila.save();

    // Also clear Prashanth's commission
    const prashanth = await User.findOne({ phone: '9742067525' });
    if (prashanth) {
      console.log('\nPrashanth before:');
      console.log(`  Commission Balance: ₹${prashanth.commissionBalance || 0}`);
      
      prashanth.commissionBalance = 0;
      prashanth.commissionHistory = prashanth.commissionHistory.filter(entry =>
        !entry.uploaderName?.includes('Urmila')
      );
      await prashanth.save();
      console.log('  Cleared Prashanth commission');
    }

    // Delete commission distribution records
    const deleted = await CommissionDistribution.deleteMany({ 
      creatorPhone: '7410169609' 
    });

    console.log('\n✅ Cleared:');
    console.log(`  Urmila's new credits: ${urmila.credits}`);
    console.log(`  Urmila's new cash credits: ${urmila.cashCredits}`);
    console.log(`  Removed ${cashHistoryBefore - cashHistoryAfter} cash history entries`);
    console.log(`  Deleted ${deleted.deletedCount} commission distribution records`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected');
  }
}

clearUrmilaCommission();
