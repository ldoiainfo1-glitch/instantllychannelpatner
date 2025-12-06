const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI);

const Location = require('./api/models/Location');

async function checkDivisions() {
  try {
    console.log('🔍 Checking division data...\n');
    
    // Get all unique divisions
    const allDivisions = await Location.distinct('division');
    console.log(`📊 Total unique divisions: ${allDivisions.length}\n`);
    
    // Check Konkan specifically
    const konkanVariations = allDivisions.filter(d => 
      d.toLowerCase().includes('konkan') || d.toLowerCase().includes('konkon')
    );
    
    console.log('🔍 Konkan-related divisions:');
    if (konkanVariations.length > 0) {
      konkanVariations.forEach(d => console.log(`   ✅ "${d}"`));
      
      // Count locations for each
      for (const div of konkanVariations) {
        const count = await Location.countDocuments({ division: div });
        console.log(`      → ${count} locations`);
      }
    } else {
      console.log('   ❌ No Konkan division found!');
    }
    
    // Check Mumbai-related divisions
    console.log('\n🔍 Mumbai-related divisions:');
    const mumbaiDivisions = allDivisions.filter(d => 
      d.toLowerCase().includes('mumbai')
    );
    
    if (mumbaiDivisions.length > 0) {
      for (const div of mumbaiDivisions) {
        const count = await Location.countDocuments({ division: div });
        console.log(`   "${div}" → ${count} locations`);
      }
    }
    
    // Check Maharashtra state divisions
    console.log('\n🔍 Maharashtra divisions:');
    const mhDivisions = await Location.distinct('division', { state: 'Maharashtra' });
    console.log(`   Found ${mhDivisions.length} divisions in Maharashtra:`);
    mhDivisions.slice(0, 20).forEach(d => console.log(`   - ${d}`));
    if (mhDivisions.length > 20) {
      console.log(`   ... and ${mhDivisions.length - 20} more`);
    }
    
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkDivisions();
