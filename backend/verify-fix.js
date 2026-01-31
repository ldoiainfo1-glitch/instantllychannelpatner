/**
 * Verify Fix - Fresh Check
 * Verify that Urmila and Pankaj's applications are properly fixed
 */

const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner';

async function verifyFix() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('\n✅ Connected to MongoDB\n');

    const Application = mongoose.model('Application', new mongoose.Schema({}, { collection: 'applications', strict: false }));

    // Check Urmila
    const urmila = await Application.findOne({
      'applicantInfo.phone': '7410169609',
      status: 'approved'
    }).lean();

    console.log('👤 URMILA JAGVEER KAGDA (7410169609)');
    console.log('   State:', urmila?.applicantInfo?.state || '❌ NOT SET');
    console.log('   Zone:', urmila?.applicantInfo?.zone || 'Not set');
    console.log('   Division:', urmila?.applicantInfo?.division || 'Not set');
    console.log('   District:', urmila?.applicantInfo?.district || 'Not set');
    console.log('   Tehsil:', urmila?.applicantInfo?.tehsil || 'Not set');
    console.log('   Pincode:', urmila?.applicantInfo?.pincode || 'Not set');
    console.log('');

    // Check Pankaj
    const pankaj = await Application.findOne({
      'applicantInfo.phone': '7559213601',
      status: 'approved'
    }).lean();

    console.log('👤 PANKAJ RATHOD (7559213601)');
    console.log('   State:', pankaj?.applicantInfo?.state || '❌ NOT SET');
    console.log('   Zone:', pankaj?.applicantInfo?.zone || 'Not set');
    console.log('   Country:', pankaj?.applicantInfo?.country || 'Not set');
    console.log('');

    // Test if commission system can now find Pankaj
    if (urmila?.applicantInfo?.state) {
      const stateHeadQuery = {
        status: 'approved',
        'applicantInfo.phone': { $ne: '7410169609' },
        'applicantInfo.state': new RegExp(urmila.applicantInfo.state, 'i')
      };

      console.log('🧪 Testing: Can we find Maharashtra state head?');
      console.log('   Query:', JSON.stringify(stateHeadQuery, null, 2));
      
      const stateHead = await Application.findOne(stateHeadQuery).sort({ approvedDate: -1 }).lean();
      
      if (stateHead) {
        const User = mongoose.model('User', new mongoose.Schema({}, { collection: 'users', strict: false }));
        const holder = await User.findById(stateHead.userId).lean();
        console.log('   ✅ FOUND:', holder?.name, '(' + stateHead.applicantInfo?.phone + ')');
        
        if (stateHead.applicantInfo?.phone === '7559213601') {
          console.log('   🎉 SUCCESS! Pankaj Rathod will now receive state commission!');
        }
      } else {
        console.log('   ❌ NOT FOUND');
      }
    } else {
      console.log('⚠️  Urmila still missing state field');
    }

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyFix();
