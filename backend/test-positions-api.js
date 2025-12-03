/**
 * Test script to check what the positions API is returning for Deepak's photo
 */

const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner.oe0ixs2.mongodb.net/channelpartner';

// Import models
const Position = require('./api/models/Position');
const Application = require('./api/models/Application');
const User = require('./api/models/User');

async function testPositionsAPI() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find Deepak's position - search by his phone in applications first
    console.log('🔍 Searching for Deepak (9768676666)...\n');
    
    const deepakApp = await Application.findOne({
      'applicantInfo.phone': '9768676666'
    });
    
    if (!deepakApp) {
      console.log('❌ Deepak\'s application not found');
      return;
    }
    
    console.log('📝 Found Deepak\'s application:', {
      _id: deepakApp._id,
      positionId: deepakApp.positionId,
      name: deepakApp.applicantInfo.name
    });
    
    // Use the application we already found
    const application = deepakApp;

    if (!application) {
      console.log('❌ No application found for this position');
      return;
    }

    console.log('\n📝 Application found:', {
      _id: application._id,
      name: application.applicantInfo.name,
      phone: application.applicantInfo.phone,
      userId: application.userId,
      photoLength: application.applicantInfo.photo?.length || 0
    });

    // Now simulate what the backend API does
    let userPhoto = application.applicantInfo.photo; // Default from application
    
    // CRITICAL FIX: Manually fetch the User document
    if (application.userId) {
      try {
        const linkedUser = await User.findById(application.userId);
        if (linkedUser && linkedUser.photo) {
          userPhoto = linkedUser.photo; // Use updated photo from User model
          console.log(`\n📸 Using updated photo from User model`);
          console.log('   User.photo length:', linkedUser.photo.length);
        } else {
          console.log(`\n⚠️  User ${application.userId} not found or has no photo`);
        }
      } catch (error) {
        console.error(`\n❌ Error fetching user photo:`, error.message);
      }
    } else {
      console.log(`\n⚠️  No userId linked`);
    }

    console.log('\n📊 FINAL RESULT:');
    console.log('   Photo being used:', userPhoto.substring(0, 50) + '...');
    console.log('   Photo length:', userPhoto.length, 'characters');
    
    // Compare
    console.log('\n🔍 COMPARISON:');
    console.log('   Application photo length:', application.applicantInfo.photo?.length || 0);
    
    if (application.userId) {
      const user = await User.findById(application.userId);
      console.log('   User photo length:', user.photo?.length || 0);
      console.log('   Photos match:', userPhoto === user.photo ? '✅ YES' : '❌ NO');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

testPositionsAPI();
