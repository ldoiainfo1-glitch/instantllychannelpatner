const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const Location = require('./api/models/Location');
const Position = require('./api/models/Position');
const Application = require('./api/models/Application');

async function cleanAndSetupDatabase() {
    try {
        console.log('🚀 Starting database cleanup and setup...\n');
        
        // Connect to MongoDB
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');
        
        // 1. Delete all existing data
        console.log('🧹 Cleaning existing data...');
        const positionsDeleted = await Position.deleteMany({});
        const locationsDeleted = await Location.deleteMany({});
        const applicationsDeleted = await Application.deleteMany({});
        
        console.log(`✅ Deleted ${positionsDeleted.deletedCount} positions`);
        console.log(`✅ Deleted ${locationsDeleted.deletedCount} locations`);
        console.log(`✅ Deleted ${applicationsDeleted.deletedCount} applications\n`);
        
        // 2. Import CSV data to Location collection
        console.log('📖 Reading CSV file...');
        const csvPath = path.join(__dirname, '..', 'location-transformed.csv');
        
        const locations = [];
        
        return new Promise((resolve, reject) => {
            fs.createReadStream(csvPath)
                .pipe(csv())
                .on('data', (data) => {
                    // Clean and structure the data
                    const location = {
                        country: data.country?.trim() || 'India',
                        zone: data.zone?.trim() || '',
                        state: data.state?.trim() || '',
                        division: data.division?.trim() || '',
                        district: data.district?.trim() || '',
                        tehsil: data.taluka?.trim() || '', // CSV has 'taluka' column
                        pincode: data.pincode?.trim() || '',
                        village: data.postOffice?.trim() || '' // CSV has 'postOffice' column
                    };
                    
                    // Only add if all required fields are present
                    if (location.zone && location.state && location.division && 
                        location.district && location.tehsil && location.pincode && location.village) {
                        locations.push(location);
                    }
                })
                .on('end', async () => {
                    try {
                        console.log(`✅ Read ${locations.length} location records from CSV\n`);
                        
                        // Insert locations in batches
                        console.log('💾 Inserting locations into database...');
                        const batchSize = 1000;
                        let inserted = 0;
                        
                        for (let i = 0; i < locations.length; i += batchSize) {
                            const batch = locations.slice(i, i + batchSize);
                            try {
                                await Location.insertMany(batch, { ordered: false });
                                inserted += batch.length;
                                console.log(`  Inserted ${inserted}/${locations.length} locations...`);
                            } catch (error) {
                                // Handle duplicate entries gracefully
                                const actualInserted = batch.length - (error.writeErrors?.length || 0);
                                inserted += actualInserted;
                                console.log(`  Inserted ${inserted}/${locations.length} locations (${error.writeErrors?.length || 0} duplicates skipped)...`);
                            }
                        }
                        
                        console.log(`\n✅ Successfully imported ${inserted} unique locations!`);
                        
                        // Get statistics
                        const stats = await getLocationStats();
                        console.log('\n📊 Location Database Statistics:');
                        console.log(`  Zones: ${stats.zones}`);
                        console.log(`  States: ${stats.states}`);
                        console.log(`  Divisions: ${stats.divisions}`);
                        console.log(`  Districts: ${stats.districts}`);
                        console.log(`  Tehsils: ${stats.tehsils}`);
                        console.log(`  Pincodes: ${stats.pincodes}`);
                        console.log(`  Villages: ${stats.villages}`);
                        
                        console.log('\n✅ Database setup complete!');
                        console.log('📋 Summary:');
                        console.log('• Location collection: Ready for filters');
                        console.log('• Application collection: Empty, ready for applications');
                        console.log('• Position collection: Empty, no templates stored');
                        console.log('• System: Ready for dynamic applications\n');
                        
                        mongoose.disconnect();
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                })
                .on('error', reject);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
        mongoose.disconnect();
    }
}

async function getLocationStats() {
    const [zones, states, divisions, districts, tehsils, pincodes, villages] = await Promise.all([
        Location.distinct('zone'),
        Location.distinct('state'),
        Location.distinct('division'),
        Location.distinct('district'),
        Location.distinct('tehsil'),
        Location.distinct('pincode'),
        Location.distinct('village')
    ]);
    
    return {
        zones: zones.length,
        states: states.length,
        divisions: divisions.length,
        districts: districts.length,
        tehsils: tehsils.length,
        pincodes: pincodes.length,
        villages: villages.length
    };
}

cleanAndSetupDatabase();
