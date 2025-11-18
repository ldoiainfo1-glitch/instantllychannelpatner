const mongoose = require('mongoose');
require('dotenv').config();

const userSchema = new mongoose.Schema({
  name: String,
  phone: String,
  credits: Number,
  hasReceivedInitialCredits: Boolean,
  introducedBy: String,
  introducedCount: Number,
  creditsHistory: Array,
  personCode: String,
  createdAt: Date
}, { strict: false });

const User = mongoose.model('User', userSchema);

async function migrateCredits() {
  try {
    console.log('🚀 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Find all users
    const users = await User.find({});
    console.log(`\n📊 Found ${users.length} total users`);

    let updatedCount = 0;
    let alreadyCorrectCount = 0;
    let errors = [];

    for (const user of users) {
      try {
        const oldCredits = user.credits || 0;
        
        // Check if user already has 500,000 or more credits
        if (oldCredits >= 500000) {
          console.log(`✅ ${user.name} (${user.phone}) already has ${oldCredits.toLocaleString()} credits - skipping`);
          alreadyCorrectCount++;
          continue;
        }

        // Calculate new credits based on old system
        let newCredits = 500000; // Base joining bonus
        let bonusFromReferrals = 0;

        // If user has introduced people, calculate their referral bonuses
        // Old system: 1200 per referral → New system: 100,000 per referral
        if (user.introducedCount && user.introducedCount > 0) {
          // Calculate how many of their current credits came from referrals (old system)
          // Base was 1200, each referral was 1200
          const oldReferralCredits = user.introducedCount * 1200;
          
          // New referral bonus calculation
          bonusFromReferrals = user.introducedCount * 100000;
          
          console.log(`👥 ${user.name} has ${user.introducedCount} referrals`);
          console.log(`   Old referral credits: ${oldReferralCredits.toLocaleString()}`);
          console.log(`   New referral credits: ${bonusFromReferrals.toLocaleString()}`);
        }

        // Total new credits = 500,000 base + referral bonuses
        newCredits = 500000 + bonusFromReferrals;

        console.log(`\n💰 Updating ${user.name} (${user.phone})`);
        console.log(`   Old credits: ${oldCredits.toLocaleString()}`);
        console.log(`   New credits: ${newCredits.toLocaleString()}`);
        console.log(`   Increase: +${(newCredits - oldCredits).toLocaleString()}`);

        // Update user
        user.credits = newCredits;
        user.hasReceivedInitialCredits = true;

        // Add migration entry to credits history
        if (!user.creditsHistory) user.creditsHistory = [];
        user.creditsHistory.push({
          type: 'bonus',
          amount: newCredits - oldCredits,
          description: `Credit system migration - upgraded to 5 lacs base + ${user.introducedCount || 0} × 1 lac referral bonus`,
          date: new Date()
        });

        await user.save();
        updatedCount++;
        console.log(`✅ Updated successfully`);

      } catch (error) {
        console.error(`❌ Error updating user ${user.name}:`, error.message);
        errors.push({ user: user.name, phone: user.phone, error: error.message });
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully updated: ${updatedCount} users`);
    console.log(`✓  Already correct: ${alreadyCorrectCount} users`);
    console.log(`❌ Errors: ${errors.length}`);
    console.log(`📈 Total processed: ${users.length} users`);
    
    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      errors.forEach(e => console.log(`   - ${e.user} (${e.phone}): ${e.error}`));
    }

    // Calculate total credits in system
    const allUsers = await User.find({});
    const totalCredits = allUsers.reduce((sum, u) => sum + (u.credits || 0), 0);
    console.log(`\n💎 Total credits in system: ${totalCredits.toLocaleString()}`);
    console.log(`💰 Average per user: ${Math.round(totalCredits / allUsers.length).toLocaleString()}`);

    await mongoose.disconnect();
    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
console.log('🔄 Starting credit system migration...');
console.log('📝 Upgrading from 1,200 base + 1,200/referral');
console.log('📝 To: 5,00,000 base + 1,00,000/referral\n');

migrateCredits();
