const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner';

async function forceResetUrmila() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    const before = await usersCollection.findOne({ phone: '7410169609' });
    console.log('📊 BEFORE:');
    console.log(`   Total Credits: ${before.credits || 0}`);
    console.log(`   Cash Credits: ${before.cashCredits || 0}`);
    console.log(`   Extra Credits: ${before.extraCredits || 0}`);
    console.log(`   Commission Balance: ${before.commissionBalance || 0}`);

    // Direct MongoDB update
    const result = await usersCollection.updateOne(
      { phone: '7410169609' },
      { 
        $set: { 
          credits: 0,
          cashCredits: 0,
          extraCredits: 0,
          commissionBalance: 0,
          cashHistory: [],
          extraHistory: [],
          creditsHistory: [],
          commissionHistory: []
        } 
      }
    );

    console.log(`\n✅ Update result: ${result.modifiedCount} document(s) modified`);

    const after = await usersCollection.findOne({ phone: '7410169609' });
    console.log('\n📊 AFTER (VERIFIED):');
    console.log(`   Total Credits: ${after.credits || 0}`);
    console.log(`   Cash Credits: ${after.cashCredits || 0}`);
    console.log(`   Extra Credits: ${after.extraCredits || 0}`);
    console.log(`   Commission Balance: ${after.commissionBalance || 0}`);
    console.log(`   Cash History: ${(after.cashHistory || []).length} entries`);
    console.log(`   Extra History: ${(after.extraHistory || []).length} entries`);
    console.log(`   Commission History: ${(after.commissionHistory || []).length} entries`);

    console.log('\n✅ COMPLETE! All credits reset to 0');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

forceResetUrmila();
