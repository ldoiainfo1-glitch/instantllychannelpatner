const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://instantllycards:instantllycards@cluster0.5ftkh.mongodb.net/channelpartner?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI).then(() => {
  console.log('✅ Connected to MongoDB');
  checkNomanData();
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

const Application = mongoose.model('Application', new mongoose.Schema({
  positionId: String,
  applicantInfo: {
    name: String,
    phone: String
  },
  location: {
    country: String,
    zone: String,
    state: String,
    division: String,
    district: String,
    tehsil: String,
    pincode: String,
    village: String
  }
}));

async function checkNomanData() {
  try {
    const noman = await Application.findOne({ 'applicantInfo.phone': '7006220931' });
    
    if (!noman) {
      console.log('❌ Noman Khan not found');
      process.exit(1);
    }
    
    console.log('\n📋 Noman Khan\'s Data:');
    console.log('Position ID:', noman.positionId);
    console.log('\n📍 Location stored:');
    console.log(JSON.stringify(noman.location, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}
