/**
 * Fix introducedCount for all users
 * This script counts how many approved applications have each user's phone as introducedBy
 * and updates their introducedCount accordingly
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./api/models/User');
const Application = require('./api/models/Application');

const MONGODB_URI = process.env.MONGODB_URI || 'your-mongodb-connection-string';

async function fixIntroducedCounts() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all users with phone numbers
    const users = await User.find({ phone: { $exists: true, $ne: null } }).select('phone name introducedCount').lean();
    console.log(`\n📋 Found ${users.length} users with phone numbers`);

    let updatedCount = 0;
    let unchangedCount = 0;

    for (const user of users) {
      // Count how many APPROVED applications have this user's phone as introducedBy
      const referralCount = await Application.countDocuments({
        introducedBy: user.phone,
        status: 'approved'
      });

      const currentCount = user.introducedCount || 0;

      if (referralCount !== currentCount) {
        // Update the user's introducedCount
        await User.updateOne(
          { _id: user._id },
          { $set: { introducedCount: referralCount } }
        );
        
        console.log(`✅ Updated ${user.name} (${user.phone}): ${currentCount} → ${referralCount}`);
        updatedCount++;
      } else {
        unchangedCount++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Updated: ${updatedCount} users`);
    console.log(`   ⏭️  Unchanged: ${unchangedCount} users`);
    console.log(`   📱 Total users processed: ${users.length}`);

    // Show top referrers
    console.log(`\n🏆 Top Referrers:`);
    const topReferrers = await User.find({ introducedCount: { $gt: 0 } })
      .select('name phone introducedCount')
      .sort({ introducedCount: -1 })
      .limit(10);

    topReferrers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} (${user.phone}): ${user.introducedCount} referrals`);
    });

    console.log('\n✅ Fix completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing introducedCount:', error);
    process.exit(1);
  }
}

fixIntroducedCounts();
