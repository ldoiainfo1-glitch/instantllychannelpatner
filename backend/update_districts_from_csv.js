/**
 * update_districts_from_csv.js
 * 
 * Reads states_districts.csv and updates the district field
 * in the locations collection to use the correct proper-case names.
 * 
 * Strategy: case-insensitive match between DB district and CSV district,
 * then update DB record to use the CSV version (correct spelling/case).
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CSV_PATH = path.join(__dirname, '..', 'states_districts.csv');

// ── Parse CSV ────────────────────────────────────────────────────────────────
function parseCSV() {
  const content = fs.readFileSync(CSV_PATH, 'utf-8').replace(/^\uFEFF/, '');
  const lines = content.split('\n').filter(l => l.trim());
  
  // Map: normalized_district_name → correct_name
  const districtMap = new Map(); // normalized → { correctName, state }
  // Map: normalized_state → correct_state
  const stateMap = new Map();

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < 2) continue;
    const state = parts[0].trim();
    const district = parts.slice(1).join(',').trim(); // handle commas in district names
    
    const normDistrict = district.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normState = state.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    districtMap.set(normDistrict, { correctName: district, state });
    stateMap.set(normState, state);
  }
  
  console.log(`📄 CSV loaded: ${districtMap.size} districts across ${stateMap.size} states`);
  return { districtMap, stateMap };
}

async function main() {
  const { districtMap, stateMap } = parseCSV();

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const col = db.collection('locations');

  // Get all distinct districts from DB
  const dbDistricts = await col.distinct('district');
  console.log(`\n🗄️  DB has ${dbDistricts.length} unique district names\n`);

  // Build update map: old DB district value → new correct value
  const updateMap = new Map();
  const noMatch = [];

  for (const dbDistrict of dbDistricts) {
    const normDb = dbDistrict.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (districtMap.has(normDb)) {
      const { correctName } = districtMap.get(normDb);
      if (correctName !== dbDistrict) {
        updateMap.set(dbDistrict, correctName);
      }
    } else {
      noMatch.push(dbDistrict);
    }
  }

  console.log(`✅ Matched & need update: ${updateMap.size}`);
  console.log(`⚠️  No match found: ${noMatch.length}`);
  
  if (noMatch.length > 0) {
    console.log('   Unmatched districts:', noMatch.slice(0, 30).join(', '));
  }

  // Preview first 20 updates
  console.log('\n📋 Preview of updates:');
  let previewCount = 0;
  for (const [oldName, newName] of updateMap) {
    if (previewCount >= 20) { console.log('   ... and more'); break; }
    console.log(`   "${oldName}" → "${newName}"`);
    previewCount++;
  }

  if (updateMap.size === 0) {
    console.log('\n✅ All districts already have correct names! Nothing to update.');
    await mongoose.disconnect();
    return;
  }

  // ── Perform bulk updates ──────────────────────────────────────────────────
  console.log(`\n🚀 Updating ${updateMap.size} district names in DB...`);
  let updated = 0;
  let totalDocsUpdated = 0;

  for (const [oldName, newName] of updateMap) {
    const result = await col.updateMany(
      { district: oldName },
      { $set: { district: newName, updatedAt: new Date() } }
    );
    totalDocsUpdated += result.modifiedCount;
    updated++;
    process.stdout.write(`\r   Progress: ${updated}/${updateMap.size} districts, ${totalDocsUpdated} docs updated`);
  }

  console.log(`\n\n🎉 Done!`);
  console.log(`   Districts renamed: ${updated}`);
  console.log(`   Total rows updated: ${totalDocsUpdated}`);

  // ── Also update state names if needed ──────────────────────────────────────
  console.log('\n🗺️  Checking state names...');
  const dbStates = await col.distinct('state');
  let statesUpdated = 0;
  let stateDocsUpdated = 0;

  for (const dbState of dbStates) {
    const normDb = dbState.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (stateMap.has(normDb)) {
      const correctState = stateMap.get(normDb);
      if (correctState !== dbState) {
        const result = await col.updateMany(
          { state: dbState },
          { $set: { state: correctState, updatedAt: new Date() } }
        );
        stateDocsUpdated += result.modifiedCount;
        statesUpdated++;
        console.log(`   State: "${dbState}" → "${correctState}" (${result.modifiedCount} docs)`);
      }
    }
  }

  if (statesUpdated === 0) {
    console.log('   ✅ All state names already correct!');
  } else {
    console.log(`   Updated ${statesUpdated} state names, ${stateDocsUpdated} docs`);
  }

  // ── Verify ─────────────────────────────────────────────────────────────────
  console.log('\n✅ Sample districts after update:');
  const verifyDistricts = await col.distinct('district');
  console.log('  ', verifyDistricts.slice(0, 20).join(', '));

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
