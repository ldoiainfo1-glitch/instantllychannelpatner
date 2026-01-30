/**
 * Check Application Status
 * User: 9742067525 - Prashanth Awanti
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

async function checkApplication() {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 APPLICATION STATUS CHECK');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const phone = '9742067525';
    const name = 'Prashanth';
    
    console.log(`Searching for: ${phone} / ${name}\n`);

    // Check applications
    const applications = await Application.find({
      $or: [
        { 'applicantInfo.phone': phone },
        { 'applicantInfo.phone': { $regex: '742067525' } },
        { 'applicantInfo.name': { $regex: /prashanth/i } },
        { 'applicantInfo.name': { $regex: /awanti/i } }
      ]
    });

    if (applications.length === 0) {
      console.log('❌ NO APPLICATION FOUND!\n');
      console.log('This user has never submitted an application.');
      console.log('\n💡 SOLUTION:');
      console.log('The user needs to:');
      console.log('1. Visit the channel partner website');
      console.log('2. Fill out the application form');
      console.log('3. Submit documents');
      console.log('4. Wait for admin approval');
      console.log('5. After approval, login credentials will be created\n');
      return;
    }

    console.log(`✅ Found ${applications.length} application(s)!\n`);

    applications.forEach((app, index) => {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`APPLICATION #${index + 1}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`ID: ${app._id}`);
      console.log(`Name: ${app.applicantInfo?.name || 'N/A'}`);
      console.log(`Phone: ${app.applicantInfo?.phone || 'N/A'}`);
      console.log(`Email: ${app.applicantInfo?.email || 'N/A'}`);
      console.log(`Position: ${app.positionId || 'N/A'}`);
      console.log(`Status: ${app.status ? app.status.toUpperCase() : 'N/A'}`);
      console.log(`Applied Date: ${app.createdAt || 'N/A'}`);
      console.log(`Approved Date: ${app.approvedDate || 'Not approved yet'}`);
      console.log(`User ID: ${app.userId || 'Not created yet'}`);
      console.log('');

      if (app.status === 'pending') {
        console.log('⏳ APPLICATION STATUS: PENDING');
        console.log('\n💡 SOLUTION:');
        console.log('1. Admin needs to approve this application');
        console.log('2. After approval, user account will be created automatically');
        console.log('3. User will receive login credentials\n');
      } else if (app.status === 'approved') {
        console.log('✅ APPLICATION STATUS: APPROVED');
        console.log('\n⚠️  ISSUE: Application approved but user account not created!');
        console.log('\n💡 SOLUTION:');
        console.log('There was an error during user creation. Admin should:');
        console.log('1. Check the application approval process');
        console.log('2. Manually create user account, OR');
        console.log('3. Re-approve the application to trigger user creation\n');

        // Check if userId exists
        if (app.userId) {
          console.log(`📌 Checking if user ${app.userId} exists...\n`);
          User.findById(app.userId).then(user => {
            if (user) {
              console.log(`✅ User account EXISTS!`);
              console.log(`Name: ${user.name}`);
              console.log(`Phone: ${user.phone}`);
              console.log(`Has Password: ${!!user.password}`);
              console.log('\n⚠️  User exists but phone number might be different!');
              console.log(`Application phone: ${app.applicantInfo?.phone}`);
              console.log(`User account phone: ${user.phone}`);
            } else {
              console.log(`❌ User account does NOT exist (orphaned application)`);
            }
          });
        }
      } else if (app.status === 'rejected') {
        console.log('❌ APPLICATION STATUS: REJECTED');
        console.log('\n💡 User needs to submit a new application.');
      }
      
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed\n');
    process.exit(0);
  }
}

console.log('Starting check in 2 seconds...\n');
setTimeout(() => {
  checkApplication();
}, 2000);
