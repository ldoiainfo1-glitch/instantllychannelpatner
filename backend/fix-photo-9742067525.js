/**
 * Fix User Photo
 * User: 9742067525 - Prashanth Awanti
 * Copy photo from application to user profile
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

const applicationSchema = new mongoose.Schema({}, { collection: 'applications', strict: false });
const Application = mongoose.model('Application', applicationSchema);

const userSchema = new mongoose.Schema({}, { collection: 'users', strict: false });
const User = mongoose.model('User', userSchema);

async function fixUserPhoto() {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📸 FIX USER PHOTO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const phone = '9742067525';
    
    // Find user
    const user = await User.findOne({ phone: phone });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ User found:\n');
    console.log(`Name: ${user.name}`);
    console.log(`Phone: ${user.phone}`);
    console.log(`Current Photo: ${user.photo || 'Not set'}`);
    console.log(`Current Profile Photo: ${user.profilePhoto || 'Not set'}`);
    console.log('');

    // Find application
    const application = await Application.findOne({
      'applicantInfo.phone': phone,
      status: 'approved'
    });

    if (!application) {
      console.log('❌ No approved application found');
      return;
    }

    console.log('✅ Application found:\n');
    console.log(`Application ID: ${application._id}`);
    console.log('');
    console.log('📋 Photos in Application:');
    console.log(`Profile Photo: ${application.applicantInfo?.photo || 'Not set'}`);
    console.log(`Photo URL: ${application.applicantInfo?.photoUrl || 'Not set'}`);
    console.log(`Aadhaar Front: ${application.documents?.aadhaarFront || 'Not set'}`);
    console.log(`Aadhaar Back: ${application.documents?.aadhaarBack || 'Not set'}`);
    console.log(`PAN Card: ${application.documents?.panCard || 'Not set'}`);
    console.log('');

    // Copy photo from application to user
    let updated = false;

    if (application.applicantInfo?.photo && !user.photo) {
      user.photo = application.applicantInfo.photo;
      updated = true;
      console.log('✅ Copied photo field from application');
    }

    if (application.applicantInfo?.photoUrl && !user.profilePhoto) {
      user.profilePhoto = application.applicantInfo.photoUrl;
      updated = true;
      console.log('✅ Copied photoUrl field from application');
    }

    // Also copy documents if not present
    if (!user.documents && application.documents) {
      user.documents = application.documents;
      updated = true;
      console.log('✅ Copied documents from application');
    }

    if (updated) {
      await user.save();
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ USER PROFILE UPDATED');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Photo: ${user.photo || 'Not set'}`);
      console.log(`Profile Photo: ${user.profilePhoto || 'Not set'}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('✅ Photo should now be visible on the profile!\n');
    } else {
      console.log('⚠️  NO PHOTO FOUND IN APPLICATION');
      console.log('\nPossible reasons:');
      console.log('1. User did not upload a photo during application');
      console.log('2. Photo was not saved properly during application submission');
      console.log('3. User needs to upload photo from Profile page\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed\n');
    process.exit(0);
  }
}

console.log('Starting photo fix in 2 seconds...\n');
setTimeout(() => {
  fixUserPhoto();
}, 2000);
