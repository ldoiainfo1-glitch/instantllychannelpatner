/**
 * Fix Incomplete Position IDs
 * 
 * This script fixes position IDs that are missing zone/state/parent levels
 * by querying the Location collection and rebuilding the full hierarchy.
 * 
 * Example:
 * Before: pos_division-head_india_nashik-khandesh
 * After:  pos_division-head_india_west-zone_maharashtra_nashik-khandesh
 */

const mongoose = require('mongoose');
const Application = require('../api/models/Application');
const Location = require('../api/models/Location');

// MongoDB connection - use production database
const MONGODB_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner?retryWrites=true&w=majority';

async function fixIncompletePositionIds() {
    try {
        console.log('🔧 Starting position ID fix...');
        
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        // Find all applications with position IDs
        const applications = await Application.find({ 
            positionId: { $exists: true },
            status: { $in: ['approved', 'pending', 'rejected'] }
        });
        
        console.log(`📊 Found ${applications.length} applications to check`);
        
        let fixedCount = 0;
        let errorCount = 0;
        
        for (const app of applications) {
            try {
                const oldPositionId = app.positionId;
                
                // Parse the position ID
                const parts = oldPositionId.split('_');
                if (parts.length < 3) {
                    console.log(`⚠️  Skipping invalid ID: ${oldPositionId}`);
                    continue;
                }
                
                // Extract level and location info
                const levelPart = parts[1]; // e.g., "division-head"
                const level = levelPart.replace('-head', '');
                
                // Skip if already complete (has enough parts)
                // Complete IDs should have: pos, level-head, country, zone, state, division (for division level)
                const expectedParts = {
                    'village': 9,    // pos_village-head_country_zone_state_division_district_tehsil_pincode_village
                    'pincode': 8,    // pos_pincode-head_country_zone_state_division_district_tehsil_pincode
                    'tehsil': 7,     // pos_tehsil-head_country_zone_state_division_district_tehsil
                    'district': 6,   // pos_district-head_country_zone_state_division_district
                    'division': 5,   // pos_division-head_country_zone_state_division
                    'state': 4,      // pos_state-head_country_zone_state
                    'zone': 3,       // pos_zone-head_country_zone
                    'india': 2       // pos_india-head_country
                };
                
                const expected = expectedParts[level];
                if (!expected) {
                    console.log(`⚠️  Unknown level: ${level} in ${oldPositionId}`);
                    continue;
                }
                
                if (parts.length >= expected + 1) {
                    // Already complete
                    continue;
                }
                
                console.log(`\n🔍 Fixing incomplete ID: ${oldPositionId}`);
                console.log(`   Level: ${level}, Parts: ${parts.length}/${expected + 1}`);
                
                // Get the last part which should be the actual location name
                const locationName = parts[parts.length - 1].replace(/-/g, ' ');
                console.log(`   Location name: ${locationName}`);
                
                // Query Location collection to find full hierarchy
                let query = {};
                
                if (level === 'division') {
                    query = { division: new RegExp(`^${locationName}$`, 'i') };
                } else if (level === 'district') {
                    query = { district: new RegExp(`^${locationName}$`, 'i') };
                } else if (level === 'tehsil') {
                    query = { tehsil: new RegExp(`^${locationName}$`, 'i') };
                } else if (level === 'pincode') {
                    query = { pincode: locationName };
                } else if (level === 'village') {
                    query = { village: new RegExp(`^${locationName}$`, 'i') };
                } else if (level === 'state') {
                    query = { state: new RegExp(`^${locationName}$`, 'i') };
                } else if (level === 'zone') {
                    query = { zone: new RegExp(`^${locationName}$`, 'i') };
                }
                
                const locationDoc = await Location.findOne(query);
                
                if (!locationDoc) {
                    console.log(`❌ Location not found in database: ${locationName}`);
                    errorCount++;
                    continue;
                }
                
                console.log(`   Found location:`, {
                    zone: locationDoc.zone,
                    state: locationDoc.state,
                    division: locationDoc.division,
                    district: locationDoc.district,
                    tehsil: locationDoc.tehsil,
                    pincode: locationDoc.pincode,
                    village: locationDoc.village
                });
                
                // Build new position ID with full hierarchy
                const newPositionId = generatePositionId(level, locationDoc);
                
                if (newPositionId === oldPositionId) {
                    console.log(`   ✓ Already correct`);
                    continue;
                }
                
                console.log(`   Old: ${oldPositionId}`);
                console.log(`   New: ${newPositionId}`);
                
                // Update the application
                app.positionId = newPositionId;
                await app.save();
                
                console.log(`   ✅ Fixed!`);
                fixedCount++;
                
            } catch (error) {
                console.error(`❌ Error processing application ${app._id}:`, error.message);
                errorCount++;
            }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log(`✅ Fix complete!`);
        console.log(`   Fixed: ${fixedCount}`);
        console.log(`   Errors: ${errorCount}`);
        console.log(`   Total checked: ${applications.length}`);
        console.log('='.repeat(60));
        
    } catch (error) {
        console.error('❌ Fatal error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB');
    }
}

// Generate position ID from location document
function generatePositionId(level, location) {
    const parts = ['pos', `${level}-head`];
    
    // Always add country
    parts.push('india');
    
    // Add hierarchy based on level
    if (level === 'zone') {
        if (location.zone) parts.push(location.zone.toLowerCase().replace(/\s+/g, '-'));
    } else if (level === 'state') {
        if (location.zone) parts.push(location.zone.toLowerCase().replace(/\s+/g, '-'));
        if (location.state) parts.push(location.state.toLowerCase().replace(/\s+/g, '-'));
    } else if (level === 'division') {
        if (location.zone) parts.push(location.zone.toLowerCase().replace(/\s+/g, '-'));
        if (location.state) parts.push(location.state.toLowerCase().replace(/\s+/g, '-'));
        if (location.division) parts.push(location.division.toLowerCase().replace(/\s+/g, '-'));
    } else if (level === 'district') {
        if (location.zone) parts.push(location.zone.toLowerCase().replace(/\s+/g, '-'));
        if (location.state) parts.push(location.state.toLowerCase().replace(/\s+/g, '-'));
        if (location.division) parts.push(location.division.toLowerCase().replace(/\s+/g, '-'));
        if (location.district) parts.push(location.district.toLowerCase().replace(/\s+/g, '-'));
    } else if (level === 'tehsil') {
        if (location.zone) parts.push(location.zone.toLowerCase().replace(/\s+/g, '-'));
        if (location.state) parts.push(location.state.toLowerCase().replace(/\s+/g, '-'));
        if (location.division) parts.push(location.division.toLowerCase().replace(/\s+/g, '-'));
        if (location.district) parts.push(location.district.toLowerCase().replace(/\s+/g, '-'));
        if (location.tehsil) parts.push(location.tehsil.toLowerCase().replace(/\s+/g, '-'));
    } else if (level === 'pincode') {
        if (location.zone) parts.push(location.zone.toLowerCase().replace(/\s+/g, '-'));
        if (location.state) parts.push(location.state.toLowerCase().replace(/\s+/g, '-'));
        if (location.division) parts.push(location.division.toLowerCase().replace(/\s+/g, '-'));
        if (location.district) parts.push(location.district.toLowerCase().replace(/\s+/g, '-'));
        if (location.tehsil) parts.push(location.tehsil.toLowerCase().replace(/\s+/g, '-'));
        if (location.pincode) parts.push(location.pincode);
    } else if (level === 'village') {
        if (location.zone) parts.push(location.zone.toLowerCase().replace(/\s+/g, '-'));
        if (location.state) parts.push(location.state.toLowerCase().replace(/\s+/g, '-'));
        if (location.division) parts.push(location.division.toLowerCase().replace(/\s+/g, '-'));
        if (location.district) parts.push(location.district.toLowerCase().replace(/\s+/g, '-'));
        if (location.tehsil) parts.push(location.tehsil.toLowerCase().replace(/\s+/g, '-'));
        if (location.pincode) parts.push(location.pincode);
        if (location.village) parts.push(location.village.toLowerCase().replace(/\s+/g, '-'));
    }
    
    return parts.join('_');
}

// Run the script
fixIncompletePositionIds();
