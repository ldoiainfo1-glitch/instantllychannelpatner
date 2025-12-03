const mongoose = require('mongoose');

// This is the MongoDB connection from Channel Partner backend
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://rajeshmodi:Newpass1234@cluster0.9yfi96i.mongodb.net/channelpartner?retryWrites=true&w=majority&appName=Cluster0';

async function testCrossDB() {
  try {
    console.log('🔌 Connecting to Channel Partner database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to:', mongoose.connection.name);

    // Try to access instantlly database
    console.log('\n🔄 Switching to instantlly database...');
    const instantllyDB = mongoose.connection.useDb('instantlly');
    console.log('✅ Switched to instantlly database');

    // Count users
    const userCount = await instantllyDB.db.collection('users').countDocuments();
    console.log(`📊 Total users in instantlly: ${userCount}`);

    // Search for 88
    const users88 = await instantllyDB.db.collection('users')
      .find({ phone: { $regex: '^88|^\\+9188', $options: 'i' } })
      .limit(10)
      .project({ phone: 1, name: 1, credits: 1 })
      .toArray();

    console.log(`\n🔍 Users matching "88" pattern: ${users88.length}`);
    users88.forEach(u => console.log(`  - ${u.name}: ${u.phone} (${u.credits} cr)`));

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCrossDB();
