const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI);

const Location = require('./api/models/Location');

async function fixMumbaiDivisions() {
  try {
    console.log('🔍 Finding Mumbai division entries...\n');
    
    // Find all Mumbai-related divisions
    const mumbaiDivisions = [
      'Mumbai Eastern Division',
      'Mumbai Western Division', 
      'Navi Mumbai Division',
      'South Mumbai'
    ];
    
    for (const oldDivision of mumbaiDivisions) {
      const count = await Location.countDocuments({ division: oldDivision });
      console.log(`📊 Found ${count} locations with division: "${oldDivision}"`);
      
      if (count > 0) {
        // Update to Konkan division
        const result = await Location.updateMany(
          { division: oldDivision },
          { 
            $set: { 
              division: 'Konkan',
              state: 'Maharashtra',
              zone: 'West'
            } 
          }
        );
        
        console.log(`   ✅ Updated ${result.modifiedCount} locations to "Konkan" division\n`);
      }
    }
    
    // Verify the fix
    console.log('✅ Verification:');
    const konkanCount = await Location.countDocuments({ division: 'Konkan' });
    console.log(`   Total Konkan division locations: ${konkanCount}`);
    
    const remainingMumbai = await Location.countDocuments({ 
      division: { $in: mumbaiDivisions } 
    });
    console.log(`   Remaining Mumbai divisions: ${remainingMumbai}`);
    
    console.log('\n🎉 Mumbai divisions fixed! All are now under "Konkan" division.');
    
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixMumbaiDivisions();
