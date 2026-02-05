const mongoose = require('mongoose');

const User = require('./api/models/User');
const CommissionDistribution = require('./api/models/CommissionDistribution');

const MONGO_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner';

async function clearCommissionsAndCredits() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find Urmila and other users who received commissions/credits
    const users = await User.find({
      $or: [
        { commissionHistory: { $exists: true, $ne: [] } },
        { commissionBalance: { $gt: 0 } },
        { credits: { $gt: 0 } },
        { cashCredits: { $gt: 0 } },
        { extraCredits: { $gt: 0 } }
      ]
    }).select('name phone credits cashCredits extraCredits commissionBalance commissionHistory creditsHistory cashCreditsHistory extraCreditsHistory');

    console.log(`\n📋 Found ${users.length} users with commissions/credits:\n`);
    
    for (const user of users) {
      console.log(`👤 ${user.name} (${user.phone})`);
      console.log(`   Credits: ${user.credits || 0} (Cash: ${user.cashCredits || 0}, Extra: ${user.extraCredits || 0})`);
      console.log(`   Commission Balance: ${user.commissionBalance || 0}`);
      console.log(`   Commission History: ${user.commissionHistory?.length || 0} entries`);
      console.log(`   Credits History: ${user.creditsHistory?.length || 0} entries`);
    }

    console.log('\n⚠️  This will CLEAR ALL:');
    console.log('   - Credits (credits, cashCredits, extraCredits)');
    console.log('   - Commission balances and history');
    console.log('   - Credits history (creditsHistory, cashCreditsHistory, extraCreditsHistory)');
    console.log('   - All CommissionDistribution records');

    // Wait for user confirmation
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('\n❓ Type "YES" to proceed with cleanup: ', async (answer) => {
      if (answer.trim().toUpperCase() === 'YES') {
        console.log('\n🧹 Starting cleanup...\n');

        // Clear all users' data
        const updateResult = await User.updateMany(
          {},
          {
            $set: {
              credits: 0,
              cashCredits: 0,
              extraCredits: 0,
              commissionBalance: 0,
              commissionHistory: [],
              creditsHistory: [],
              cashCreditsHistory: [],
              extraCreditsHistory: []
            }
          }
        );

        console.log(`✅ Updated ${updateResult.modifiedCount} users`);

        // Delete all commission distribution records
        const deleteResult = await CommissionDistribution.deleteMany({});
        console.log(`✅ Deleted ${deleteResult.deletedCount} commission distribution records`);

        console.log('\n🎉 Cleanup complete! All commissions and credits cleared.');
        console.log('💡 You can now test the new commission rules from a clean state.');

      } else {
        console.log('\n❌ Cleanup cancelled.');
      }

      rl.close();
      await mongoose.disconnect();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

clearCommissionsAndCredits();
