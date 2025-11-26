const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://instantllycards:instantllycards@cluster0.5ftkh.mongodb.net/channelpartner?retryWrites=true&w=majority';

// Connect to MongoDB
mongoose.connect(MONGODB_URI).then(() => {
  console.log('✅ Connected to MongoDB');
  checkDistrictMumbai();
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Application Model
const Application = mongoose.model('Application', new mongoose.Schema({
  positionId: String,
  personCode: String,
  applicantInfo: {
    name: String,
    phone: String,
    email: String,
    photo: String,
    address: String,
    companyName: String,
    businessName: String
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
  },
  userId: mongoose.Schema.Types.ObjectId,
  introducedBy: String,
  status: String,
  appliedDate: Date,
  approvedDate: Date,
  adminNotes: String,
  isVerified: Boolean
}));

async function checkDistrictMumbai() {
  try {
    console.log('\n🔍 Checking application with position ID: pos_district-head_india_mumbai\n');
    
    // Find application with this position ID
    const application = await Application.findOne({ 
      positionId: 'pos_district-head_india_mumbai'
    });
    
    if (!application) {
      console.log('❌ No application found with this position ID');
      
      // Try to find any Mumbai district applications
      console.log('\n🔍 Searching for any Mumbai district applications...\n');
      const mumbaiApps = await Application.find({ 
        'location.district': /mumbai/i 
      });
      
      if (mumbaiApps.length > 0) {
        console.log(`✅ Found ${mumbaiApps.length} Mumbai district application(s):\n`);
        mumbaiApps.forEach((app, index) => {
          console.log(`Application ${index + 1}:`);
          console.log('  Name:', app.applicantInfo.name);
          console.log('  Phone:', app.applicantInfo.phone);
          console.log('  Position ID:', app.positionId);
          console.log('  Location:', JSON.stringify(app.location, null, 2));
          console.log('  Status:', app.status);
          console.log('---');
        });
      } else {
        console.log('❌ No Mumbai district applications found');
      }
      
      process.exit(1);
    }
    
    console.log('✅ Found application:');
    console.log('  Name:', application.applicantInfo.name);
    console.log('  Phone:', application.applicantInfo.phone);
    console.log('  Position ID:', application.positionId);
    console.log('  Status:', application.status);
    console.log('\n📍 Location Data:');
    console.log('  Country:', application.location.country);
    console.log('  Zone:', application.location.zone);
    console.log('  State:', application.location.state);
    console.log('  Division:', application.location.division);
    console.log('  District:', application.location.district);
    console.log('  Tehsil:', application.location.tehsil);
    console.log('  Pincode:', application.location.pincode);
    console.log('  Village:', application.location.village);
    
    console.log('\n🎯 Analysis:');
    if (!application.location.zone || !application.location.state) {
      console.log('  ⚠️ ISSUE: Missing parent hierarchy (Zone/State)');
      console.log('  ❌ District head should have complete path: India → Zone → State → Division → District');
    } else {
      console.log('  ✅ Location hierarchy is complete');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}
