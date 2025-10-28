const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const Position = require('./api/models/Position');

async function createSimpleSystem() {
    try {
        console.log('🧹 Cleaning database...');
        
        // Delete all existing positions
        const deleteResult = await Position.deleteMany({});
        console.log(`✅ Deleted ${deleteResult.deletedCount} old positions`);
        
        // Create only basic templates that show the structure
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
        
        // Insert templates
        await Position.insertMany(positionTemplates);
        console.log(`✅ Created ${positionTemplates.length} position templates`);
        
        console.log('\n📋 System Summary:');
        console.log('• Only basic templates stored');
        console.log('• Real positions created when people apply');
        console.log('• Dynamic location-based position creation');
        console.log('• Efficient database usage');
        
        mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error);
        mongoose.disconnect();
    }
}

createSimpleSystem();
