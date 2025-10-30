const mongoose = require('mongoose');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://info:muskaan123@main.qmgwg.mongodb.net/channelpartner?retryWrites=true&w=majority';

async function testDatabase() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB successfully');
        
        // Test collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('📁 Available collections:');
        collections.forEach(col => {
            console.log(`   - ${col.name}`);
        });
        
        // Import models
        const Application = require('./backend/api/models/Application');
        const Position = require('./backend/api/models/Position');
        
        // Check applications count
        const applicationsCount = await Application.countDocuments();
        console.log(`📊 Applications in channelpartner.applications: ${applicationsCount}`);
        
        // Show recent applications
        const recentApplications = await Application.find().sort({ appliedDate: -1 }).limit(5);
        console.log(`🔍 Recent applications:`);
        recentApplications.forEach(app => {
            console.log(`   - ${app.applicantInfo.name} applied for position ${app.positionId} on ${app.appliedDate.toISOString().split('T')[0]}`);
        });
        
        // Check positions count
        const positionsCount = await Position.countDocuments();
        console.log(`📊 Positions available: ${positionsCount}`);
        
        // Test a specific position query (President of India)
        const presidentPosition = await Position.findOne({ 
            designation: { $regex: /president/i },
            'location.country': 'India'
        });
        
        if (presidentPosition) {
            console.log(`👑 Found President position: ${presidentPosition.designation} (ID: ${presidentPosition._id})`);
            
            // Check if there's an application for this position
            const presidentApplication = await Application.findOne({ 
                positionId: presidentPosition._id 
            });
            
            if (presidentApplication) {
                console.log(`✅ Application found for President position: ${presidentApplication.applicantInfo.name} (Status: ${presidentApplication.status})`);
            } else {
                console.log(`❓ No application found for President position - it should be available`);
            }
        } else {
            console.log(`❓ President position not found`);
        }
        
        console.log('✅ Database test completed successfully');
    } catch (error) {
        console.error('❌ Database test failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

testDatabase();
