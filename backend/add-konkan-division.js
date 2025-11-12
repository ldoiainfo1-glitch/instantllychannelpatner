require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ldoiainfo1:ld123oia@cluster0.lp32h.mongodb.net/instantlly?retryWrites=true&w=majority';

const locationSchema = new mongoose.Schema({
    country: String,
    zone: String,
    state: String,
    division: String,
    district: String,
    taluka: String,
    pincode: String,
    postOffice: String
}, { collection: 'locations' });

const Location = mongoose.model('Location', locationSchema);

async function addKonkanDivision() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Check if Konkan division already exists
        const existingKonkan = await Location.findOne({ division: 'Konkan Division' });
        
        if (existingKonkan) {
            console.log('✅ Konkan Division already exists in database');
            
            // Count how many locations have Konkan Division
            const count = await Location.countDocuments({ division: 'Konkan Division' });
            console.log(`📊 Found ${count} locations with Konkan Division`);
            
            // Show sample locations
            const samples = await Location.find({ division: 'Konkan Division' }).limit(5);
            console.log('\n📍 Sample Konkan Division locations:');
            samples.forEach(loc => {
                console.log(`   - ${loc.district}, ${loc.taluka}, ${loc.pincode} - ${loc.postOffice}`);
            });
        } else {
            console.log('❌ Konkan Division not found in database');
            console.log('\n🔍 Checking what divisions exist in Maharashtra...');
            
            const maharashtraDivisions = await Location.distinct('division', { state: 'MAHARASHTRA' });
            console.log('Maharashtra Divisions:', maharashtraDivisions.slice(0, 20));
            
            // Add sample Konkan division locations for major districts
            const konkanLocations = [
                {
                    country: 'India',
                    zone: 'Western India',
                    state: 'MAHARASHTRA',
                    division: 'Konkan Division',
                    district: 'MUMBAI',
                    taluka: 'Mumbai',
                    pincode: '400001',
                    postOffice: 'Mumbai GPO'
                },
                {
                    country: 'India',
                    zone: 'Western India',
                    state: 'MAHARASHTRA',
                    division: 'Konkan Division',
                    district: 'RAIGAD',
                    taluka: 'Alibag',
                    pincode: '402201',
                    postOffice: 'Alibag HO'
                },
                {
                    country: 'India',
                    zone: 'Western India',
                    state: 'MAHARASHTRA',
                    division: 'Konkan Division',
                    district: 'RATNAGIRI',
                    taluka: 'Ratnagiri',
                    pincode: '415612',
                    postOffice: 'Ratnagiri HO'
                },
                {
                    country: 'India',
                    zone: 'Western India',
                    state: 'MAHARASHTRA',
                    division: 'Konkan Division',
                    district: 'SINDHUDURG',
                    taluka: 'Kudal',
                    pincode: '416520',
                    postOffice: 'Kudal HO'
                },
                {
                    country: 'India',
                    zone: 'Western India',
                    state: 'MAHARASHTRA',
                    division: 'Konkan Division',
                    district: 'THANE',
                    taluka: 'Thane',
                    pincode: '400601',
                    postOffice: 'Thane HO'
                },
                {
                    country: 'India',
                    zone: 'Western India',
                    state: 'MAHARASHTRA',
                    division: 'Konkan Division',
                    district: 'PALGHAR',
                    taluka: 'Palghar',
                    pincode: '401404',
                    postOffice: 'Palghar HO'
                }
            ];

            console.log(`\n➕ Adding ${konkanLocations.length} Konkan Division locations...`);
            const result = await Location.insertMany(konkanLocations);
            console.log(`✅ Successfully added ${result.length} Konkan Division locations`);
        }

        console.log('\n✅ Done!');
        await mongoose.disconnect();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

addKonkanDivision();
