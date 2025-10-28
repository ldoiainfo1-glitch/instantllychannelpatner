const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const Position = require('./api/models/Position');

async function fixPositionIds() {
    try {
        console.log('🔧 Checking for positions with invalid ObjectIds...');
        
        // Find all positions
        const positions = await Position.find({});
        console.log(`📊 Found ${positions.length} positions in database`);
        
        let fixedCount = 0;
        let invalidPositions = [];
        
        for (const position of positions) {
            // Check if the _id is a valid MongoDB ObjectId
            if (!mongoose.Types.ObjectId.isValid(position._id)) {
                console.log(`⚠️  Invalid ObjectId found: ${position._id} (sNo: ${position.sNo})`);
                invalidPositions.push(position);
            }
        }
        
        if (invalidPositions.length === 0) {
            console.log('✅ All positions have valid ObjectIds');
            return;
        }
        
        console.log(`🔄 Found ${invalidPositions.length} positions with invalid ObjectIds`);
        
        // Fix each invalid position by recreating it with a proper ObjectId
        for (const invalidPosition of invalidPositions) {
            try {
                // Create new position with same data but proper ObjectId
                const newPosition = new Position({
                    sNo: invalidPosition.sNo,
                    post: invalidPosition.post,
                    designation: invalidPosition.designation,
                    location: invalidPosition.location,
                    contribution: invalidPosition.contribution,
                    credits: invalidPosition.credits,
                    isTemplate: invalidPosition.isTemplate,
                    status: invalidPosition.status,
                    applicantDetails: invalidPosition.applicantDetails,
                    isVerified: invalidPosition.isVerified,
                    createdAt: invalidPosition.createdAt,
                    updatedAt: invalidPosition.updatedAt
                });
                
                // Save the new position (this will generate a proper ObjectId)
                await newPosition.save();
                
                // Delete the old position with invalid ObjectId
                await Position.deleteOne({ _id: invalidPosition._id });
                
                console.log(`✅ Fixed position sNo ${invalidPosition.sNo}: ${invalidPosition._id} -> ${newPosition._id}`);
                fixedCount++;
            } catch (error) {
                console.error(`❌ Error fixing position sNo ${invalidPosition.sNo}:`, error.message);
            }
        }
        
        console.log(`\n🎉 Fixed ${fixedCount} positions with invalid ObjectIds`);
        
        // Verify the fix
        const remainingInvalid = await Position.find({});
        const stillInvalid = remainingInvalid.filter(p => !mongoose.Types.ObjectId.isValid(p._id));
        
        if (stillInvalid.length === 0) {
            console.log('✅ All positions now have valid MongoDB ObjectIds');
        } else {
            console.log(`⚠️  Still have ${stillInvalid.length} positions with invalid ObjectIds`);
        }
        
        mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error);
        mongoose.disconnect();
    }
}

// Also create a function to regenerate the simple position system with proper ObjectIds
async function regeneratePositions() {
    try {
        console.log('🔄 Regenerating position system with proper ObjectIds...');
        
        // Delete all existing positions
        const deleteResult = await Position.deleteMany({});
        console.log(`🧹 Deleted ${deleteResult.deletedCount} old positions`);
        
        // Create new positions with proper structure
        const positionTemplates = [
            {
                sNo: 1,
                post: 'President',
                designation: 'President of India',
                contribution: 10000,
                credits: 60000,
                status: 'Available',
                location: {
                    country: 'India',
                    zone: '',
                    state: '',
                    division: '',
                    district: '',
                    tehsil: '',
                    pincode: '',
                    village: ''
                },
                isTemplate: true
            },
            {
                sNo: 2,
                post: 'Zone Head',
                designation: 'Zone Head (Apply for specific zone)',
                contribution: 10000,
                credits: 60000,
                status: 'Template',
                location: {
                    country: 'India',
                    zone: '[Select Zone when applying]',
                    state: '',
                    division: '',
                    district: '',
                    tehsil: '',
                    pincode: '',
                    village: ''
                },
                isTemplate: true
            },
            {
                sNo: 3,
                post: 'State Head',
                designation: 'State Head (Apply for specific state)',
                contribution: 10000,
                credits: 60000,
                status: 'Template',
                location: {
                    country: 'India',
                    zone: '',
                    state: '[Select State when applying]',
                    division: '',
                    district: '',
                    tehsil: '',
                    pincode: '',
                    village: ''
                },
                isTemplate: true
            },
            {
                sNo: 4,
                post: 'Division Head',
                designation: 'Division Head (Apply for specific division)',
                contribution: 10000,
                credits: 60000,
                status: 'Template',
                location: {
                    country: 'India',
                    zone: '',
                    state: '',
                    division: '[Select Division when applying]',
                    district: '',
                    tehsil: '',
                    pincode: '',
                    village: ''
                },
                isTemplate: true
            },
            {
                sNo: 5,
                post: 'District Head',
                designation: 'District Head (Apply for specific district)',
                contribution: 10000,
                credits: 60000,
                status: 'Template',
                location: {
                    country: 'India',
                    zone: '',
                    state: '',
                    division: '',
                    district: '[Select District when applying]',
                    tehsil: '',
                    pincode: '',
                    village: ''
                },
                isTemplate: true
            },
            {
                sNo: 6,
                post: 'Tehsil Head',
                designation: 'Tehsil Head (Apply for specific tehsil)',
                contribution: 10000,
                credits: 60000,
                status: 'Template',
                location: {
                    country: 'India',
                    zone: '',
                    state: '',
                    division: '',
                    district: '',
                    tehsil: '[Select Tehsil when applying]',
                    pincode: '',
                    village: ''
                },
                isTemplate: true
            },
            {
                sNo: 7,
                post: 'Pincode Head',
                designation: 'Pincode Head (Apply for specific pincode)',
                contribution: 10000,
                credits: 60000,
                status: 'Template',
                location: {
                    country: 'India',
                    zone: '',
                    state: '',
                    division: '',
                    district: '',
                    tehsil: '',
                    pincode: '[Enter Pincode when applying]',
                    village: ''
                },
                isTemplate: true
            },
            {
                sNo: 8,
                post: 'Village Head',
                designation: 'Village Head (Apply for specific village)',
                contribution: 10000,
                credits: 60000,
                status: 'Template',
                location: {
                    country: 'India',
                    zone: '',
                    state: '',
                    division: '',
                    district: '',
                    tehsil: '',
                    pincode: '',
                    village: '[Enter Village when applying]'
                },
                isTemplate: true
            }
        ];
        
        // Insert new positions (MongoDB will auto-generate proper ObjectIds)
        const newPositions = await Position.insertMany(positionTemplates);
        console.log(`✅ Created ${newPositions.length} positions with proper ObjectIds`);
        
        // Verify all have proper ObjectIds
        newPositions.forEach(position => {
            console.log(`  - sNo ${position.sNo}: ${position._id} (${mongoose.Types.ObjectId.isValid(position._id) ? 'Valid' : 'Invalid'})`);
        });
        
        mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error regenerating positions:', error);
        mongoose.disconnect();
    }
}

// Check command line arguments
const action = process.argv[2];

if (action === 'regenerate') {
    regeneratePositions();
} else {
    fixPositionIds();
}
