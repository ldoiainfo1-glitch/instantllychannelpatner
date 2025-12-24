/**
 * Fix uppercase division names to proper case
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

function toProperCase(str) {
    if (!str) return str;
    return str.toLowerCase().split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

async function fixDivisions() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');
        
        console.log('🔧 Fixing uppercase divisions...\n');
        
        // Get all uppercase divisions
        const allDivisions = await Location.distinct('division');
        const uppercaseDivisions = allDivisions.filter(d => d && d === d.toUpperCase());
        
        console.log(`Found ${uppercaseDivisions.length} uppercase divisions\n`);
        
        let totalUpdated = 0;
        for (const div of uppercaseDivisions) {
            const properDiv = toProperCase(div);
            const result = await Location.updateMany(
                { division: div },
                { $set: { division: properDiv } }
            );
            if (result.modifiedCount > 0) {
                console.log(`  ${div} → ${properDiv}: ${result.modifiedCount} updated`);
                totalUpdated += result.modifiedCount;
            }
        }
        
        console.log(`\n✅ Total: ${totalUpdated} locations updated`);
        
        // Verify Bengaluru
        console.log('\n📋 Sample Bengaluru Urban after fix:');
        const sample = await Location.findOne({ district: 'Bengaluru Urban' });
        console.log(`  Zone: ${sample.zone}`);
        console.log(`  State: ${sample.state}`);
        console.log(`  Division: ${sample.division}`);
        console.log(`  District: ${sample.district}`);
        
        await mongoose.connection.close();
        console.log('\n✅ Fix completed!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

fixDivisions();
