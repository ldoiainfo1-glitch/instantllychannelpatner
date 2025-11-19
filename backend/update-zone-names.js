const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/channelpartner';

async function updateZoneNames() {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        const db = mongoose.connection.db;
        
        // Update Locations collection
        console.log('\n📍 Updating Location collection...');
        const locationResult = await db.collection('locations').updateMany(
            { zone: { $regex: /India$/i } },
            [
                {
                    $set: {
                        zone: {
                            $trim: {
                                input: {
                                    $replaceAll: {
                                        input: "$zone",
                                        find: " India",
                                        replacement: ""
                                    }
                                }
                            }
                        }
                    }
                }
            ]
        );
        console.log(`   Modified ${locationResult.modifiedCount} location documents`);
        
        // Update Positions collection
        console.log('\n🎯 Updating Position collection...');
        const positionResult = await db.collection('positions').updateMany(
            { 'location.zone': { $regex: /India$/i } },
            [
                {
                    $set: {
                        'location.zone': {
                            $trim: {
                                input: {
                                    $replaceAll: {
                                        input: "$location.zone",
                                        find: " India",
                                        replacement: ""
                                    }
                                }
                            }
                        }
                    }
                }
            ]
        );
        console.log(`   Modified ${positionResult.modifiedCount} position documents`);
        
        // Show updated zones
        console.log('\n📋 Updated zone values:');
        const zones = await db.collection('locations').distinct('zone', { zone: { $ne: null, $ne: '' } });
        zones.sort().forEach(zone => console.log(`   - ${zone}`));
        
        console.log('\n✅ Zone names updated successfully!');
        console.log('   "North India" → "North"');
        console.log('   "South India" → "South"');
        console.log('   "East India" → "East"');
        console.log('   "West India" → "West"');
        console.log('   etc.');
        
    } catch (error) {
        console.error('❌ Error updating zone names:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
    }
}

updateZoneNames();
