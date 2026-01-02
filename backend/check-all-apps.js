/**
 * Check all applications to see what's in database
 */

const mongoose = require('mongoose');

// MongoDB URI
const MONGODB_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner.oe0ixs2.mongodb.net/channelpartner';

// Import models
const Application = require('./api/models/Application');

async function checkAllApplications() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected!\n');

    // Get all approved applications
    const apps = await Application.find({ status: 'approved' }).sort({ appliedDate: -1 }).limit(60);
    
    console.log(`📊 Found ${apps.length} approved applications:\n`);
    
    apps.forEach((app, index) => {
      console.log(`${index + 1}. ${app.applicantInfo.name} (${app.applicantInfo.phone})`);
      console.log(`   Position ID: ${app.positionId}`);
      console.log(`   Location: District=${app.location?.district}, Division=${app.location?.division}, State=${app.location?.state}`);
      console.log('');
    });

    await mongoose.disconnect();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAllApplications();
