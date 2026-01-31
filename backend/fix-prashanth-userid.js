const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner';

async function fixPrashanthUserId() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const applications = db.collection('applications');

    // Update Prashanth's application to point to correct userId
    const result = await applications.updateOne(
      { _id: new mongoose.Types.ObjectId('695dfd726b91673306783f02') },
      { $set: { userId: new mongoose.Types.ObjectId('697c936bfe72460e6e5e43cb') } }
    );

    console.log('🔧 Updating Prashanth Application userId...');
    console.log(`   Matched: ${result.matchedCount}`);
    console.log(`   Modified: ${result.modifiedCount}`);

    if (result.modifiedCount > 0) {
      console.log('\n✅ SUCCESS! Prashanth userId fixed!');
    } else if (result.matchedCount > 0) {
      console.log('\nℹ️  userId was already correct');
    } else {
      console.log('\n❌ Application not found');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

fixPrashanthUserId();
