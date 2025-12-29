/**
 * Validation Script: Check New Credit System Setup
 * 
 * This script validates that the new credit system is properly configured
 * and all components are working correctly.
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI;

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

async function validateSystem() {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 NEW CREDIT SYSTEM - VALIDATION CHECK');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ Database connected\n');

    // Test 1: Check schema
    console.log('📋 Test 1: Database Schema Check');
    const sampleUser = await User.findOne({});
    
    if (!sampleUser) {
      console.log('⚠️  No users found in database');
      console.log('   Create a user first or run migration\n');
    } else {
      console.log('✅ Sample user found:', sampleUser.name);
      
      const hasNewFields = 
        'cashCredits' in sampleUser || 
        'extraCredits' in sampleUser;
      
      if (hasNewFields) {
        console.log('✅ New credit fields detected');
        console.log(`   - cashCredits: ${sampleUser.cashCredits !== undefined ? '✓' : '✗'}`);
        console.log(`   - extraCredits: ${sampleUser.extraCredits !== undefined ? '✓' : '✗'}`);
        console.log(`   - cashHistory: ${Array.isArray(sampleUser.cashHistory) ? '✓' : '✗'}`);
        console.log(`   - extraHistory: ${Array.isArray(sampleUser.extraHistory) ? '✓' : '✗'}\n`);
      } else {
        console.log('❌ New credit fields NOT found');
        console.log('   Run migration: node migrate-to-new-credit-system.js\n');
      }
    }

    // Test 2: Check Dinky Singh
    console.log('📋 Test 2: Dinky Singh Account Check');
    const dinky = await User.findOne({ phone: '9833752025' });
    
    if (!dinky) {
      console.log('❌ Dinky Singh not found (9833752025)');
      console.log('   User might not exist yet\n');
    } else {
      console.log('✅ Dinky Singh found');
      console.log(`   Name: ${dinky.name}`);
      console.log(`   Total Credits: ${(dinky.credits || 0).toLocaleString('en-IN')}`);
      console.log(`   Cash Credits: ${(dinky.cashCredits || 0).toLocaleString('en-IN')}`);
      console.log(`   Extra Credits: ${(dinky.extraCredits || 0).toLocaleString('en-IN')}`);
      
      // Check if balance is correct
      const calculatedTotal = (dinky.cashCredits || 0) + (dinky.extraCredits || 0);
      const isBalanceCorrect = calculatedTotal === (dinky.credits || 0);
      
      if (isBalanceCorrect) {
        console.log('✅ Balance calculation correct (cash + extra = total)\n');
      } else {
        console.log('⚠️  Balance mismatch!');
        console.log(`   Cash + Extra = ${calculatedTotal.toLocaleString('en-IN')}`);
        console.log(`   Total = ${(dinky.credits || 0).toLocaleString('en-IN')}\n`);
      }
    }

    // Test 3: Migration status
    console.log('📋 Test 3: Migration Status');
    const totalUsers = await User.countDocuments({});
    const migratedUsers = await User.countDocuments({
      $or: [
        { cashCredits: { $exists: true } },
        { extraCredits: { $exists: true } }
      ]
    });
    
    console.log(`   Total Users: ${totalUsers}`);
    console.log(`   Migrated Users: ${migratedUsers}`);
    console.log(`   Pending: ${totalUsers - migratedUsers}`);
    
    if (migratedUsers === totalUsers && totalUsers > 0) {
      console.log('✅ All users migrated\n');
    } else if (migratedUsers > 0) {
      console.log('⚠️  Partial migration - run migration script\n');
    } else {
      console.log('❌ No users migrated - run migration script\n');
    }

    // Test 4: Sample transactions
    console.log('📋 Test 4: Transaction History Check');
    const usersWithHistory = await User.find({
      $or: [
        { 'cashHistory.0': { $exists: true } },
        { 'extraHistory.0': { $exists: true } }
      ]
    }).limit(3);
    
    if (usersWithHistory.length === 0) {
      console.log('❌ No transaction history found');
      console.log('   Give credits to a user to create history\n');
    } else {
      console.log(`✅ Found ${usersWithHistory.length} users with history`);
      usersWithHistory.forEach(u => {
        console.log(`   ${u.name}: ${u.cashHistory?.length || 0} cash + ${u.extraHistory?.length || 0} extra transactions`);
      });
      console.log('');
    }

    // Test 5: Validation summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 VALIDATION SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const checks = {
      schemaUpdated: hasNewFields,
      dinkyExists: !!dinky,
      migrationComplete: migratedUsers === totalUsers && totalUsers > 0,
      hasTransactions: usersWithHistory.length > 0
    };
    
    const passedChecks = Object.values(checks).filter(v => v).length;
    const totalChecks = Object.keys(checks).length;
    
    console.log(`\n✅ Passed: ${passedChecks}/${totalChecks} checks\n`);
    
    Object.entries(checks).forEach(([check, passed]) => {
      const emoji = passed ? '✅' : '❌';
      const label = check.replace(/([A-Z])/g, ' $1').trim();
      console.log(`${emoji} ${label.charAt(0).toUpperCase() + label.slice(1)}`);
    });
    
    console.log('');
    
    if (passedChecks === totalChecks) {
      console.log('🎉 SYSTEM READY! All checks passed.');
      console.log('   You can now test with Dinky Singh account.\n');
    } else {
      console.log('⚠️  ACTION REQUIRED:');
      if (!checks.schemaUpdated) {
        console.log('   1. Run migration: node migrate-to-new-credit-system.js');
      }
      if (!checks.dinkyExists) {
        console.log('   2. Create Dinky Singh account or use existing user');
      }
      if (!checks.hasTransactions) {
        console.log('   3. Test give credits: node test-dinky-credits.js');
      }
      console.log('');
    }

    // Next steps
    console.log('📋 Next Steps:');
    console.log('   1. Open Channel Partner Admin Dashboard');
    console.log('   2. Click "Give Credits" for any approved user');
    console.log('   3. Enter Amount Paid and Total Credits');
    console.log('   4. Login to user profile and check Credits tab');
    console.log('   5. Verify two tables are showing correctly\n');

  } catch (error) {
    console.error('❌ Validation error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed\n');
    process.exit(0);
  }
}

// Check if variables defined
let hasNewFields = false;

validateSystem();
