const mongoose = require('mongoose');
const Application = require('./api/models/Application');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

async function checkApplications() {
  try {
    const applications = await Application.find().sort({ appliedDate: -1 }).limit(20);
    
    console.log(`\n📋 Total applications: ${await Application.countDocuments()}`);
    console.log(`\nStatus breakdown:`);
    
    const pending = await Application.countDocuments({ status: 'pending' });
    const approved = await Application.countDocuments({ status: 'approved' });
    const rejected = await Application.countDocuments({ status: 'rejected' });
    
    console.log(`  Pending: ${pending}`);
    console.log(`  Approved: ${approved}`);
    console.log(`  Rejected: ${rejected}`);
    
    console.log(`\n📄 Recent 20 applications:\n`);
    applications.forEach((app, i) => {
      console.log(`${i + 1}. ${app.applicantInfo?.name || 'Unknown'}`);
      console.log(`   Status: ${app.status}`);
      console.log(`   Position ID: ${app.positionId}`);
      console.log(`   Position Title: ${app.positionInfo?.title || 'N/A'}`);
      console.log(`   Applied: ${app.appliedDate}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

checkApplications();
