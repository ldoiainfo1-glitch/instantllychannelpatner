/**
 * Remove All Commissions Given by Urmila
 * 
 * This script will:
 * 1. Find all users who received commission from Urmila's ads
 * 2. Remove those commission entries from their commission history
 * 3. Deduct the commission amounts from their commission balances
 * 4. Delete commission distribution records for Urmila's ads
 */

const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner';

const userSchema = new mongoose.Schema({
  name: String,
  phone: String,
  commissionBalance: Number,
  commissionHistory: Array
}, { collection: 'users', strict: false });

const commissionDistributionSchema = new mongoose.Schema({}, { collection: 'commissiondistributions', strict: false });

const User = mongoose.model('User', userSchema);
const CommissionDistribution = mongoose.model('CommissionDistribution', commissionDistributionSchema);

async function removeUrmilaCommissions() {
  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧹 REMOVE COMMISSIONS GIVEN BY URMILA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const urmilaPhone = '7410169609';

    // Find all users who have commission entries from Urmila
    const allUsers = await User.find({
      'commissionHistory': {
        $elemMatch: {
          $or: [
            { uploaderName: /Urmila/i },
            { description: /Urmila/i }
          ]
        }
      }
    });

    console.log(`📊 Found ${allUsers.length} user(s) who received commission from Urmila\n`);

    let totalRemoved = 0;
    let totalAmountDeducted = 0;

    for (const user of allUsers) {
      console.log(`\n👤 Processing: ${user.name || user.phone}`);
      console.log(`   Current Balance: ₹${(user.commissionBalance || 0).toLocaleString('en-IN')}`);
      console.log(`   History Entries: ${(user.commissionHistory || []).length}`);

      // Find commission entries from Urmila
      const urmilaCommissions = (user.commissionHistory || []).filter(h => {
        const fromUrmila = 
          (h.uploaderName && h.uploaderName.toLowerCase().includes('urmila')) ||
          (h.description && h.description.toLowerCase().includes('urmila'));
        return h.type === 'credit' && fromUrmila;
      });

      if (urmilaCommissions.length === 0) {
        console.log('   ℹ️  No commission entries from Urmila found');
        continue;
      }

      // Calculate total to deduct
      const amountToDeduct = urmilaCommissions.reduce((sum, comm) => sum + (comm.amount || 0), 0);
      console.log(`\n   💰 Commission entries from Urmila: ${urmilaCommissions.length}`);
      console.log(`   💸 Total amount to deduct: ₹${amountToDeduct.toLocaleString('en-IN')}`);

      // Remove commission entries from Urmila
      user.commissionHistory = (user.commissionHistory || []).filter(h => {
        const fromUrmila = 
          (h.uploaderName && h.uploaderName.toLowerCase().includes('urmila')) ||
          (h.description && h.description.toLowerCase().includes('urmila'));
        return !(h.type === 'credit' && fromUrmila);
      });

      // Deduct from commission balance
      const oldBalance = user.commissionBalance || 0;
      user.commissionBalance = Math.max(0, oldBalance - amountToDeduct);

      await user.save();

      console.log(`   ✅ Updated: Balance ₹${oldBalance} → ₹${user.commissionBalance}`);
      console.log(`   ✅ Removed ${urmilaCommissions.length} commission entries`);

      totalRemoved += urmilaCommissions.length;
      totalAmountDeducted += amountToDeduct;
    }

    // Delete commission distribution records created by Urmila
    console.log('\n\n📋 Deleting commission distribution records...');
    const distributionResult = await CommissionDistribution.deleteMany({ 
      creatorPhone: urmilaPhone 
    });
    console.log(`✅ Deleted ${distributionResult.deletedCount} distribution record(s)\n`);

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`👥 Users affected: ${allUsers.length}`);
    console.log(`🗑️  Commission entries removed: ${totalRemoved}`);
    console.log(`💸 Total amount deducted: ₹${totalAmountDeducted.toLocaleString('en-IN')}`);
    console.log(`📋 Distribution records deleted: ${distributionResult.deletedCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✅ All commissions from Urmila have been removed!\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

console.log('\n🚀 Starting in 2 seconds...');
console.log('⚠️  This will remove ALL commissions given by Urmila (7410169609)\n');

setTimeout(() => {
  removeUrmilaCommissions();
}, 2000);
