require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./api/models/User');

const MONGODB_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner';

async function checkCreditsBreakdown() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const phone = '7410169609'; // Urmila
    const user = await User.findOne({ phone });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('='.repeat(80));
    console.log(`USER: ${user.name} (${user.phone})`);
    console.log('='.repeat(80));
    console.log(`Total Credits: ${user.credits || 0}`);
    console.log(`Cash Credits: ${user.cashCredits || 0}`);
    console.log(`Extra Credits (Bonus): ${user.extraCredits || 0}`);
    console.log(`Commission Balance: ₹${user.commissionBalance || 0}`);
    console.log('='.repeat(80));

    console.log('\n📜 CASH HISTORY (cashHistory array):');
    if (user.cashHistory && user.cashHistory.length > 0) {
      user.cashHistory.forEach((entry, i) => {
        console.log(`\n[${i + 1}] ${entry.type.toUpperCase()}`);
        console.log(`    Amount: ${entry.amount}`);
        console.log(`    Balance: ${entry.balance}`);
        console.log(`    Description: ${entry.description}`);
        console.log(`    Date: ${entry.date}`);
      });
    } else {
      console.log('  (empty)');
    }

    console.log('\n📜 EXTRA HISTORY (extraHistory array):');
    if (user.extraHistory && user.extraHistory.length > 0) {
      user.extraHistory.forEach((entry, i) => {
        console.log(`\n[${i + 1}] ${entry.type.toUpperCase()}`);
        console.log(`    Amount: ${entry.amount}`);
        console.log(`    Balance: ${entry.balance}`);
        console.log(`    Description: ${entry.description}`);
        console.log(`    Date: ${entry.date}`);
      });
    } else {
      console.log('  (empty)');
    }

    console.log('\n📜 CREDITS HISTORY (creditsHistory array - legacy):');
    if (user.creditsHistory && user.creditsHistory.length > 0) {
      user.creditsHistory.forEach((entry, i) => {
        console.log(`\n[${i + 1}] ${entry.type.toUpperCase()}`);
        console.log(`    Amount: ${entry.amount}`);
        console.log(`    Description: ${entry.description}`);
        console.log(`    Date: ${entry.date}`);
      });
    } else {
      console.log('  (empty)');
    }

    console.log('\n📜 COMMISSION HISTORY (commissionHistory array):');
    if (user.commissionHistory && user.commissionHistory.length > 0) {
      user.commissionHistory.forEach((entry, i) => {
        console.log(`\n[${i + 1}] ${entry.type.toUpperCase()} ${entry.subType ? `(${entry.subType})` : ''}`);
        console.log(`    Amount: ${entry.amount}`);
        console.log(`    Balance: ${entry.balance}`);
        console.log(`    Percent: ${entry.percent || 'N/A'}%`);
        console.log(`    Level: ${entry.level || 'N/A'}`);
        console.log(`    Description: ${entry.description}`);
        console.log(`    Date: ${entry.date}`);
      });
    } else {
      console.log('  (empty)');
    }

    console.log('\n' + '='.repeat(80));
    console.log('ANALYSIS:');
    console.log('='.repeat(80));
    
    const cashHistoryTotal = (user.cashHistory || []).reduce((sum, entry) => 
      entry.type === 'credit' ? sum + entry.amount : sum - entry.amount, 0
    );
    const extraHistoryTotal = (user.extraHistory || []).reduce((sum, entry) => 
      entry.type === 'credit' ? sum + entry.amount : sum - entry.amount, 0
    );
    
    console.log(`Cash History Total: ${cashHistoryTotal}`);
    console.log(`Extra History Total: ${extraHistoryTotal}`);
    console.log(`Expected Total Credits: ${cashHistoryTotal + extraHistoryTotal}`);
    console.log(`Actual Total Credits: ${user.credits || 0}`);
    console.log(`Match: ${cashHistoryTotal + extraHistoryTotal === user.credits ? '✅ YES' : '❌ NO'}`);

    // Check if any entries had ONLY extra credits (no cash credits)
    console.log('\n🔍 Checking for credit entries with ONLY bonus credits (no cash credits):');
    let foundBonusOnlyEntries = false;
    if (user.creditsHistory && user.creditsHistory.length > 0) {
      user.creditsHistory.forEach((entry, i) => {
        const matchingCash = user.cashHistory.find(c => 
          Math.abs(c.date - entry.date) < 1000 && c.amount > 0
        );
        const matchingExtra = user.extraHistory.find(e => 
          Math.abs(e.date - entry.date) < 1000 && e.amount > 0
        );
        
        if (matchingExtra && !matchingCash) {
          console.log(`  ⚠️  Entry [${i + 1}]: ${entry.amount} total credits = 0 cash + ${matchingExtra.amount} bonus`);
          console.log(`      Description: ${entry.description}`);
          console.log(`      Date: ${entry.date}`);
          console.log(`      ❌ NO COMMISSION because cashCreditsToAdd = 0`);
          foundBonusOnlyEntries = true;
        }
      });
    }
    
    if (!foundBonusOnlyEntries) {
      console.log('  ✅ No bonus-only entries found. All entries should trigger commission.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkCreditsBreakdown();
