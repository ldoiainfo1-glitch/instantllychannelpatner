const mongoose = require('mongoose');
const Application = require('./api/models/Application');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

async function updateApplicationPositionIds() {
  try {
    console.log('\n🔧 Updating application position IDs...\n');
    
    // Mapping: old position ID -> new position ID
    const mapping = {
      'pos_zone-head_india_north-india': 'pos_zone-head_india_north',
      'pos_zone-head_india_west-india': 'pos_zone-head_india_west',
      'pos_zone-head_india_south-india': 'pos_zone-head_india_south',
      'pos_zone-head_india_east-india': 'pos_zone-head_india_east',
      'pos_zone-head_india_north-east-india': 'pos_zone-head_india_north-east',
      'pos_zone-head_india_central-india': 'pos_zone-head_india_central'
    };
    
    const applications = await Application.find();
    console.log(`📋 Found ${applications.length} applications\n`);
    
    let updated = 0;
    
    for (const app of applications) {
      const oldId = app.positionId;
      const newId = mapping[oldId];
      
      if (newId) {
        console.log(`🔄 ${app.applicantInfo.name}`);
        console.log(`   ${oldId} → ${newId}`);
        
        app.positionId = newId;
        await app.save();
        updated++;
        console.log(`   ✅ Updated\n`);
      }
    }
    
    console.log(`\n✅ Complete! Updated ${updated} applications`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

updateApplicationPositionIds();
