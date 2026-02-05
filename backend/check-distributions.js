const mongoose = require('mongoose');
const CommissionDistribution = require('./api/models/CommissionDistribution');

const MONGODB_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner';

async function checkDistributions() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const distributions = await CommissionDistribution.find({ 
      creatorPhone: '7410169609' 
    }).sort({ distributionDate: -1 });

    console.log(`Found ${distributions.length} distribution record(s) for Urmila\n`);
    console.log('='.repeat(80));

    distributions.forEach((dist, i) => {
      console.log(`\n[${i + 1}] Distribution Record`);
      console.log(`  Creator: ${dist.creatorName} (${dist.creatorPhone})`);
      console.log(`  Amount: ₹${dist.adAmount}`);
      console.log(`  Date: ${dist.distributionDate}`);
      console.log(`  Total Distributed: ₹${dist.totalDistributed}`);
      console.log(`  Filled Positions: ${dist.filledPositions}`);
      console.log(`  Empty Positions: ${dist.emptyPositions}`);
      
      console.log(`\n  Self Commission:`);
      console.log(`    Paid: ${dist.selfCommission.paid}`);
      console.log(`    Amount: ₹${dist.selfCommission.amount}`);
      console.log(`    Percent: ${dist.selfCommission.percent}%`);
      
      console.log(`\n  Hierarchy Path:`);
      dist.hierarchyPath.forEach((path, j) => {
        if (path.status === 'self') {
          console.log(`    ${j + 1}. ${path.level.toUpperCase()} (${path.location}) - SELF`);
          console.log(`       ${path.holder} (${path.holderPhone})`);
          console.log(`       Commission: ₹${path.commission} (${path.percent}%)`);
        } else if (path.status === 'filled') {
          console.log(`    ${j + 1}. ${path.level.toUpperCase()} (${path.location}) - FILLED`);
          console.log(`       ${path.holder} (${path.holderPhone})`);
          console.log(`       Commission: ₹${path.commission} (${path.percent}%)`);
          console.log(`       Sequential Position: #${path.sequentialPosition}`);
        } else {
          console.log(`    ${j + 1}. ${path.level.toUpperCase()} (${path.location}) - EMPTY`);
        }
      });
      
      console.log('\n' + '='.repeat(80));
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkDistributions();
