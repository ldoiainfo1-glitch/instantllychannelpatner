// Script to upload video to MongoDB GridFS
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const videoPath = path.join(__dirname, 'uploads/instruction_video.mp4');
const MONGODB_URI = process.env.MONGODB_URI;

async function uploadVideo() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI, {
            retryWrites: true,
            w: 'majority'
        });
        console.log('✅ Connected to MongoDB');

        // Create GridFS bucket
        const bucket = new GridFSBucket(mongoose.connection.db, {
            bucketName: 'videos'
        });

        // Check if video file exists
        if (!fs.existsSync(videoPath)) {
            console.error('❌ Video file not found:', videoPath);
            process.exit(1);
        }

        const stats = fs.statSync(videoPath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`📹 Video file found: ${sizeMB} MB`);

        // Check if video already exists
        const existingFiles = await bucket.find({ filename: 'instruction_video.mp4' }).toArray();
        
        if (existingFiles.length > 0) {
            console.log('⚠️  Video already exists in database');
            console.log('🗑️  Deleting old video...');
            await bucket.delete(existingFiles[0]._id);
            console.log('✅ Old video deleted');
        }

        // Create upload stream
        console.log('📤 Uploading video to MongoDB...');
        const uploadStream = bucket.openUploadStream('instruction_video.mp4', {
            metadata: {
                originalName: 'about_app_video.mp4',
                contentType: 'video/mp4',
                uploadDate: new Date(),
                source: 'migration_script'
            }
        });

        // Read and upload file
        const readStream = fs.createReadStream(videoPath);
        
        let uploadedBytes = 0;
        readStream.on('data', (chunk) => {
            uploadedBytes += chunk.length;
            const progress = ((uploadedBytes / stats.size) * 100).toFixed(1);
            process.stdout.write(`\rProgress: ${progress}%`);
        });

        readStream.pipe(uploadStream);

        uploadStream.on('finish', async () => {
            console.log('\n✅ Video uploaded successfully!');
            console.log(`📊 File ID: ${uploadStream.id}`);
            console.log(`📊 Filename: instruction_video.mp4`);
            console.log(`📊 Size: ${sizeMB} MB`);
            
            // Verify upload
            const files = await bucket.find({ filename: 'instruction_video.mp4' }).toArray();
            if (files.length > 0) {
                console.log('✅ Upload verified in database');
            }
            
            await mongoose.connection.close();
            console.log('🔌 MongoDB connection closed');
            process.exit(0);
        });

        uploadStream.on('error', (error) => {
            console.error('\n❌ Upload error:', error);
            mongoose.connection.close();
            process.exit(1);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }
        process.exit(1);
    }
}

// Run the upload
uploadVideo();
