/**
 * Add a location directly to the database
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Define Location Schema (same as in the app)
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

async function addLocation() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI not found in environment variables');
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Location to add
        const locationData = {
            country: 'India',
            zone: 'West India',
            state: 'Maharashtra',
            division: 'Nashik Division',
            district: 'Ahmednagar'
        };

        // Check if location already exists
        const existing = await Location.findOne({
            country: locationData.country,
            zone: locationData.zone,
            state: locationData.state,
            division: locationData.division,
            district: locationData.district
        });

        if (existing) {
            console.log('⚠️  Location already exists:', existing._id);
            console.log(existing);
        } else {
            const newLocation = new Location(locationData);
            await newLocation.save();
            console.log('✅ Location added successfully!');
            console.log('Location ID:', newLocation._id);
            console.log(newLocation);
        }

        await mongoose.connection.close();
        console.log('✅ Database connection closed');
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

addLocation();
