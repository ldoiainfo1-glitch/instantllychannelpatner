/**
 * fix_unmatched_districts.js
 * 
 * Manually maps the 70 unmatched DB district names to their correct
 * names from the states_districts.csv file.
 * 
 * These couldn't be auto-matched because of alternate spellings,
 * old names, or abbreviations used in the postal data.
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Manual mapping: DB value → correct CSV name
const MANUAL_MAP = {
  // West Bengal
  '24 PARAGANAS NORTH':         'North Twenty Four Parganas',
  '24 PARAGANAS SOUTH':         'South Twenty Four Parganas',
  'DINAJPUR DAKSHIN':           'Dakshin Dinajpur',
  'DINAJPUR UTTAR':             'Uttar Dinajpur',
  'MALDAH':                     'Malda',
  'MEDINIPUR EAST':             'Purba Medinipur',
  'MEDINIPUR WEST':             'Paschim Medinipur',

  // Gujarat
  'AHMADABAD':                  'Ahmedabad',
  'ARVALLI':                    'Aravalli',
  'CHHOTAUDEPUR':               'Chhota Udaipur',
  'DOHAD':                      'Dahod',
  'KACHCHH':                    'Kutch',
  'MAHESANA':                   'Mehsana',
  'PANCH MAHALS':               'Panchmahal',

  // Maharashtra
  'AHMEDNAGAR':                 'Ahilyanagar',
  'OSMANABAD':                  'Dharashiv',

  // Andhra Pradesh
  'ANANTAPUR':                  'Ananthapuramu',
  'Konaseema':                  'Dr. B.R. Ambedkar Konaseema',
  'SPSR NELLORE':               'Nellore',
  'VISAKHAPATANAM':             'Visakhapatnam',
  'Y.S.R.':                     'YSR Kadapa',

  // Odisha
  'ANUGUL':                     'Angul',
  'BALESHWAR':                  'Balasore',
  'JAGATSINGHAPUR':             'Jagatsinghpur',
  'JAJAPUR':                    'Jajpur',
  'NABARANGPUR':                'Nabarangapur',
  'SONEPUR':                    'Subarnapur',

  // Karnataka
  'BAGALKOT':                   'Bagalkote',
  'CHAMARAJANAGARA':            'Chamarajanagar',
  'DAVANGERE':                  'Davanagere',
  'VIJAYNAGAR':                 'Vijayanagara',

  // Chhattisgarh
  'BALODA BAZAR':               'Baloda Bazar-Bhatapara',
  'DANTEWADA':                  'Dantewada',
  'Gaurella Pendra Marwahi':    'Gaurella-Pendra-Marwahi',
  'KABIRDHAM':                  'Kabirdham',

  // Madhya Pradesh
  'EAST NIMAR':                 'Khandwa',
  'HOSHANGABAD':                'Narmadapuram',
  'KHARGONE':                   'Khargone (West Nimar)',

  // Delhi
  'CENTRAL':                    'Central Delhi',
  'EAST':                       'East Delhi',
  'NORTH':                      'North Delhi',
  'NORTH EAST':                 'North East Delhi',
  'NORTH WEST':                 'North West Delhi',
  'SOUTH':                      'South Delhi',
  'SOUTH WEST':                 'South West Delhi',
  'WEST':                       'West Delhi',
  'South East':                 'South East Delhi',

  // Sikkim
  'EAST DISTRICT':              'East Sikkim',
  'NORTH DISTRICT':             'North Sikkim',
  'SOUTH DISTRICT':             'South Sikkim',
  'WEST DISTRICT':              'West Sikkim',

  // Punjab
  'FIROZEPUR':                  'Firozpur',

  // Rajasthan
  'GANGANAGAR':                 'Sri Ganganagar',

  // Haryana
  'CHARKI DADRI':               'Charkhi Dadri',

  // Himachal Pradesh
  'LAHUL AND SPITI':            'Lahaul and Spiti',

  // Uttar Pradesh
  'KHERI':                      'Lakhimpur Kheri',
  'SANT KABEER NAGAR':          'Sant Kabir Nagar',

  // Uttarakhand
  'UDAM SINGH NAGAR':           'Udham Singh Nagar',

  // Tamil Nadu
  'KANCHIPURAM':                'Kancheepuram',
  'THIRUVALLUR':                'Tiruvallur',
  'THIRUVARUR':                 'Thiruvarur',
  'TUTICORIN':                  'Thoothukudi',

  // Telangana
  'JANGOAN':                    'Jangaon',
  'JAYASHANKAR BHUPALAPALLY':   'Jayashankar Bhupalpally',
  'Jagitial':                   'Jagitial',

  // Assam
  'KAMRUP METRO':               'Kamrup Metropolitan',
  'SOUTH SALMARA MANCACHAR':    'South Salmara-Mankachar',

  // Puducherry
  'PONDICHERRY':                'Puducherry',

  // Arunachal Pradesh
  'LEPARADA':                   'Lepa Rada',

  // Mizoram
  'SAIHA':                      'Siaha',
};

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const col = db.collection('locations');

  console.log(`🔧 Fixing ${Object.keys(MANUAL_MAP).length} manually mapped districts...\n`);

  let updated = 0;
  let totalDocs = 0;

  for (const [oldName, newName] of Object.entries(MANUAL_MAP)) {
    const count = await col.countDocuments({ district: oldName });
    if (count === 0) {
      console.log(`   ⚠️  Skip (0 docs): "${oldName}"`);
      continue;
    }
    const result = await col.updateMany(
      { district: oldName },
      { $set: { district: newName, updatedAt: new Date() } }
    );
    totalDocs += result.modifiedCount;
    updated++;
    console.log(`   ✅ "${oldName}" → "${newName}" (${result.modifiedCount} docs)`);
  }

  console.log(`\n🎉 Done!`);
  console.log(`   Districts fixed: ${updated}`);
  console.log(`   Total rows updated: ${totalDocs}`);

  // Final check — how many still unmatched
  const CSV_PATH = require('path').join(__dirname, '..', 'states_districts.csv');
  const fs = require('fs');
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8').replace(/^\uFEFF/, '');
  const csvLines = csvContent.split('\n').filter(l => l.trim());
  const districtMap = new Set();
  for (let i = 1; i < csvLines.length; i++) {
    const parts = csvLines[i].split(',');
    if (parts.length < 2) continue;
    const district = parts.slice(1).join(',').trim();
    districtMap.add(district.toLowerCase().replace(/[^a-z0-9]/g, ''));
  }

  const remaining = await col.distinct('district');
  const stillUnmatched = remaining.filter(d => {
    const norm = d.toLowerCase().replace(/[^a-z0-9]/g, '');
    return !districtMap.has(norm);
  });

  console.log(`\n📊 Still unmatched after fix: ${stillUnmatched.length}`);
  if (stillUnmatched.length > 0) {
    console.log('   Remaining:', stillUnmatched.join(', '));
  }

  await mongoose.disconnect();
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
