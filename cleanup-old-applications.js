// Script to clean up old applications without photo, companyName, businessName
const mongoose = require('mongoose');
const Application = require('./backend/api/models/Application');
const Position = require('./backend/api/models/Position');

const MONGODB_URI = 'mongodb+srv://ldoiainfo1:Instantly%402024@cluster0.acdux.mongodb.net/instantlyCards?retryWrites=true&w=majority';

async function cleanupOldApplications() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find applications without photo, companyName, or businessName
    const oldApplications = await Application.find({
      $or: [
        { 'applicantInfo.photo': { $exists: false } },
        { 'applicantInfo.companyName': { $exists: false } },
        { 'applicantInfo.businessName': { $exists: false } }
      ]
    });

    console.log(`\n📋 Found ${oldApplications.length} old applications to clean up`);

    for (const app of oldApplications) {
      console.log(`\n🗑️  Deleting application: ${app._id}`);
      console.log(`   Position ID: ${app.positionId}`);
      console.log(`   Status: ${app.status}`);
      
      // Reset the position back to Available
      const position = await Position.findById(app.positionId);
      if (position) {
        position.status = 'Available';
        position.applicantDetails = null;
        await position.save();
        console.log(`   ✅ Position ${position._id} reset to Available`);
      }
      
      // Delete the application
      await Application.deleteOne({ _id: app._id });
      console.log(`   ✅ Application deleted`);
    }

    console.log(`\n✅ Cleanup complete! Deleted ${oldApplications.length} old applications`);
    console.log('🎉 All positions are now Available for new applications with photos');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

cleanupOldApplications();
