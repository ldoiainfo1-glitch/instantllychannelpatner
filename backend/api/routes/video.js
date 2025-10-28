const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { GridFSBucket } = require('mongodb');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 200 * 1024 * 1024 // 200MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed!'), false);
    }
  }
});

// Initialize GridFS bucket
let bucket;
mongoose.connection.once('open', () => {
  bucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: 'videos'
  });
});

// Upload video to GridFS
router.post('/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    if (!bucket) {
      return res.status(500).json({ error: 'Database connection not ready' });
    }

    const filename = `instruction_video_${Date.now()}${path.extname(req.file.originalname)}`;
    
    // Create upload stream
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        originalName: req.file.originalname,
        contentType: req.file.mimetype,
        uploadDate: new Date()
      }
    });

    // Upload file buffer to GridFS
    uploadStream.end(req.file.buffer);

    uploadStream.on('finish', () => {
      res.status(201).json({
        message: 'Video uploaded successfully',
        fileId: uploadStream.id,
        filename: filename
      });
    });

    uploadStream.on('error', (error) => {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Failed to upload video' });
    });

  } catch (error) {
    console.error('Upload route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Stream video from GridFS
router.get('/stream/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;

    if (!bucket) {
      return res.status(500).json({ error: 'Database connection not ready' });
    }

    // Find file in GridFS
    const files = await bucket.find({ filename: filename }).toArray();
    
    if (!files || files.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const file = files[0];

    // Set appropriate headers for video streaming
    res.set({
      'Content-Type': file.metadata?.contentType || 'video/mp4',
      'Content-Length': file.length,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600'
    });

    // Handle range requests for video seeking
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : file.length - 1;
      const chunksize = (end - start) + 1;

      res.status(206);
      res.set({
        'Content-Range': `bytes ${start}-${end}/${file.length}`,
        'Content-Length': chunksize
      });

      // Create download stream with start and end positions
      const downloadStream = bucket.openDownloadStreamByName(filename, {
        start: start,
        end: end + 1
      });

      downloadStream.pipe(res);
    } else {
      // Stream entire file
      const downloadStream = bucket.openDownloadStreamByName(filename);
      downloadStream.pipe(res);
    }

  } catch (error) {
    console.error('Stream error:', error);
    res.status(500).json({ error: 'Failed to stream video' });
  }
});

// Get video info
router.get('/info/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;

    if (!bucket) {
      return res.status(500).json({ error: 'Database connection not ready' });
    }

    const files = await bucket.find({ filename: filename }).toArray();
    
    if (!files || files.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const file = files[0];
    res.json({
      filename: file.filename,
      length: file.length,
      uploadDate: file.uploadDate,
      metadata: file.metadata
    });

  } catch (error) {
    console.error('Info error:', error);
    res.status(500).json({ error: 'Failed to get video info' });
  }
});

// Upload existing video file from uploads folder
router.post('/migrate-existing', async (req, res) => {
  try {
    const videoPath = path.join(__dirname, '../../uploads/instruction_video.mp4');
    
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'Video file not found in uploads folder' });
    }

    if (!bucket) {
      return res.status(500).json({ error: 'Database connection not ready' });
    }

    const filename = 'instruction_video.mp4';
    
    // Check if video already exists
    const existingFiles = await bucket.find({ filename: filename }).toArray();
    if (existingFiles.length > 0) {
      return res.json({ 
        message: 'Video already exists in database',
        fileId: existingFiles[0]._id,
        filename: filename
      });
    }

    // Create upload stream
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        originalName: 'instruction_video.mp4',
        contentType: 'video/mp4',
        uploadDate: new Date(),
        migrated: true
      }
    });

    // Read and upload file
    const readStream = fs.createReadStream(videoPath);
    readStream.pipe(uploadStream);

    uploadStream.on('finish', () => {
      res.json({
        message: 'Video migrated to database successfully',
        fileId: uploadStream.id,
        filename: filename
      });
    });

    uploadStream.on('error', (error) => {
      console.error('Migration error:', error);
      res.status(500).json({ error: 'Failed to migrate video' });
    });

  } catch (error) {
    console.error('Migration route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
