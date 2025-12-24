/**
 * Add "Zone" suffix to all zone names
 * Central → Central Zone
 * East → East Zone, etc.
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const locationSchema = new mongoose.Schema({
    country: String,
    zone: String,
    state: String,
    division: String,
    district: String,
    tehsil: String,
    pincode: String,
    village: String
}, { timestamps: true });

const Location = mongoose.model('Location', locationSchema);

async function addZoneSuffix() {
    try {
        console.log('🔧 Adding "Zone" suffix to all zones...');
        
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const zoneMapping = {
            'Central': 'Central Zone',
            'East': 'East Zone',
            'North': 'North Zone',
            'South': 'South Zone',
            'West': 'West Zone',
            'North East': 'North East Zone'
        };

        console.log('\n📊 Current zones:');
        for (const [oldName, newName] of Object.entries(zoneMapping)) {
            const count = await Location.countDocuments({ zone: oldName });
            console.log(`   ${oldName}: ${count} locations → ${newName}`);
        }

        console.log('\n🔄 Updating zones...');
        let totalUpdated = 0;

        for (const [oldName, newName] of Object.entries(zoneMapping)) {
            const result = await Location.updateMany(
                { zone: oldName },
                { $set: { zone: newName } }
            );
            console.log(`✅ ${oldName} → ${newName}: ${result.modifiedCount} updated`);
            totalUpdated += result.modifiedCount;
        }

        console.log(`\n✅ Total updated: ${totalUpdated} locations`);

        // Verify final zones
        console.log('\n📊 Final zones:');
        const finalZones = await Location.distinct('zone');
        for (const zone of finalZones.sort()) {
            const count = await Location.countDocuments({ zone });
            console.log(`   ${zone}: ${count} locations`);
        }

        await mongoose.connection.close();
        console.log('\n✅ Zone suffix added successfully!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

addZoneSuffix();
