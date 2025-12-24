/**
 * Fix data formatting issues:
 * 1. Convert state names to proper case (MAHARASHTRA → Maharashtra)
 * 2. Convert district names to proper case (AHMEDNAGAR → Ahmednagar)
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

// Helper function to convert to proper case
function toProperCase(str) {
    if (!str) return str;
    
    // Handle special cases
    const specialCases = {
        'DELHI': 'Delhi',
        'GOA': 'Goa',
        'DAMAN AND DIU': 'Daman and Diu',
        'DADRA AND NAGAR HAVELI': 'Dadra and Nagar Haveli'
    };
    
    const upper = str.toUpperCase();
    if (specialCases[upper]) {
        return specialCases[upper];
    }
    
    // Convert to title case: each word capitalized
    return str.toLowerCase().split(' ').map(word => {
        // Keep small words lowercase if in middle
        if (['and', 'of', 'the'].includes(word) && word !== str.toLowerCase().split(' ')[0]) {
            return word;
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
}

async function fixCasing() {
    try {
        console.log('🔧 Fixing state and district casing...');
        
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get all unique uppercase states and districts
        console.log('\n🔍 Finding uppercase states...');
        const allStates = await Location.distinct('state');
        const uppercaseStates = allStates.filter(s => s && s === s.toUpperCase());
        console.log(`Found ${uppercaseStates.length} uppercase states:`, uppercaseStates.slice(0, 5));

        console.log('\n🔍 Finding uppercase districts...');
        const allDistricts = await Location.distinct('district');
        const uppercaseDistricts = allDistricts.filter(d => d && d === d.toUpperCase());
        console.log(`Found ${uppercaseDistricts.length} uppercase districts (showing first 5):`, uppercaseDistricts.slice(0, 5));

        let totalUpdated = 0;

        // Fix states using bulk updateMany
        console.log('\n🔄 Fixing state names...');
        for (const state of uppercaseStates) {
            const properState = toProperCase(state);
            const result = await Location.updateMany(
                { state: state },
                { $set: { state: properState } }
            );
            console.log(`   ${state} → ${properState}: ${result.modifiedCount} updated`);
            totalUpdated += result.modifiedCount;
        }

        // Fix districts using bulk updateMany
        console.log('\n🔄 Fixing district names...');
        for (const district of uppercaseDistricts) {
            const properDistrict = toProperCase(district);
            const result = await Location.updateMany(
                { district: district },
                { $set: { district: properDistrict } }
            );
            console.log(`   ${district} → ${properDistrict}: ${result.modifiedCount} updated`);
            totalUpdated += result.modifiedCount;
        }

        console.log(`\n✅ Total updated: ${totalUpdated} locations`);

        // Show sample
        console.log('\n📋 Sample locations after update:');
        const samples = await Location.find({ state: 'Maharashtra', district: 'Ahmednagar' }).limit(3);
        samples.forEach(loc => {
            console.log(`   State: ${loc.state}, District: ${loc.district}, Division: ${loc.division}`);
        });

        await mongoose.connection.close();
        console.log('\n✅ Casing fix completed!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

fixCasing();
