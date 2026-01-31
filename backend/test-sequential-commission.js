/**
 * Test Sequential Commission Distribution
 * 
 * Tests the new logic where filled parents get percentages in sequence:
 * - Self (Pincode): 20%
 * - Parent #1 (First filled): 10%
 * - Parent #2 (Second filled): 5%
 * - Parent #3 (Third filled): 2.5%
 * - etc.
 */

const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner';

async function testSequentialCommission() {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 TEST: SEQUENTIAL COMMISSION DISTRIBUTION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const Application = mongoose.model('Application', new mongoose.Schema({}, { collection: 'applications', strict: false }));
    const User = mongoose.model('User', new mongoose.Schema({}, { collection: 'users', strict: false }));

    // Find Urmila's application
    const urmilaApp = await Application.findOne({
      'applicantInfo.phone': '7410169609',
      status: 'approved'
    }).lean();

    if (!urmilaApp) {
      console.log('❌ Urmila application not found');
      process.exit(1);
    }

    const hierarchy = {
      pincode: urmilaApp.applicantInfo?.pincode,
      tehsil: urmilaApp.applicantInfo?.tehsil,
      district: urmilaApp.applicantInfo?.district,
      division: urmilaApp.applicantInfo?.division,
      state: urmilaApp.applicantInfo?.state,
      zone: urmilaApp.applicantInfo?.zone,
      country: urmilaApp.applicantInfo?.country || 'India'
    };

    console.log('📍 URMILA\'S HIERARCHY:');
    Object.entries(hierarchy).forEach(([key, value]) => {
      console.log(`   ${key}: ${value || 'Not set'}`);
    });
    console.log('');

    const AD_COST = 1200;
    const levelShares = [
      { levelName: 'pincode', percent: 20, label: 'Pincode' },
      { levelName: 'tehsil', label: 'Tehsil' },
      { levelName: 'district', label: 'District' },
      { levelName: 'division', label: 'Division' },
      { levelName: 'state', label: 'State' },
      { levelName: 'zone', label: 'Zone' },
      { levelName: 'country', label: 'India' }
    ];
    
    const parentPercentages = [10, 5, 2.5, 1.25, 0.6, 0.3];

    // Helper function
    const findLevelHolder = async (levelName, excludePhone = null) => {
      let query = { status: 'approved' };
      if (excludePhone) {
        query['applicantInfo.phone'] = { $ne: excludePhone };
      }
      
      const token = hierarchy[levelName];
      if (token && levelName !== 'country') {
        const flexToken = String(token).trim().toLowerCase().replace(/[^a-z0-9]+/g, '[-_\\s]*');
        const levelFlex = levelName.replace(/\s+/g, '[-_\\s]*');
        // MUST contain both: level-head AND location token
        query.positionId = { $regex: new RegExp(`${levelFlex}[-_\\s]*head.*${flexToken}`, 'i') };
      } else if (levelName === 'country') {
        query.positionId = { $regex: /president|india[-_\s]*head/i };
      }

      let app = await Application.findOne(query).lean();
      if (app) return { app, paidLevel: levelName };

      // NO FALLBACK - position must be explicitly in positionId
      // NO REALLOCATION - if position is empty, return null
      return null;
    };

    // Self commission
    console.log('💰 COMMISSION CALCULATION:\n');
    console.log('1️⃣ SELF (Pincode - Urmila):');
    console.log(`   Percentage: 20%`);
    console.log(`   Amount: ₹${(AD_COST * 0.20).toFixed(2)}`);
    console.log(`   Status: ✅ Paid\n`);

    // Find filled parents
    console.log('🔍 FINDING FILLED PARENT POSITIONS:\n');
    
    const filledParents = [];
    for (let i = 1; i < levelShares.length; i++) {
      const level = levelShares[i];
      console.log(`${i + 1}️⃣ ${level.label}:`);
      
      try {
        const result = await findLevelHolder(level.levelName, '7410169609');
        
        if (!result || !result.app) {
          console.log(`   ❌ Empty - SKIP\n`);
          continue;
        }

        const recipient = await User.findById(result.app.userId);
        if (!recipient) {
          console.log(`   ❌ User not found\n`);
          continue;
        }

        filledParents.push({
          level: level,
          recipient: recipient,
          originalLevel: level.label
        });
        
        console.log(`   ✅ FILLED: ${recipient.name} (${recipient.phone})`);
        console.log(`   This will be Parent #${filledParents.length}\n`);
        
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}\n`);
      }
    }

    // Assign sequential percentages
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💵 SEQUENTIAL COMMISSION DISTRIBUTION:\n');
    
    const commissionDetails = [];
    
    for (let i = 0; i < filledParents.length; i++) {
      const parent = filledParents[i];
      const percent = parentPercentages[i] || 0;
      const amt = Number((AD_COST * (percent / 100)).toFixed(2));
      
      console.log(`Parent #${i + 1}: ${parent.originalLevel}`);
      console.log(`   Holder: ${parent.recipient.name} (${parent.recipient.phone})`);
      console.log(`   Sequential %: ${percent}%`);
      console.log(`   Amount: ₹${amt}\n`);
      
      commissionDetails.push({
        name: parent.recipient.name,
        phone: parent.recipient.phone,
        position: parent.originalLevel,
        percent: percent,
        amount: amt
      });
    }

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 FINAL DISTRIBUTION SUMMARY:\n');
    
    let totalDistributed = 240; // Self
    console.log(`✅ Urmila Jagveer Kagda (Self - Pincode)`);
    console.log(`   20% = ₹240.00\n`);
    
    for (const detail of commissionDetails) {
      console.log(`✅ ${detail.name} (${detail.phone})`);
      console.log(`   ${detail.position} - Parent #${commissionDetails.indexOf(detail) + 1}`);
      console.log(`   ${detail.percent}% = ₹${detail.amount.toFixed(2)}\n`);
      totalDistributed += detail.amount;
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`💰 Total to Partners: ₹${totalDistributed.toFixed(2)} (${(totalDistributed / AD_COST * 100).toFixed(2)}%)`);
    console.log(`🏢 Company Keeps: ₹${(AD_COST - totalDistributed).toFixed(2)} (${((AD_COST - totalDistributed) / AD_COST * 100).toFixed(2)}%)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

console.log('\n🚀 Starting test in 2 seconds...\n');
setTimeout(() => {
  testSequentialCommission();
}, 2000);
