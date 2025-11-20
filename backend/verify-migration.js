const mongoose = require('mongoose');
const Application = require('./api/models/Application');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

async function verifyApplications() {
  try {
    console.log('\n📋 All Applications After Migration:\n');
    
    const applications = await Application.find();
    
    console.log(`Total: ${applications.length}\n`);
    
    applications.forEach((app, i) => {
      console.log(`${i + 1}. ${app.applicantInfo.name}`);
      console.log(`   Phone: ${app.applicantInfo.phone}`);
      console.log(`   Position ID: ${app.positionId}`);
      console.log(`   Status: ${app.status}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

verifyApplications();
