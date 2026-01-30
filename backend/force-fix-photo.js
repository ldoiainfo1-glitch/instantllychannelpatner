require('dotenv').config();
const mongoose = require('mongoose');

const phone = '9742067525';

async function forceFixPhoto() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Use raw MongoDB operations to check and update
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');
        const applicationsCollection = db.collection('applications');

        // Find user
        const user = await usersCollection.findOne({ phone: phone });
        if (!user) {
            console.log('❌ User not found');
            return;
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('👤 USER CURRENT STATE');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Name: ${user.name}`);
        console.log(`Phone: ${user.phone}`);
        console.log(`Photo field: ${user.photo ? 'EXISTS (' + user.photo.length + ' chars)' : 'EMPTY'}`);
        console.log(`ProfilePhoto field: ${user.profilePhoto ? 'EXISTS' : 'EMPTY'}`);
        console.log('');

        // Find application
        const application = await applicationsCollection.findOne({
            'applicantInfo.phone': phone,
            status: 'approved'
        });

        if (!application) {
            console.log('❌ No approved application found');
            return;
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 APPLICATION PHOTOS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        const appPhoto = application.applicantInfo?.photo;
        const appPhotoUrl = application.applicantInfo?.photoUrl;

        if (appPhoto) {
            console.log(`✅ Photo found in application: ${appPhoto.length} characters`);
            console.log(`   Starts with: ${appPhoto.substring(0, 50)}...`);
            console.log(`   Has data:image prefix: ${appPhoto.startsWith('data:image')}`);
        } else {
            console.log('❌ No photo in application.applicantInfo.photo');
        }

        if (appPhotoUrl) {
            console.log(`✅ Photo URL found: ${appPhotoUrl}`);
        } else {
            console.log('❌ No photoUrl in application.applicantInfo.photoUrl');
        }
        console.log('');

        // Force update user photo
        if (appPhoto) {
            // Ensure proper data URI format
            let photoData = appPhoto;
            if (!photoData.startsWith('data:image')) {
                // Add data URI prefix if missing
                const imageType = photoData.startsWith('/9j/') ? 'jpeg' : 'png';
                photoData = `data:image/${imageType};base64,${photoData}`;
                console.log('⚡ Added data:image prefix to photo\n');
            }

            // Force update with raw MongoDB
            const updateResult = await usersCollection.updateOne(
                { phone: phone },
                { 
                    $set: { 
                        photo: photoData,
                        profilePhoto: photoData
                    } 
                }
            );

            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('✅ PHOTO UPDATE COMPLETE');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`Modified count: ${updateResult.modifiedCount}`);
            console.log(`Matched count: ${updateResult.matchedCount}`);
            console.log('');

            // Verify the update
            const updatedUser = await usersCollection.findOne({ phone: phone });
            console.log('📸 VERIFICATION:');
            console.log(`Photo field: ${updatedUser.photo ? 'EXISTS (' + updatedUser.photo.length + ' chars)' : 'EMPTY'}`);
            console.log(`Photo starts with: ${updatedUser.photo ? updatedUser.photo.substring(0, 50) : 'N/A'}`);
            console.log('');
            console.log('✅ User profile photo should now be visible!');
            console.log('🔄 Ask user to refresh the page or logout/login\n');

        } else {
            console.log('⚠️  NO PHOTO DATA IN APPLICATION');
            console.log('User needs to upload photo from profile page\n');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }
}

forceFixPhoto();
