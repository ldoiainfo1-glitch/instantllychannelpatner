// Fix Rajesh Modi's account - update name and credits
const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://ldoiainfotech:ldoiainfotech@cluster0.fzqgp.mongodb.net/channelpartner?retryWrites=true&w=majority&appName=Cluster0';

async function fixRajeshAccount() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const User = mongoose.model('User', require('./backend/api/models/User').schema);
    
    // Find and update the user with phone 8828188930
    const user = await User.findOne({ phone: '8828188930' });
    
    if (!user) {
      console.log('❌ User not found!');
      return;
    }
    
    console.log('📋 Current user data:', {
      name: user.name,
      phone: user.phone,
      personCode: user.personCode,
      credits: user.credits,
      loginId: user.loginId
    });
    
    // Update to correct values
    user.name = 'Rajesh Modi';
    user.credits = 1200; // Update to 1200 credits
    user.password = 'RAJE'; // Will be hashed by pre-save hook
    
    await user.save();
    
    console.log('✅ User updated successfully:', {
      name: user.name,
      phone: user.phone,
      personCode: user.personCode,
      credits: user.credits,
      newPassword: 'RAJE (hashed)'
    });
    
    console.log('\n🔐 Login Credentials:');
    console.log('  Login ID (Phone): 8828188930');
    console.log('  Password: RAJE');
    console.log('  Credits: 1200');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ MongoDB connection closed');
  }
}

fixRajeshAccount();
