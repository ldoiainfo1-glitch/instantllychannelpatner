const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/instantly-cards', {
  retryWrites: true,
  w: 'majority'
});

const Location = require('./api/models/Location');

async function exportLocations() {
  try {
    console.log('🔍 Fetching all locations from database...');
    
    const locations = await Location.find({}).lean();
    
    console.log(`✅ Found ${locations.length} locations in database`);
    
    // Create CSV content
    const csvHeader = 'country,zone,state,division,district,tehsil,pincode,village\n';
    const csvRows = locations.map(loc => 
      `${loc.country || 'India'},${loc.zone},${loc.state},${loc.division},${loc.district},${loc.tehsil},${loc.pincode},${loc.village}`
    ).join('\n');
    
    const csvContent = csvHeader + csvRows;
    
    // Save to file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `locations-backup-${timestamp}.csv`;
    const filepath = path.join(__dirname, filename);
    
    fs.writeFileSync(filepath, csvContent);
    
    console.log(`\n✅ Export complete!`);
    console.log(`📁 File saved: ${filename}`);
    console.log(`📊 Total locations exported: ${locations.length}`);
    
    // Show summary by division
    const divisionCounts = {};
    locations.forEach(loc => {
      divisionCounts[loc.division] = (divisionCounts[loc.division] || 0) + 1;
    });
    
    console.log('\n📈 Locations by Division:');
    Object.entries(divisionCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([division, count]) => {
        console.log(`   ${division}: ${count} locations`);
      });
    
    // Check if Konkan exists
    const konkanVariations = locations.filter(loc => 
      loc.division.toLowerCase().includes('konkan') || 
      loc.division.toLowerCase().includes('konkon')
    );
    
    console.log(`\n🔍 Konkan/konkon division check:`);
    if (konkanVariations.length > 0) {
      console.log(`   ✅ Found ${konkanVariations.length} locations with Konkan division`);
      console.log(`   Spelling used: "${konkanVariations[0].division}"`);
    } else {
      console.log(`   ⚠️  No Konkan/konkon division found - safe to import!`);
    }
    
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

exportLocations();
