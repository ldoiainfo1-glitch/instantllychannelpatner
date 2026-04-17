require('dotenv').config();
const mongoose = require('mongoose');

// These 10 need final correction
const FINAL_FIX = {
  'Dantewada':               'Dakshin Bastar Dantewada',   // Chhattisgarh
  'Khandwa':                 'Khandwa (East Nimar)',         // Madhya Pradesh
  'North Twenty Four Parganas': 'North 24 Parganas',        // West Bengal
  'South Twenty Four Parganas': 'South 24 Parganas',        // West Bengal
  'Firozpur':                'Ferozepur',                    // Punjab
  'Gaurella-Pendra-Marwahi': 'Gaurella Pendra Marwahi',     // Chhattisgarh
  // These are correct names in the CSV already, just the normalizer missed them:
  // Jagitial, Kabirdham, Lepa Rada, Thiruvarur — already correct, skip
};

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const col = db.collection('locations');
  let totalDocs = 0;

  for (const [oldName, newName] of Object.entries(FINAL_FIX)) {
    const result = await col.updateMany(
      { district: oldName },
      { $set: { district: newName, updatedAt: new Date() } }
    );
    totalDocs += result.modifiedCount;
    console.log(`✅ "${oldName}" → "${newName}" (${result.modifiedCount} docs)`);
  }

  console.log(`\n🎉 Done! ${totalDocs} total docs updated.`);
  await mongoose.disconnect();
}).catch(e => { console.error(e.message); process.exit(1); });
