/**
 * Debug Script: Check User Login Issue
 * User: 9742067525 - Prashanth Awanti
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

const userSchema = new mongoose.Schema({
  name: String,
  phone: String,
  email: String,
  password: String,
  loginId: String,
  personCode: String,
  credits: Number,
  cashCredits: Number,
  extraCredits: Number
}, { collection: 'users', strict: false });

const User = mongoose.model('User', userSchema);

async function debugUserLogin() {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 USER LOGIN DEBUG');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const phone = '9742067525';
    console.log(`Searching for user with phone: ${phone}\n`);

    // Find user
    const user = await User.findOne({ phone: phone });

    if (!user) {
      console.log('❌ USER NOT FOUND!');
      console.log('\nPossible reasons:');
      console.log('1. User account was never created');
      console.log('2. Application was not approved yet');
      console.log('3. Phone number is different in database');
      console.log('\nChecking for similar phone numbers...\n');
      
      const similarUsers = await User.find({
        $or: [
          { phone: { $regex: '742067525' } },
          { name: { $regex: /prashanth/i } }
        ]
      });
      
      if (similarUsers.length > 0) {
        console.log(`Found ${similarUsers.length} similar user(s):\n`);
        similarUsers.forEach(u => {
          console.log(`📱 Phone: ${u.phone}`);
          console.log(`👤 Name: ${u.name}`);
          console.log(`🔑 Has Password: ${!!u.password}`);
          console.log('');
        });
      } else {
        console.log('No similar users found.');
      }
      
      return;
    }

    // User found - detailed info
    console.log('✅ USER FOUND!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 USER DETAILS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`ID: ${user._id}`);
    console.log(`Name: ${user.name}`);
    console.log(`Phone: ${user.phone}`);
    console.log(`Email: ${user.email || 'Not set'}`);
    console.log(`Login ID: ${user.loginId || 'Not set'}`);
    console.log(`Person Code: ${user.personCode || 'Not set'}`);
    console.log(`Credits: ${user.credits || 0}`);
    console.log(`Cash Credits: ${user.cashCredits || 0}`);
    console.log(`Extra Credits: ${user.extraCredits || 0}`);
    console.log('');

    // Password analysis
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 PASSWORD ANALYSIS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (!user.password) {
      console.log('❌ PASSWORD NOT SET!');
      console.log('\n🛠️  SOLUTION: Password needs to be set for this user.');
      console.log('   Run the password fix script or manually set password.');
      return;
    }

    const passwordFirstChars = user.password.substring(0, 20);
    const isHashed = user.password.startsWith('$2');
    
    console.log(`Has Password: YES`);
    console.log(`Password First 20 chars: ${passwordFirstChars}...`);
    console.log(`Is Hashed (bcrypt): ${isHashed ? 'YES ✅' : 'NO ❌'}`);
    console.log(`Password Length: ${user.password.length} characters`);
    console.log('');

    // Generate expected password based on naming convention
    const nameForPassword = user.name.replace(/\s+/g, '');
    const expectedPassword = nameForPassword.substring(0, 4).toUpperCase().padEnd(4, 'X');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔑 PASSWORD TESTING');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Expected Password (Name-based): ${expectedPassword}`);
    console.log('');

    // Test common passwords
    const testPasswords = [
      expectedPassword,
      user.name.substring(0, 4).toUpperCase(),
      'PRAS',
      'Pras',
      'pras',
      '1234',
      user.phone.substring(0, 4),
      user.phone
    ];

    console.log('Testing common passwords:\n');
    
    for (const testPwd of testPasswords) {
      let match = false;
      
      if (isHashed) {
        // Try bcrypt comparison
        try {
          match = await bcrypt.compare(testPwd, user.password);
        } catch (err) {
          console.log(`❌ Error testing "${testPwd}": ${err.message}`);
          continue;
        }
      } else {
        // Direct comparison
        match = (user.password === testPwd);
      }
      
      if (match) {
        console.log(`✅ PASSWORD FOUND: "${testPwd}" ✅`);
        console.log('');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ LOGIN CREDENTIALS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Phone: ${user.phone}`);
        console.log(`Password: ${testPwd}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        return;
      } else {
        console.log(`❌ "${testPwd}" - No match`);
      }
    }
    
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  PASSWORD NOT FOUND IN COMMON TESTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🛠️  SOLUTIONS:');
    console.log('1. Reset password through admin panel');
    console.log('2. Ask user what password they set');
    console.log('3. Generate new password and inform user');
    console.log('');
    console.log('To reset password, run:');
    console.log(`node backend/reset-user-password.js ${phone} NEWPASSWORD`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed\n');
    process.exit(0);
  }
}

console.log('Starting debug in 2 seconds...\n');
setTimeout(() => {
  debugUserLogin();
}, 2000);
