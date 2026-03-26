/**
 * Import 158,780 location records from CSV into new MongoDB Atlas cluster
 * CSV: locations-backup-2025-12-06T11-53-00.csv
 * Columns: country, zone, state, division, district, tehsil, pincode, village
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const MONGODB_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner.c9tf1jl.mongodb.net/channelpartner?retryWrites=true&w=majority&appName=channelpartner&authSource=admin';
const CSV_FILE = path.join(__dirname, 'locations-backup-2025-12-06T11-53-00.csv');
const BATCH_SIZE = 1000;

const locationSchema = new mongoose.Schema({
  country:  { type: String, default: 'India' },
  zone:     { type: String },
  state:    { type: String },
  division: { type: String },
  district: { type: String },
  tehsil:   { type: String },
  pincode:  { type: String },
  village:  { type: String }
}, { timestamps: true });

locationSchema.index({ zone: 1 });
locationSchema.index({ state: 1 });
locationSchema.index({ division: 1 });
locationSchema.index({ district: 1 });
locationSchema.index({ tehsil: 1 });
locationSchema.index({ pincode: 1 });
locationSchema.index({ village: 1 });

const Location = mongoose.model('Location', locationSchema);

async function importLocations() {
  console.log('🔌 Connecting to new MongoDB Atlas cluster...');
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  console.log('✅ Connected to:', mongoose.connection.name);

  // Check if already has data
  const existing = await Location.countDocuments();
  if (existing > 0) {
    console.log(`⚠️  Already ${existing} locations in DB. Clearing before re-import...`);
    await Location.deleteMany({});
    console.log('🗑️  Cleared existing locations');
  }

  console.log(`📂 Reading CSV: ${CSV_FILE}`);
  const fileStream = fs.createReadStream(CSV_FILE);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let headers = null;
  let batch = [];
  let totalInserted = 0;
  let totalRows = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;

    if (!headers) {
      headers = line.split(',').map(h => h.trim().toLowerCase());
      console.log('📋 CSV Headers:', headers.join(', '));
      continue;
    }

    const values = line.split(',');
    const record = {};
    headers.forEach((h, i) => {
      record[h] = (values[i] || '').trim();
    });

    // Map CSV columns to schema fields
    batch.push({
      country:  record.country  || 'India',
      zone:     record.zone     || '',
      state:    record.state    || '',
      division: record.division || '',
      district: record.district || '',
      tehsil:   record.tehsil   || '',
      pincode:  record.pincode  || '',
      village:  record.village  || ''
    });

    totalRows++;

    if (batch.length >= BATCH_SIZE) {
      await Location.insertMany(batch, { ordered: false });
      totalInserted += batch.length;
      process.stdout.write(`\r⏳ Inserted: ${totalInserted.toLocaleString()} rows...`);
      batch = [];
    }
  }

  // Insert remaining
  if (batch.length > 0) {
    await Location.insertMany(batch, { ordered: false });
    totalInserted += batch.length;
  }

  console.log(`\n\n✅ Import complete!`);
  console.log(`   Total rows read : ${totalRows.toLocaleString()}`);
  console.log(`   Total inserted  : ${totalInserted.toLocaleString()}`);

  // Verify
  const finalCount = await Location.countDocuments();
  console.log(`   DB count verify : ${finalCount.toLocaleString()}`);

  // Show sample distinct counts
  const zones     = await Location.distinct('zone');
  const states    = await Location.distinct('state');
  const districts = await Location.distinct('district');
  console.log(`\n📊 Distinct values:`);
  console.log(`   Zones    : ${zones.length}`);
  console.log(`   States   : ${states.length}`);
  console.log(`   Districts: ${districts.length}`);

  await mongoose.connection.close();
  console.log('\n🎉 Done! Location data is ready in new cluster.');
}

importLocations().catch(e => {
  console.error('❌ Import failed:', e.message);
  process.exit(1);
});
