/**
 * Migration Script: Convert Existing Users to New Credit System
 * 
 * This script migrates existing users from the old single-credit system
 * to the new dual-credit system (cash + extra credits).
 * 
 * ⚠️ IMPORTANT: This is for EXISTING users with OLD credits only!
 * 
 * DEFAULT BEHAVIOR (for old credits we don't have payment records for):
 * - Option 1: Split 50/50 (cashCredits = 50%, extraCredits = 50%)
 * - Option 2: All as Extra (cashCredits = 0, extraCredits = 100%)
 * 
 * AFTER MIGRATION:
 * - Use Admin Dashboard to give NEW credits properly
 * - Admin Dashboard works correctly: Amount Paid → Cash, Remaining → Extra
 * - Example: ₹30,000 paid + 200,000 total = 30K cash + 170K extra ✓
 * 
 * Choose your migration strategy below by uncommenting one option.
 * Run this script ONCE after deploying the new system.
 */

// ═══════════════════════════════════════════════════════════
// MIGRATION STRATEGY - Choose ONE (uncomment your choice)
// ═══════════════════════════════════════════════════════════

// Option 1: Split existing credits 50/50 (Conservative - reasonable assumption)
const MIGRATION_STRATEGY = 'SPLIT_50_50';

// Option 2: All existing credits as EXTRA (Assumes they were all bonus)
// const MIGRATION_STRATEGY = 'ALL_EXTRA';

// Option 3: All existing credits as CASH (Assumes they all paid)
// const MIGRATION_STRATEGY = 'ALL_CASH';

// ═══════════════════════════════════════════════════════════

const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB Connection
const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

// User Schema with new credit system
const userSchema = new mongoose.Schema({
  name: String,
  phone: String,
  credits: Number,
  cashCredits: Number,
  extraCredits: Number,
  cashHistory: Array,
  extraHistory: Array,
  creditsHistory: Array
}, { collection: 'users', strict: false });

const User = mongoose.model('User', userSchema);

async function migrateToNewCreditSystem() {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 NEW CREDIT SYSTEM MIGRATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all users
    const allUsers = await User.find({});
    console.log(`📊 Total users found: ${allUsers.length}\n`);

    let migratedCount = 0;
    let alreadyMigratedCount = 0;
    let zeroCreditsCount = 0;

    console.log('🔄 Starting migration...\n');

    for (const user of allUsers) {
      try {
        // Check if user already migrated (has cashCredits or extraCredits defined)
        if (user.cashCredits !== undefined || user.extraCredits !== undefined) {
          console.log(`⏭️  ${user.name} (${user.phone}) - Already migrated`);
          alreadyMigratedCount++;
          continue;
        }

        const currentCredits = user.credits || 0;

        // Users with zero credits - initialize fields only
        if (currentCredits === 0) {
          user.cashCredits = 0;
          user.extraCredits = 0;
          user.cashHistory = [];
          user.extraHistory = [];
          if (!user.creditsHistory) user.creditsHistory = [];
          
          await user.save();
          zeroCreditsCount++;
          console.log(`✅ ${user.name} (${user.phone}) - Initialized (0 credits)`);
          continue;
        }

        // Users with existing credits - apply migration strategy
        let cashCredits = 0;
        let extraCredits = 0;
        let strategyDescription = '';

        switch (MIGRATION_STRATEGY) {
          case 'SPLIT_50_50':
            cashCredits = Math.floor(currentCredits / 2);
            extraCredits = currentCredits - cashCredits;
            strategyDescription = '50/50 split';
            break;
          
          case 'ALL_EXTRA':
            cashCredits = 0;
            extraCredits = currentCredits;
            strategyDescription = 'all as extra credits';
            break;
          
          case 'ALL_CASH':
            cashCredits = currentCredits;
            extraCredits = 0;
            strategyDescription = 'all as cash credits';
            break;
          
          default:
            cashCredits = Math.floor(currentCredits / 2);
            extraCredits = currentCredits - cashCredits;
            strategyDescription = '50/50 split (default)';
        }

        user.cashCredits = cashCredits;
        user.extraCredits = extraCredits;

        // Initialize history arrays
        if (cashCredits > 0) {
          user.cashHistory = [{
            type: 'credit',
            amount: cashCredits,
            balance: cashCredits,
            description: `Migration: Converted ${currentCredits.toLocaleString('en-IN')} old credits (${strategyDescription})`,
            date: new Date()
          }];
        } else {
          user.cashHistory = [];
        }

        if (extraCredits > 0) {
          user.extraHistory = [{
            type: 'credit',
            amount: extraCredits,
            balance: extraCredits,
            description: `Migration: Converted ${currentCredits.toLocaleString('en-IN')} old credits (${strategyDescription})`,
            date: new Date()
          }];
        } else {
          user.extraHistory = [];
        }

        // Keep existing creditsHistory and add migration entry
        if (!user.creditsHistory) user.creditsHistory = [];
        user.creditsHistory.push({
          type: 'bonus',
          amount: 0,
          description: `System migration: ${currentCredits.toLocaleString('en-IN')} credits → ${cashCredits.toLocaleString('en-IN')} cash + ${extraCredits.toLocaleString('en-IN')} extra (${strategyDescription})`,
          date: new Date()
        });

        await user.save();
        migratedCount++;

        console.log(`✅ ${user.name} (${user.phone})`);
        console.log(`   Old: ${currentCredits.toLocaleString('en-IN')} total`);
        console.log(`   New: ${cashCredits.toLocaleString('en-IN')} cash + ${extraCredits.toLocaleString('en-IN')} extra (${strategyDescription})\n`);

      } catch (error) {
        console.error(`❌ Error migrating user ${user.name}:`, error.message);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 MIGRATION SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Migrated: ${migratedCount} users`);
    console.log(`⏭️  Already migrated: ${alreadyMigratedCount} users`);
    console.log(`0️⃣  Zero credits: ${zeroCreditsCount} users`);
    console.log(`📊 Total processed: ${allUsers.length} users\n`);

    // Verify migration
    console.log('🔍 Verifying migration...\n');
    const verifyUsers = await User.find({}).limit(5);
    
    console.log('Sample users after migration:');
    verifyUsers.forEach(u => {
      console.log(`   ${u.name || 'No name'} (${u.phone})`);
      console.log(`   Total: ${u.credits}, Cash: ${u.cashCredits}, Extra: ${u.extraCredits}`);
    });

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the migration
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('⚠️  IMPORTANT NOTES:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('1. This migration is for OLD credits only (existing users)');
console.log('2. After migration, use Admin Dashboard for NEW credits');
console.log('3. Admin Dashboard works correctly:');
console.log('   - Amount Paid: ₹30,000 → Cash Credits: 30,000');
console.log('   - Total Credits: 200,000 → Extra Credits: 170,000');
console.log(`4. Migration Strategy: ${MIGRATION_STRATEGY}`);
console.log('5. Make sure you have a database backup!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Add a 3-second delay to allow user to cancel
setTimeout(() => {
  migrateToNewCreditSystem();
}, 3000);

console.log('Starting migration in 3 seconds... (Press Ctrl+C to cancel)\n');
