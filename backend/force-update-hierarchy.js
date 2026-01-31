/**
 * Force Update Hierarchy Fields Using Raw MongoDB
 * This will use direct MongoDB operations to update the fields
 */

const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner';

async function forceUpdateHierarchy() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('\n✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const applicationsCollection = db.collection('applications');

    // Update Urmila's application
    console.log('🔧 Updating Urmila Jagveer Kagda (7410169609)...');
    
    const urmilaUpdate = await applicationsCollection.updateOne(
      {
        'applicantInfo.phone': '7410169609',
        status: 'approved'
      },
      {
        $set: {
          'applicantInfo.country': 'India',
          'applicantInfo.zone': 'West Zone',
          'applicantInfo.state': 'Maharashtra',
          'applicantInfo.division': 'Konkan',
          'applicantInfo.district': 'Thane',
          'applicantInfo.tehsil': 'Thane'
        }
      }
    );

    console.log('   Matched:', urmilaUpdate.matchedCount);
    console.log('   Modified:', urmilaUpdate.modifiedCount);
    console.log('');

    // Update Pankaj's application
    console.log('🔧 Updating Pankaj Rathod (7559213601)...');
    
    const pankajUpdate = await applicationsCollection.updateOne(
      {
        'applicantInfo.phone': '7559213601',
        status: 'approved'
      },
      {
        $set: {
          'applicantInfo.country': 'India',
          'applicantInfo.zone': 'West Zone',
          'applicantInfo.state': 'Maharashtra'
        }
      }
    );

    console.log('   Matched:', pankajUpdate.matchedCount);
    console.log('   Modified:', pankajUpdate.modifiedCount);
    console.log('');

    // Verify
    console.log('✅ VERIFYING UPDATES...\n');

    const urmilaVerify = await applicationsCollection.findOne({
      'applicantInfo.phone': '7410169609',
      status: 'approved'
    });

    console.log('👤 URMILA:');
    console.log('   State:', urmilaVerify?.applicantInfo?.state || '❌ STILL NOT SET');
    console.log('   Zone:', urmilaVerify?.applicantInfo?.zone || 'Not set');
    console.log('   Division:', urmilaVerify?.applicantInfo?.division || 'Not set');
    console.log('   District:', urmilaVerify?.applicantInfo?.district || 'Not set');
    console.log('   Tehsil:', urmilaVerify?.applicantInfo?.tehsil || 'Not set');
    console.log('');

    const pankajVerify = await applicationsCollection.findOne({
      'applicantInfo.phone': '7559213601',
      status: 'approved'
    });

    console.log('👤 PANKAJ:');
    console.log('   State:', pankajVerify?.applicantInfo?.state || '❌ STILL NOT SET');
    console.log('   Zone:', pankajVerify?.applicantInfo?.zone || 'Not set');
    console.log('   Country:', pankajVerify?.applicantInfo?.country || 'Not set');
    console.log('');

    // Test commission finding logic
    if (urmilaVerify?.applicantInfo?.state === 'Maharashtra') {
      console.log('🎉 SUCCESS! Hierarchy fields are now set!');
      console.log('');
      console.log('ℹ️  NEXT TIME:');
      console.log('   - When Urmila creates an ad using cash credits');
      console.log('   - The commission system will read state = "Maharashtra"');
      console.log('   - It will find Pankaj Rathod as Maharashtra state head');
      console.log('   - Pankaj will receive 1.25% of the ad amount as commission');
      console.log('');
    } else {
      console.log('⚠️  Update may have failed');
    }

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

forceUpdateHierarchy();
