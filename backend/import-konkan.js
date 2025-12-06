const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  retryWrites: true,
  w: 'majority'
});

const Location = require('./api/models/Location');

async function importKonkan() {
  try {
    console.log('📥 Reading Konkan CSV file...');
    
    const csvPath = '/Users/muskaan7862407/Desktop/konkan-locations-import.csv';
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    // Skip header
    const dataLines = lines.slice(1);
    
    console.log(`Found ${dataLines.length} Konkan locations to import\n`);
    
    let created = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const line of dataLines) {
      const [country, zone, state, division, district, tehsil, pincode, village] = line.split(',').map(v => v.trim());
      
      if (!zone || !state || !division || !district || !tehsil || !pincode || !village) {
        console.log(`⚠️  Skipping invalid line: ${line}`);
        errors++;
        continue;
      }
      
      try {
        // Check if exists
        const existing = await Location.findOne({
          zone, state, division, district, tehsil, pincode, village
        });
        
        if (existing) {
          console.log(`⏭️  Skipped: ${division}, ${district}, ${village}`);
          skipped++;
          continue;
        }
        
        // Create new
        await Location.create({
          country: country || 'India',
          zone, state, division, district, tehsil, pincode, village
        });
        
        console.log(`✅ Created: ${division}, ${district}, ${village} (${pincode})`);
        created++;
      } catch (err) {
        console.error(`❌ Error: ${village} - ${err.message}`);
        errors++;
      }
    }
    
    console.log(`\n📊 Import Summary:`);
    console.log(`   ✅ Created: ${created} locations`);
    console.log(`   ⏭️  Skipped: ${skipped} (already exist)`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`\n🎉 Konkan division import complete!`);
    
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

importKonkan();
