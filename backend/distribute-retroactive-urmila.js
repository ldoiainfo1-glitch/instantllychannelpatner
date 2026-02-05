const mongoose = require('mongoose');
const User = require('./api/models/User');
const Application = require('./api/models/Application');
const CommissionDistribution = require('./api/models/CommissionDistribution');

const MONGODB_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner';

async function distributeRetroactive() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const phone = '7410169609'; // Urmila
    const cashAmount = 2400; // Total cash credits she received

    const user = await User.findOne({ phone });
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`🔄 Distributing commission for ${user.name} (${user.phone})`);
    console.log(`Cash Amount: ₹${cashAmount}\n`);

    // Find approved application
    const application = await Application.findOne({ 
      'applicantInfo.phone': user.phone, 
      status: 'approved' 
    });

    if (!application || !application.positionId) {
      console.log('❌ No approved application with positionId found');
      return;
    }

    const recipient = user;
    const CREDIT_AMOUNT = cashAmount;
    const extraCreditsToAdd = 0;

    // Commission percentages
    const levelShares = [
      { levelName: 'pincode', percent: 20, label: 'Pincode' },
      { levelName: 'tehsil', percent: 10, label: 'Tehsil' },
      { levelName: 'district', percent: 5, label: 'District' },
      { levelName: 'division', percent: 2.5, label: 'Division' },
      { levelName: 'state', percent: 1.25, label: 'State' },
      { levelName: 'zone', percent: 0.6, label: 'Zone' },
      { levelName: 'country', percent: 0.3, label: 'India' }
    ];
    
    const parentPercentages = [10, 5, 2.5, 1.25, 0.6, 0.3];

    // Self commission (20%)
    const selfShare = levelShares[0];
    const selfAmt = Number((CREDIT_AMOUNT * (selfShare.percent / 100)).toFixed(2));
    
    const recipientLocation = application.applicantInfo?.pincode || 'N/A';
    const recipientPosition = application.position?.level || 'Pincode';
    
    recipient.commissionHistory = recipient.commissionHistory || [];
    recipient.cashCreditsHistory = recipient.cashCreditsHistory || [];
    
    // Give SELF commission - Convert to CASH CREDITS
    const oldCashCredits = recipient.cashCredits || 0;
    recipient.cashCredits = oldCashCredits + selfAmt;
    recipient.credits = (recipient.cashCredits || 0) + (recipient.extraCredits || 0);
    
    recipient.cashCreditsHistory.push({
      type: 'credit',
      amount: selfAmt,
      balance: recipient.cashCredits,
      description: `Self Commission (20%) converted to Cash Credits (RETROACTIVE)\\nFrom: Credits received earlier\\nLevel: ${selfShare.label}\\nLocation: ${recipientLocation}`,
      date: new Date()
    });
    
    recipient.commissionHistory.push({
      type: 'credit',
      subType: 'self',
      amount: selfAmt,
      balance: 0,
      description: `Commission (Self) - Converted to Cash Credits (RETROACTIVE)\\nLevel: ${selfShare.label}\\nLocation: ${recipientLocation}`,
      level: selfShare.label,
      positionLevel: recipientPosition,
      positionLocation: recipientLocation,
      percent: selfShare.percent,
      date: new Date()
    });
    
    await recipient.save();
    console.log(`✅ Self Commission: ₹${selfAmt} (${selfShare.percent}%) → Cash Credits for ${recipient.name}`);
    console.log(`   New Cash Credits: ${recipient.cashCredits}`);
    console.log(`   New Total Credits: ${recipient.credits}\n`);

    // Extract hierarchy
    const posIdParts = application.positionId.split('_');
    const hierarchy = {
      country: posIdParts[2] || 'india',
      zone: posIdParts[3] || null,
      state: posIdParts[4] || null,
      division: posIdParts[5] || null,
      district: posIdParts[6] || null,
      tehsil: posIdParts[7] || null,
      pincode: posIdParts[8] || null
    };

    console.log('📍 Hierarchy:', hierarchy);
    console.log('📍 Position ID:', application.positionId, '\n');

    // Find parent positions
    const findLevelHolder = async (levelName, excludePhone = null) => {
      let query = { status: 'approved' };
      if (excludePhone) {
        query['applicantInfo.phone'] = { $ne: excludePhone };
      }
      
      if (levelName === 'country') {
        query.positionId = { $regex: /pos_president_india|pos_country-head_india/i };
      } else if (levelName === 'zone' && hierarchy.zone) {
        const zonePattern = `pos_zone-head_india_${hierarchy.zone}`;
        query.positionId = { $regex: new RegExp(zonePattern.replace(/-/g, '[-_]'), 'i') };
      } else if (levelName === 'state' && hierarchy.state) {
        const statePattern = `pos_state-head_india_${hierarchy.zone}_${hierarchy.state}`;
        query.positionId = { $regex: new RegExp(statePattern.replace(/-/g, '[-_]'), 'i') };
      } else if (levelName === 'division' && hierarchy.division) {
        const divPattern = `pos_division-head_india_${hierarchy.zone}_${hierarchy.state}_${hierarchy.division}`;
        query.positionId = { $regex: new RegExp(divPattern.replace(/-/g, '[-_]'), 'i') };
      } else if (levelName === 'district' && hierarchy.district) {
        const distPattern = `pos_district-head_india_${hierarchy.zone}_${hierarchy.state}_${hierarchy.division}_${hierarchy.district}`;
        query.positionId = { $regex: new RegExp(distPattern.replace(/-/g, '[-_]'), 'i') };
      } else if (levelName === 'tehsil' && hierarchy.tehsil) {
        const tehsilPattern = `pos_tehsil-head_india_${hierarchy.zone}_${hierarchy.state}_${hierarchy.division}_${hierarchy.district}_${hierarchy.tehsil}`;
        query.positionId = { $regex: new RegExp(tehsilPattern.replace(/-/g, '[-_]'), 'i') };
      } else {
        return null;
      }

      let app = await Application.findOne(query).lean();
      return app ? { app, paidLevel: levelName } : null;
    };

    // Find filled parents
    const filledParents = [];
    console.log('🔍 Searching for parent positions...\n');
    
    for (let i = 1; i < levelShares.length; i++) {
      const level = levelShares[i];
      console.log(`   Checking ${level.label} (${level.levelName})...`);
      const result = await findLevelHolder(level.levelName, recipient.phone);
      
      if (result && result.app) {
        const parentUser = await User.findById(result.app.userId);
        if (parentUser) {
          filledParents.push({
            level: level,
            recipient: parentUser,
            originalLevel: level.label,
            application: result.app
          });
          console.log(`      ✅ Found: ${parentUser.name} (${parentUser.phone})`);
        } else {
          console.log(`      ⚠️  Application found but user not found`);
        }
      } else {
        console.log(`      ➖ Empty`);
      }
    }
    
    console.log(`\n💰 Distributing to ${filledParents.length} parent position(s)...\n`);
    
    // Distribute to parents
    let totalDistributed = selfAmt;
    
    for (let i = 0; i < filledParents.length; i++) {
      const parent = filledParents[i];
      const percent = parentPercentages[i] || 0;
      const amt = Number((CREDIT_AMOUNT * (percent / 100)).toFixed(2));
      
      if (amt > 0) {
        parent.recipient.commissionBalance = (parent.recipient.commissionBalance || 0) + amt;
        parent.recipient.commissionHistory = parent.recipient.commissionHistory || [];
        
        const parentPosition = parent.application?.position?.level || parent.originalLevel;
        const parentLocation = parent.application?.applicantInfo?.pincode || 
                              parent.application?.applicantInfo?.district || 
                              parent.originalLevel;
        
        parent.recipient.commissionHistory.push({
          type: 'credit',
          subType: 'parent',
          amount: amt,
          balance: parent.recipient.commissionBalance,
          description: `Commission from credits given to ${recipient.name} (RETROACTIVE)\\nYour Position: ${parentPosition}\\nYour Location: ${parentLocation}`,
          level: `Parent ${i + 1}`,
          positionLevel: parentPosition,
          positionLocation: parentLocation,
          uploaderName: recipient.name || recipient.phone,
          percent: percent,
          date: new Date()
        });
        
        await parent.recipient.save();
        totalDistributed += amt;
        
        console.log(`✅ Parent #${i + 1}: ${parent.recipient.name} (${parent.originalLevel})`);
        console.log(`   Commission: ${percent}% = ₹${amt}`);
        console.log(`   New Commission Balance: ₹${parent.recipient.commissionBalance}\n`);
      }
    }
    
    // Create distribution record
    const hierarchyPathArray = [];
    
    hierarchyPathArray.push({
      level: 'pincode',
      location: hierarchy.pincode || recipientLocation,
      holder: recipient.name,
      holderPhone: recipient.phone,
      holderId: recipient._id,
      status: 'self',
      commission: selfAmt,
      percent: 20,
      sequentialPosition: null
    });
    
    let parentIndex = 0;
    for (let i = 1; i < levelShares.length; i++) {
      const level = levelShares[i];
      const location = hierarchy[level.levelName] || level.label;
      const filledParent = filledParents.find(p => p.level.levelName === level.levelName);
      
      if (filledParent) {
        const percent = parentPercentages[parentIndex] || 0;
        const amt = Number((CREDIT_AMOUNT * (percent / 100)).toFixed(2));
        
        hierarchyPathArray.push({
          level: level.levelName,
          location: location,
          holder: filledParent.recipient.name,
          holderPhone: filledParent.recipient.phone,
          holderId: filledParent.recipient._id,
          status: 'filled',
          commission: amt,
          percent: percent,
          sequentialPosition: parentIndex + 1
        });
        parentIndex++;
      } else {
        hierarchyPathArray.push({
          level: level.levelName,
          location: location,
          holder: null,
          status: 'empty',
          commission: 0,
          percent: 0,
          sequentialPosition: null
        });
      }
    }
    
    const distributionRecord = new CommissionDistribution({
      adId: null,
      creatorId: recipient._id,
      creatorPhone: recipient.phone,
      creatorName: recipient.name,
      adAmount: CREDIT_AMOUNT,
      distributionDate: new Date(),
      selfCommission: {
        paid: true,
        amount: selfAmt,
        percent: 20
      },
      hierarchyPath: hierarchyPathArray,
      totalDistributed: totalDistributed,
      filledPositions: filledParents.length + 1,
      emptyPositions: 6 - filledParents.length,
      creditBreakdown: {
        cash: CREDIT_AMOUNT,
        extra: 0
      }
    });
    
    await distributionRecord.save();
    
    console.log('='.repeat(80));
    console.log('✅ COMMISSION DISTRIBUTION COMPLETED');
    console.log('='.repeat(80));
    console.log(`Total Distributed: ₹${totalDistributed.toFixed(2)}`);
    console.log(`Self Commission: ₹${selfAmt} (converted to cash credits)`);
    console.log(`Parent Commissions: ₹${(totalDistributed - selfAmt).toFixed(2)} (withdrawable)`);
    console.log(`Filled Positions: ${filledParents.length + 1} (including self)`);
    console.log(`Empty Positions: ${6 - filledParents.length}`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

distributeRetroactive();
