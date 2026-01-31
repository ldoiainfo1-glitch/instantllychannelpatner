/**
 * Check Prashanth Awanti (Country Head)
 * Phone: 9742067525
 */

const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner';

async function checkPrashanth() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('\n✅ Connected to MongoDB\n');

    const User = mongoose.model('User', new mongoose.Schema({}, { collection: 'users', strict: false }));
    const Application = mongoose.model('Application', new mongoose.Schema({}, { collection: 'applications', strict: false }));

    // Check Prashanth user
    const prashanth = await User.findOne({ phone: '9742067525' });
    console.log('👤 PRASHANTH AWANTI (9742067525):');
    if (prashanth) {
      console.log('   User ID:', prashanth._id);
      console.log('   Name:', prashanth.name);
      console.log('   Phone:', prashanth.phone);
    } else {
      console.log('   ❌ User not found');
    }
    console.log('');

    // Check Prashanth application
    const prashanthApp = await Application.findOne({
      'applicantInfo.phone': '9742067525',
      status: 'approved'
    });

    console.log('📋 PRASHANTH APPLICATION:');
    if (prashanthApp) {
      console.log('   Application ID:', prashanthApp._id);
      console.log('   Position ID:', prashanthApp.positionId);
      console.log('   User ID:', prashanthApp.userId);
      console.log('   Status:', prashanthApp.status);
      console.log('   Country:', prashanthApp.applicantInfo?.country || 'Not set');
    } else {
      console.log('   ❌ Application not found');
    }
    console.log('');

    // Test finding country head
    console.log('🔍 TESTING COUNTRY HEAD SEARCH:');
    const countryQuery = {
      status: 'approved',
      positionId: { $regex: /president|india[-_\s]*head/i }
    };
    console.log('   Query:', JSON.stringify(countryQuery, null, 2));
    
    const countryApp = await Application.findOne(countryQuery);
    if (countryApp) {
      const holder = await User.findById(countryApp.userId);
      console.log('   ✅ Found:', holder?.name, '(' + countryApp.applicantInfo?.phone + ')');
      console.log('   Position ID:', countryApp.positionId);
    } else {
      console.log('   ❌ Not found');
    }

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkPrashanth();
