/**
 * Fix zone names in database
 * 1. Rename "Western" to "West"
 * 2. Delete all "Unknown" zone locations (689 records)
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

async function fixZones() {
    try {
        console.log('🔧 Starting zone cleanup...');
        
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Step 1: Count current zones
        console.log('\n📊 Current zone distribution:');
        const zones = await Location.distinct('zone');
        for (const zone of zones.sort()) {
            const count = await Location.countDocuments({ zone });
            console.log(`   ${zone}: ${count} locations`);
        }

        // Step 2: Rename "Western" to "West"
        console.log('\n🔄 Renaming "Western" to "West"...');
        const westernResult = await Location.updateMany(
            { zone: 'Western' },
            { $set: { zone: 'West' } }
        );
        console.log(`✅ Updated ${westernResult.modifiedCount} locations from Western to West`);

        // Step 3: Delete "Unknown" zone locations
        console.log('\n🗑️  Deleting "Unknown" zone locations...');
        const deleteResult = await Location.deleteMany({ zone: 'Unknown' });
        console.log(`✅ Deleted ${deleteResult.deletedCount} Unknown zone locations`);

        // Step 4: Verify final zones
        console.log('\n✅ Final zone distribution:');
        const finalZones = await Location.distinct('zone');
        for (const zone of finalZones.sort()) {
            const count = await Location.countDocuments({ zone });
            console.log(`   ${zone}: ${count} locations`);
        }

        const totalCount = await Location.countDocuments();
        console.log(`\n📊 Total locations remaining: ${totalCount}`);

        await mongoose.connection.close();
        console.log('✅ Zone cleanup completed successfully!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

fixZones();
