const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

// Use existing Position model
const Position = require('./api/models/Position');

// Store unique locations at each level
const uniqueLocations = {
  country: new Set(),
  zones: new Map(), // Map<country, Set<zone>>
  states: new Map(), // Map<zone, Set<state>>
  divisions: new Map(), // Map<state, Set<division>>
  districts: new Map(), // Map<division, Set<district>>
  tehsils: new Map(), // Map<district, Set<tehsil>>
  pincodes: new Map(), // Map<tehsil, Set<pincode>>
  villages: new Map() // Map<pincode, Set<village>>
};

// Read and parse CSV
async function readCSV() {
  return new Promise((resolve, reject) => {
    const results = [];
    const csvPath = path.join(__dirname, '..', 'location-transformed.csv');
    
    console.log('📖 Reading CSV file:', csvPath);
    
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        console.log(`✅ Read ${results.length} rows from CSV`);
        resolve(results);
      })
      .on('error', reject);
  });
}

// Process CSV data to extract unique locations
function processLocations(data) {
  console.log('🔍 Processing location hierarchy...');
  
  data.forEach((row) => {
    const country = row.country?.trim() || 'India';
    const zone = row.zone?.trim();
    const state = row.state?.trim();
    const division = row.division?.trim();
    const district = row.district?.trim();
    const taluka = row.taluka?.trim(); // tehsil
    const pincode = row.pincode?.trim();
    const postOffice = row.postOffice?.trim(); // village
    
    // Country
    if (country) uniqueLocations.country.add(country);
    
    // Zone
    if (zone) {
      if (!uniqueLocations.zones.has(country)) {
        uniqueLocations.zones.set(country, new Set());
      }
      uniqueLocations.zones.get(country).add(zone);
    }
    
    // State
    if (state) {
      const zoneKey = `${country}|${zone}`;
      if (!uniqueLocations.states.has(zoneKey)) {
        uniqueLocations.states.set(zoneKey, new Set());
      }
      uniqueLocations.states.get(zoneKey).add(state);
    }
    
    // Division
    if (division) {
      const stateKey = `${country}|${zone}|${state}`;
      if (!uniqueLocations.divisions.has(stateKey)) {
        uniqueLocations.divisions.set(stateKey, new Set());
      }
      uniqueLocations.divisions.get(stateKey).add(division);
    }
    
    // District
    if (district) {
      const divisionKey = `${country}|${zone}|${state}|${division}`;
      if (!uniqueLocations.districts.has(divisionKey)) {
        uniqueLocations.districts.set(divisionKey, new Set());
      }
      uniqueLocations.districts.get(divisionKey).add(district);
    }
    
    // Tehsil
    if (taluka) {
      const districtKey = `${country}|${zone}|${state}|${division}|${district}`;
      if (!uniqueLocations.tehsils.has(districtKey)) {
        uniqueLocations.tehsils.set(districtKey, new Set());
      }
      uniqueLocations.tehsils.get(districtKey).add(taluka);
    }
    
    // Pincode
    if (pincode) {
      const tehsilKey = `${country}|${zone}|${state}|${division}|${district}|${taluka}`;
      if (!uniqueLocations.pincodes.has(tehsilKey)) {
        uniqueLocations.pincodes.set(tehsilKey, new Set());
      }
      uniqueLocations.pincodes.get(tehsilKey).add(pincode);
    }
    
    // Village (Post Office)
    if (postOffice) {
      const pincodeKey = `${country}|${zone}|${state}|${division}|${district}|${taluka}|${pincode}`;
      if (!uniqueLocations.villages.has(pincodeKey)) {
        uniqueLocations.villages.set(pincodeKey, new Set());
      }
      uniqueLocations.villages.get(pincodeKey).add(postOffice);
    }
  });
  
  console.log('📊 Location Statistics:');
  console.log(`  Countries: ${uniqueLocations.country.size}`);
  console.log(`  Zones: ${Array.from(uniqueLocations.zones.values()).reduce((sum, set) => sum + set.size, 0)}`);
  console.log(`  States: ${Array.from(uniqueLocations.states.values()).reduce((sum, set) => sum + set.size, 0)}`);
  console.log(`  Divisions: ${Array.from(uniqueLocations.divisions.values()).reduce((sum, set) => sum + set.size, 0)}`);
  console.log(`  Districts: ${Array.from(uniqueLocations.districts.values()).reduce((sum, set) => sum + set.size, 0)}`);
  console.log(`  Tehsils: ${Array.from(uniqueLocations.tehsils.values()).reduce((sum, set) => sum + set.size, 0)}`);
  console.log(`  Pincodes: ${Array.from(uniqueLocations.pincodes.values()).reduce((sum, set) => sum + set.size, 0)}`);
  console.log(`  Villages: ${Array.from(uniqueLocations.villages.values()).reduce((sum, set) => sum + set.size, 0)}`);
}

// Generate positions for all levels
function generatePositions() {
  const positions = [];
  let sNo = 1;
  
  console.log('🏗️  Generating positions...');
  
  // 1. Country level
  uniqueLocations.country.forEach(country => {
    positions.push({
      sNo: sNo++,
      post: 'President',
      designation: `President of ${country}`,
      location: {
        country: country,
        zone: '',
        state: '',
        division: '',
        district: '',
        tehsil: '',
        pincode: '',
        village: ''
      },
      contribution: 500000,
      status: 'Available'
    });
  });
  
  // 2. Zone level
  uniqueLocations.zones.forEach((zones, country) => {
    zones.forEach(zone => {
      positions.push({
        sNo: sNo++,
        post: 'Zone Head',
        designation: `Zone Head of ${zone}`,
        location: {
          country: country,
          zone: zone,
          state: '',
          division: '',
          district: '',
          tehsil: '',
          pincode: '',
          village: ''
        },
        contribution: 400000,
        status: 'Available'
      });
    });
  });
  
  // 3. State level
  uniqueLocations.states.forEach((states, zoneKey) => {
    const [country, zone] = zoneKey.split('|');
    states.forEach(state => {
      positions.push({
        sNo: sNo++,
        post: 'State Head',
        designation: `State Head of ${state}`,
        location: {
          country: country,
          zone: zone,
          state: state,
          division: '',
          district: '',
          tehsil: '',
          pincode: '',
          village: ''
        },
        contribution: 300000,
        status: 'Available'
      });
    });
  });
  
  // 4. Division level
  uniqueLocations.divisions.forEach((divisions, stateKey) => {
    const [country, zone, state] = stateKey.split('|');
    divisions.forEach(division => {
      positions.push({
        sNo: sNo++,
        post: 'Division Head',
        designation: `Division Head of ${division}`,
        location: {
          country: country,
          zone: zone,
          state: state,
          division: division,
          district: '',
          tehsil: '',
          pincode: '',
          village: ''
        },
        contribution: 200000,
        status: 'Available'
      });
    });
  });
  
  // 5. District level
  uniqueLocations.districts.forEach((districts, divisionKey) => {
    const [country, zone, state, division] = divisionKey.split('|');
    districts.forEach(district => {
      positions.push({
        sNo: sNo++,
        post: 'District Head',
        designation: `District Head of ${district}`,
        location: {
          country: country,
          zone: zone,
          state: state,
          division: division,
          district: district,
          tehsil: '',
          pincode: '',
          village: ''
        },
        contribution: 150000,
        status: 'Available'
      });
    });
  });
  
  // 6. Tehsil level
  uniqueLocations.tehsils.forEach((tehsils, districtKey) => {
    const [country, zone, state, division, district] = districtKey.split('|');
    tehsils.forEach(tehsil => {
      positions.push({
        sNo: sNo++,
        post: 'Tehsil Head',
        designation: `Tehsil Head of ${tehsil}`,
        location: {
          country: country,
          zone: zone,
          state: state,
          division: division,
          district: district,
          tehsil: tehsil,
          pincode: '',
          village: ''
        },
        contribution: 100000,
        status: 'Available'
      });
    });
  });
  
  // 7. Pincode level
  uniqueLocations.pincodes.forEach((pincodes, tehsilKey) => {
    const [country, zone, state, division, district, tehsil] = tehsilKey.split('|');
    pincodes.forEach(pincode => {
      positions.push({
        sNo: sNo++,
        post: 'Pincode Head',
        designation: `Pincode Head of ${pincode}`,
        location: {
          country: country,
          zone: zone,
          state: state,
          division: division,
          district: district,
          tehsil: tehsil,
          pincode: pincode,
          village: ''
        },
        contribution: 50000,
        status: 'Available'
      });
    });
  });
  
  // 8. Village level
  uniqueLocations.villages.forEach((villages, pincodeKey) => {
    const [country, zone, state, division, district, tehsil, pincode] = pincodeKey.split('|');
    villages.forEach(village => {
      positions.push({
        sNo: sNo++,
        post: 'Village Head',
        designation: `Village Head of ${village}`,
        location: {
          country: country,
          zone: zone,
          state: state,
          division: division,
          district: district,
          tehsil: tehsil,
          pincode: pincode,
          village: village
        },
        contribution: 25000,
        status: 'Available'
      });
    });
  });
  
  console.log(`✅ Generated ${positions.length} positions`);
  return positions;
}

// Main function
async function main() {
  try {
    console.log('🚀 Starting position import from CSV...\n');
    
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Read CSV
    const csvData = await readCSV();
    
    // Process locations
    processLocations(csvData);
    
    // Generate positions
    const positions = generatePositions();
    
    // Delete old positions
    console.log('\n🗑️  Deleting old positions...');
    const deleteResult = await Position.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} old positions\n`);
    
    // Insert new positions in batches
    console.log('💾 Inserting new positions...');
    const batchSize = 1000;
    let inserted = 0;
    
    for (let i = 0; i < positions.length; i += batchSize) {
      const batch = positions.slice(i, i + batchSize);
      await Position.insertMany(batch);
      inserted += batch.length;
      console.log(`  Inserted ${inserted}/${positions.length} positions...`);
    }
    
    console.log(`\n✅ Successfully imported ${inserted} positions!`);
    console.log('\n📊 Summary by Level:');
    console.log(`  President: 1`);
    console.log(`  Zone Heads: ${Array.from(uniqueLocations.zones.values()).reduce((sum, set) => sum + set.size, 0)}`);
    console.log(`  State Heads: ${Array.from(uniqueLocations.states.values()).reduce((sum, set) => sum + set.size, 0)}`);
    console.log(`  Division Heads: ${Array.from(uniqueLocations.divisions.values()).reduce((sum, set) => sum + set.size, 0)}`);
    console.log(`  District Heads: ${Array.from(uniqueLocations.districts.values()).reduce((sum, set) => sum + set.size, 0)}`);
    console.log(`  Tehsil Heads: ${Array.from(uniqueLocations.tehsils.values()).reduce((sum, set) => sum + set.size, 0)}`);
    console.log(`  Pincode Heads: ${Array.from(uniqueLocations.pincodes.values()).reduce((sum, set) => sum + set.size, 0)}`);
    console.log(`  Village Heads: ${Array.from(uniqueLocations.villages.values()).reduce((sum, set) => sum + set.size, 0)}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run
main();
