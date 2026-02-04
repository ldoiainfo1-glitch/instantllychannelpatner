const mongoose = require('mongoose');
require('dotenv').config();

const Application = require('./api/models/Application');

async function checkPositions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');
    
    // Get all approved applications
    const allApps = await Application.find({ status: 'approved' }).lean();
    console.log(`Total approved applications: ${allApps.length}\n`);
    
    // Group by position level
    const byLevel = {};
    allApps.forEach(app => {
      const match = app.positionId.match(/pos_(\w+)-head/);
      const level = match ? match[1] : 'unknown';
      if (!byLevel[level]) byLevel[level] = [];
      byLevel[level].push({
        name: app.applicantInfo.name,
        phone: app.applicantInfo.phone,
        positionId: app.positionId,
        hierarchy: {
          country: app.applicantInfo.country,
          zone: app.applicantInfo.zone,
          state: app.applicantInfo.state,
          division: app.applicantInfo.division,
          district: app.applicantInfo.district,
          tehsil: app.applicantInfo.tehsil,
          pincode: app.applicantInfo.pincode
        }
      });
    });
    
    // Print by level
    for (const [level, apps] of Object.entries(byLevel)) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`${level.toUpperCase()} LEVEL (${apps.length} applications):`);
      console.log('='.repeat(60));
      apps.forEach(app => {
        console.log(`\n${app.name} (${app.phone})`);
        console.log(`  Position: ${app.positionId}`);
        console.log(`  Hierarchy:`, JSON.stringify(app.hierarchy, null, 2));
      });
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPositions();
