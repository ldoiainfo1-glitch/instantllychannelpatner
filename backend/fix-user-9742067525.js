/**
 * Fix User Account Creation
 * User: 9742067525 - Prashanth Awanti
 * Creates user account from approved application
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
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

async function createUserFromApplication() {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🛠️  FIX USER ACCOUNT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const phone = '9742067525';
    
    // Find approved application
    const application = await Application.findOne({
      'applicantInfo.phone': phone,
      status: 'approved'
    });

    if (!application) {
      console.log('❌ No approved application found for this phone number');
      return;
    }

    console.log('✅ Found approved application:\n');
    console.log(`Name: ${application.applicantInfo.name}`);
    console.log(`Phone: ${application.applicantInfo.phone}`);
    console.log(`Position: ${application.positionId}`);
    console.log(`Application ID: ${application._id}`);
    console.log(`User ID in Application: ${application.userId}`);
    console.log('');

    // Check if user already exists
    let user = await User.findById(application.userId);
    
    if (!user) {
      user = await User.findOne({ phone: phone });
    }

    if (user) {
      console.log('⚠️  User account already exists:\n');
      console.log(`User ID: ${user._id}`);
      console.log(`Name: ${user.name}`);
      console.log(`Phone: ${user.phone}`);
      console.log(`Has Password: ${!!user.password}`);
      console.log('');
      
      // Generate password
      const nameForPassword = user.name.replace(/\s+/g, '');
      const password = nameForPassword.substring(0, 4).toUpperCase().padEnd(4, 'X');
      
      // Hash password if not already hashed
      if (!user.password || !user.password.startsWith('$2')) {
        console.log('🔐 Setting/Resetting password...\n');
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        await user.save();
        console.log('✅ Password has been set!\n');
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ LOGIN CREDENTIALS');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Phone: ${user.phone}`);
      console.log(`Password: ${password}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return;
    }

    // User doesn't exist - create new user
    console.log('📝 Creating new user account...\n');

    const nameForPassword = application.applicantInfo.name.replace(/\s+/g, '');
    const password = nameForPassword.substring(0, 4).toUpperCase().padEnd(4, 'X');
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name: application.applicantInfo.name,
      phone: application.applicantInfo.phone,
      email: application.applicantInfo.email || '',
      password: hashedPassword,
      loginId: application.applicantInfo.phone,
      personCode: `PC${Date.now()}`,
      credits: 0,
      cashCredits: 0,
      extraCredits: 0,
      cashHistory: [],
      extraHistory: [],
      creditsHistory: [],
      commissionBalance: 0,
      commissionHistory: [],
      hasReceivedInitialCredits: false,
      isVerified: true,
      createdAt: new Date(),
      referredBy: application.applicantInfo.referredBy || null
    });

    await newUser.save();
    console.log('✅ User account created successfully!\n');

    // Update application with correct userId
    application.userId = newUser._id;
    await application.save();
    console.log('✅ Application updated with user ID\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SETUP COMPLETE - LOGIN CREDENTIALS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Phone: ${newUser.phone}`);
    console.log(`Password: ${password}`);
    console.log(`User ID: ${newUser._id}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✅ User can now login to the channel partner portal!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed\n');
    process.exit(0);
  }
}

console.log('Starting user account creation in 2 seconds...\n');
setTimeout(() => {
  createUserFromApplication();
}, 2000);
