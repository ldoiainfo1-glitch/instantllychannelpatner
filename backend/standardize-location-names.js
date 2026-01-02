/**
 * Standardize Location Names in Database
 * 
 * This script updates all location names to use shorter, consistent formats
 * so that both admin panel and channel partner site display matching data.
 * 
 * Example transformations:
 * - "West Zone" -> "West"  
 * - "MAHARASHTRA" -> "Maharashtra"
 * - "Nagpur City Division" -> "Nagpur City"
 * - "NAGPUR" -> "Nagpur"
 */

const mongoose = require('mongoose');

// MongoDB Connection
const MONGODB_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner.oe0ixs2.mongodb.net/channelpartner';

// Import models
const Location = require('./api/models/Location');
const Position = require('./api/models/Position');
const Application = require('./api/models/Application');

// Standardization rules
const standardizationRules = {
    zone: {
        'WEST ZONE': 'West',
        'West Zone': 'West',
        'WEST': 'West',
        'EAST ZONE': 'East',
        'East Zone': 'East',
        'EAST': 'East',
        'NORTH ZONE': 'North',
        'North Zone': 'North',
        'NORTH': 'North',
        'SOUTH ZONE': 'South',
        'South Zone': 'South',
        'SOUTH': 'South',
        'CENTRAL ZONE': 'Central',
        'Central Zone': 'Central',
        'CENTRAL': 'Central'
    },
    state: {
        'MAHARASHTRA': 'Maharashtra',
        'KARNATAKA': 'Karnataka',
        'TAMIL NADU': 'Tamil Nadu',
        'KERALA': 'Kerala',
        'GOA': 'Goa',
        'GUJARAT': 'Gujarat',
        'RAJASTHAN': 'Rajasthan',
        'MADHYA PRADESH': 'MP',
        'Madhya Pradesh': 'MP',
        'UTTAR PRADESH': 'UP',
        'Uttar Pradesh': 'UP',
        'WEST BENGAL': 'West Bengal',
        'DELHI': 'Delhi',
        'PUNJAB': 'Punjab',
        'HARYANA': 'Haryana'
    },
    division: {
        'Nagpur City Division': 'Nagpur City',
        'Mumbai City Division': 'Mumbai City',
        'Pune City Division': 'Pune City',
        'Kolhapur Division': 'Kolhapur',
        'Konkan Division': 'Konkan'
    },
    district: {
        'NAGPUR': 'Nagpur',
        'MUMBAI': 'Mumbai',
        'PUNE': 'Pune',
        'THANE': 'Thane',
        'KOLHAPUR': 'Kolhapur'
    },
    tehsil: {
        // Tehsils remain as Title Case
    },
    country: {
        'INDIA': 'India',
        'india': 'India'
    }
};

// Title case converter
function toTitleCase(str) {
    if (!str) return str;
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Standardize a field value
function standardizeField(field, value) {
    if (!value) return value;
    
    // Check if there's a specific rule for this value
    if (standardizationRules[field] && standardizationRules[field][value]) {
        return standardizationRules[field][value];
    }
    
    // Default: Title Case
    return toTitleCase(value);
}

async function standardizeLocationNames() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // ========================================
        // 1. Standardize Locations Collection
        // ========================================
        console.log('📍 Step 1: Standardizing Locations Collection...');
        const locations = await Location.find({});
        console.log(`   Found ${locations.length} locations`);
        
        let locationUpdates = 0;
        for (const loc of locations) {
            let updated = false;
            const updates = {};
            
            if (loc.country) {
                const standardized = standardizeField('country', loc.country);
                if (standardized !== loc.country) {
                    updates.country = standardized;
                    updated = true;
                }
            }
            
            if (loc.zone) {
                const standardized = standardizeField('zone', loc.zone);
                if (standardized !== loc.zone) {
                    updates.zone = standardized;
                    updated = true;
                }
            }
            
            if (loc.state) {
                const standardized = standardizeField('state', loc.state);
                if (standardized !== loc.state) {
                    updates.state = standardized;
                    updated = true;
                }
            }
            
            if (loc.division) {
                const standardized = standardizeField('division', loc.division);
                if (standardized !== loc.division) {
                    updates.division = standardized;
                    updated = true;
                }
            }
            
            if (loc.district) {
                const standardized = standardizeField('district', loc.district);
                if (standardized !== loc.district) {
                    updates.district = standardized;
                    updated = true;
                }
            }
            
            if (loc.tehsil) {
                const standardized = toTitleCase(loc.tehsil);
                if (standardized !== loc.tehsil) {
                    updates.tehsil = standardized;
                    updated = true;
                }
            }
            
            if (loc.village) {
                const standardized = toTitleCase(loc.village);
                if (standardized !== loc.village) {
                    updates.village = standardized;
                    updated = true;
                }
            }
            
            if (updated) {
                await Location.updateOne({ _id: loc._id }, { $set: updates });
                locationUpdates++;
                console.log(`   ✓ Updated: ${loc.zone || ''} ${loc.state || ''} ${loc.district || ''}`);
            }
        }
        console.log(`   ✅ Updated ${locationUpdates} locations\n`);

        // ========================================
        // 2. Standardize Positions Collection
        // ========================================
        console.log('📍 Step 2: Standardizing Positions Collection...');
        const positions = await Position.find({});
        console.log(`   Found ${positions.length} positions`);
        
        let positionUpdates = 0;
        for (const pos of positions) {
            if (!pos.location) continue;
            
            let updated = false;
            const updates = {};
            
            ['country', 'zone', 'state', 'division', 'district', 'tehsil', 'pincode', 'village'].forEach(field => {
                if (pos.location[field]) {
                    const standardized = field === 'pincode' 
                        ? pos.location[field] 
                        : standardizeField(field, pos.location[field]);
                    if (standardized !== pos.location[field]) {
                        updates[`location.${field}`] = standardized;
                        updated = true;
                    }
                }
            });
            
            if (updated) {
                await Position.updateOne({ _id: pos._id }, { $set: updates });
                positionUpdates++;
                const loc = pos.location;
                console.log(`   ✓ Updated Position: ${loc.zone || ''} ${loc.state || ''} ${loc.district || ''}`);
            }
        }
        console.log(`   ✅ Updated ${positionUpdates} positions\n`);

        // ========================================
        // 3. Standardize Applications Collection
        // ========================================
        console.log('📍 Step 3: Standardizing Applications Collection...');
        const applications = await Application.find({});
        console.log(`   Found ${applications.length} applications`);
        
        let applicationUpdates = 0;
        for (const app of applications) {
            if (!app.location) continue;
            
            let updated = false;
            const updates = {};
            
            ['country', 'zone', 'state', 'division', 'district', 'tehsil', 'pincode', 'village'].forEach(field => {
                if (app.location[field]) {
                    const standardized = field === 'pincode' 
                        ? app.location[field] 
                        : standardizeField(field, app.location[field]);
                    if (standardized !== app.location[field]) {
                        updates[`location.${field}`] = standardized;
                        updated = true;
                    }
                }
            });
            
            if (updated) {
                await Application.updateOne({ _id: app._id }, { $set: updates });
                applicationUpdates++;
                const loc = app.location;
                console.log(`   ✓ Updated Application: ${app.applicantInfo?.name || 'Unknown'} - ${loc.zone || ''} ${loc.state || ''}`);
            }
        }
        console.log(`   ✅ Updated ${applicationUpdates} applications\n`);

        // ========================================
        // Summary
        // ========================================
        console.log('===========================================');
        console.log('✅ STANDARDIZATION COMPLETE');
        console.log('===========================================');
        console.log(`Locations updated:     ${locationUpdates}`);
        console.log(`Positions updated:     ${positionUpdates}`);
        console.log(`Applications updated:  ${applicationUpdates}`);
        console.log(`Total updates:         ${locationUpdates + positionUpdates + applicationUpdates}`);
        console.log('===========================================\n');
        
        console.log('📋 Standardization Rules Applied:');
        console.log('  Zones: "West Zone" → "West"');
        console.log('  States: "MAHARASHTRA" → "Maharashtra", "MADHYA PRADESH" → "MP"');
        console.log('  Divisions: "Nagpur City Division" → "Nagpur City"');
        console.log('  Districts: "NAGPUR" → "Nagpur"');
        console.log('  All other fields: Title Case\n');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the script
standardizeLocationNames();
