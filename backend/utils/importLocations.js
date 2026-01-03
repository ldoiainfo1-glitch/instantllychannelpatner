/**
 * Import locations from CSV backup into new MongoDB cluster
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Define Location Schema
const locationSchema = new mongoose.Schema({
    country: { type: String, required: true },
    zone: { type: String, required: true },
    state: { type: String, required: true },
    division: { type: String, required: true },
    district: { type: String, required: true },
    tehsil: { type: String },
    pincode: { type: String },
    village: { type: String }
}, { timestamps: true });

const Location = mongoose.model('Location', locationSchema);

async function importLocations() {
    try {
        console.log('🔄 Starting location import...');
        
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI not found in environment variables');
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        console.log('📍 Database:', mongoose.connection.db.databaseName);

        const csvPath = path.join(__dirname, '../locations-backup-2025-12-06T11-53-00.csv');
        
        if (!fs.existsSync(csvPath)) {
            throw new Error(`CSV file not found: ${csvPath}`);
        }

        const locations = [];
        let rowCount = 0;
        const batchSize = 1000;

        console.log('📖 Reading CSV file...');

        // Read CSV and collect locations
        await new Promise((resolve, reject) => {
            fs.createReadStream(csvPath)
                .pipe(csv())
                .on('data', (row) => {
                    rowCount++;
                    locations.push({
                        country: row.country?.trim(),
                        zone: row.zone?.trim(),
                        state: row.state?.trim(),
                        division: row.division?.trim(),
                        district: row.district?.trim(),
                        tehsil: row.tehsil?.trim() || null,
                        pincode: row.pincode?.trim() || null,
                        village: row.village?.trim() || null
                    });

                    // Show progress every 10,000 rows
                    if (rowCount % 10000 === 0) {
                        process.stdout.write(`\r📊 Read ${rowCount} rows...`);
                    }
                })
                .on('end', resolve)
                .on('error', reject);
        });

        console.log(`\n✅ Read ${rowCount} locations from CSV`);

        // Clear existing locations
        console.log('🗑️  Clearing existing locations...');
        await Location.deleteMany({});
        console.log('✅ Cleared old data');

        // Insert in batches
        console.log('💾 Inserting locations in batches...');
        let inserted = 0;
        
        for (let i = 0; i < locations.length; i += batchSize) {
            const batch = locations.slice(i, i + batchSize);
            await Location.insertMany(batch, { ordered: false });
            inserted += batch.length;
            process.stdout.write(`\r✅ Inserted ${inserted}/${locations.length} locations...`);
        }

        console.log('\n✅ All locations imported successfully!');
        
        // Verify count
        const finalCount = await Location.countDocuments();
        console.log(`📊 Final count in database: ${finalCount} locations`);

        // Create indexes
        console.log('🔧 Creating indexes...');
        await Location.collection.createIndex({ pincode: 1 }, { background: true });
        await Location.collection.createIndex({ district: 1 }, { background: true });
        await Location.collection.createIndex({ state: 1 }, { background: true });
        await Location.collection.createIndex({ zone: 1 }, { background: true });
        console.log('✅ Indexes created');

        await mongoose.connection.close();
        console.log('✅ Import completed successfully!');

    } catch (error) {
        console.error('❌ Import failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

importLocations();
