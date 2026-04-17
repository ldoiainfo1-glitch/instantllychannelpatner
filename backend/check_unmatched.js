require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', 'states_districts.csv');
const content = fs.readFileSync(CSV_PATH, 'utf-8').replace(/^\uFEFF/, '');
const lines = content.split('\n').filter(l => l.trim());

const districtMap = new Map();
for (let i = 1; i < lines.length; i++) {
  const parts = lines[i].split(',');
  if (parts.length < 2) continue;
  const state = parts[0].trim();
  const district = parts.slice(1).join(',').trim();
  const norm = district.toLowerCase().replace(/[^a-z0-9]/g, '');
  districtMap.set(norm, { correctName: district, state });
}

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const dbDistricts = await db.collection('locations').distinct('district');

  const noMatch = [];
  for (const dbDistrict of dbDistricts) {
    const norm = dbDistrict.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!districtMap.has(norm)) {
      const sample = await db.collection('locations').findOne(
        { district: dbDistrict },
        { projection: { state: 1, district: 1, tehsil: 1 } }
      );
      noMatch.push({ dbDistrict, state: sample && sample.state, tehsil: sample && sample.tehsil });
    }
  }

  console.log('Total unmatched:', noMatch.length);
  noMatch.forEach(r => {
    console.log(r.dbDistrict + ' | state: ' + r.state + ' | sample tehsil: ' + r.tehsil);
  });

  mongoose.disconnect();
}).catch(e => { console.error(e.message); process.exit(1); });
