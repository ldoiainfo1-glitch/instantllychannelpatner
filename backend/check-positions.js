const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/channelpartner';

async function checkPositions() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        const db = mongoose.connection.db;
        
        // List all collections
        console.log('\n📁 All collections:');
        const collections = await db.listCollections().toArray();
        collections.forEach(c => console.log(`   - ${c.name}`));
        
        // Check positions collection
        console.log('\n📋 Total positions:', await db.collection('positions').countDocuments());
        const allPositions = await db.collection('positions').find({}).limit(3).toArray();
        console.log('\nSample position documents:');
        console.log(JSON.stringify(allPositions, null, 2));
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
    }
}

checkPositions();
