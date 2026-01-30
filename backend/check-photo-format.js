require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./api/models/User');

const phone = '9742067525';

async function checkPhotoFormat() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const user = await User.findOne({ phone: phone });
        
        if (!user) {
            console.log('❌ User not found!');
            return;
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📸 PHOTO DATA ANALYSIS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        console.log('Photo field exists:', !!user.photo);
        console.log('Photo field type:', typeof user.photo);
        
        if (user.photo) {
            console.log('Photo field length:', user.photo.length);
            console.log('Photo starts with:', user.photo.substring(0, 100));
            console.log('\nHas data:image prefix:', user.photo.startsWith('data:image'));
            console.log('Has /9j/ JPEG prefix:', user.photo.startsWith('/9j/'));
            
            // Check if it needs data:image prefix
            if (!user.photo.startsWith('data:image') && (user.photo.startsWith('/9j/') || user.photo.startsWith('iVBOR'))) {
                console.log('\n⚠️  ISSUE FOUND: Photo is base64 but missing data:image prefix!');
                console.log('✅ FIX: Need to add "data:image/jpeg;base64," prefix');
                
                // Fix the photo format
                const photoType = user.photo.startsWith('/9j/') ? 'jpeg' : 'png';
                user.photo = `data:image/${photoType};base64,${user.photo}`;
                await user.save();
                
                console.log('\n✅ Photo format fixed and saved!');
                console.log('New photo starts with:', user.photo.substring(0, 50));
            } else {
                console.log('\n✅ Photo format looks correct!');
            }
        } else {
            console.log('❌ Photo field is empty!');
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }
}

checkPhotoFormat();
