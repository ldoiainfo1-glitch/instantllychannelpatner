const express = require('express');
const router = express.Router();
const multer = require('multer');
const Promotion = require('../models/Promotion');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// GET all promotions for user (returns dates and available languages)
router.get('/user-promotions', async (req, res) => {
    const startTime = Date.now();
    try {
        console.log(`📋 [${new Date().toISOString()}] Fetching promotions list...`);
        
        // NEW: Group by date and collect languages
        const aggregateStart = Date.now();
        const promotions = await Promotion.aggregate([
            {
                $group: {
                    _id: '$date',
                    languages: { $push: '$language' },
                    about: { $first: '$about' },
                    createdAt: { $first: '$createdAt' }
                }
            },
            {
                $project: {
                    // Use date ISO string as _id for frontend compatibility
                    _id: { 
                        $dateToString: { 
                            format: '%Y-%m-%d', 
                            date: '$_id' 
                        } 
                    },
                    date: '$_id',
                    languages: 1,
                    about: 1,
                    createdAt: 1
                }
            },
            { $sort: { date: -1 } },
            { $limit: 50 }
        ]);
        const aggregateTime = Date.now() - aggregateStart;
        
        console.log(`   ⏱️  Aggregation: ${aggregateTime}ms`);
        console.log(`   📊 Found ${promotions.length} promotion dates`);
        console.log(`   ✅ Total time: ${Date.now() - startTime}ms\n`);
        
        // Prevent caching to always show latest data
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        
        res.json({
            success: true,
            promotions: promotions
        });
    } catch (error) {
        const totalTime = Date.now() - startTime;
        console.error(`   ❌ Error after ${totalTime}ms:`, error.message);
        console.error('   Full error:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch promotions',
            error: error.message
        });
    }
});

// GET promotion image by date and language (NEW SCHEMA)
// promotionId is the date string (YYYY-MM-DD format)
router.get('/image/:promotionId/:language', async (req, res) => {
    const startTime = Date.now();
    try {
        const { promotionId, language } = req.params;
        console.log(`🖼️  [${new Date().toISOString()}] Image request: ${promotionId}/${language}`);
        
        // Parse promotionId as date (should be YYYY-MM-DD format)
        const queryDate = new Date(promotionId);
        queryDate.setHours(0, 0, 0, 0);
        
        if (isNaN(queryDate.getTime())) {
            console.log(`   ❌ Invalid date format: ${promotionId}`);
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Use YYYY-MM-DD'
            });
        }
        
        // Step 1: Query MongoDB - find by date and language
        console.log(`   🔍 Querying: date=${queryDate.toISOString()}, language=${language.toLowerCase()}`);
        const queryStart = Date.now();
        
        const promotion = await Promotion.findOne({ 
            date: queryDate, 
            language: language.toLowerCase() 
        })
        .select('imageData contentType')
        .maxTimeMS(15000);
        
        const queryTime = Date.now() - queryStart;
        console.log(`   ⏱️  MongoDB query: ${queryTime}ms`);
        
        if (!promotion) {
            console.log(`   ❌ Promotion not found: date=${promotionId}, language=${language}`);
            return res.status(404).json({
                success: false,
                message: 'Promotion not found'
            });
        }
        
        if (!promotion.imageData) {
            console.log(`   ❌ Image data not available`);
            return res.status(404).json({
                success: false,
                message: `Image not available`
            });
        }
        
        // Step 2: Get buffer info
        const bufferSize = promotion.imageData.length;
        const bufferSizeMB = (bufferSize / (1024 * 1024)).toFixed(2);
        console.log(`   📦 Image size: ${bufferSizeMB}MB (${bufferSize} bytes)`);
        
        // Step 3: Set headers and send
        const sendStart = Date.now();
        res.set('Content-Type', promotion.contentType || 'image/png');
        res.set('Cache-Control', 'public, max-age=604800'); // Cache for 7 days
        res.set('ETag', `${promotionId}-${language}`);
        res.set('Content-Length', bufferSize);
        
        res.send(promotion.imageData);
        const sendTime = Date.now() - sendStart;
        
        const totalTime = Date.now() - startTime;
        console.log(`   ⏱️  Response send: ${sendTime}ms`);
        console.log(`   ✅ Total time: ${totalTime}ms\n`);
    } catch (error) {
        const totalTime = Date.now() - startTime;
        console.error(`   ❌ Error after ${totalTime}ms:`, error.message);
        console.error('   Full error:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch promotion image',
            error: error.message
        });
    }
});

// POST upload promotion (admin only)
// Expects: date, language, and image file
router.post('/upload', upload.single('image'), async (req, res) => {
    const uploadId = Date.now();
    console.log(`\n🚀 [UPLOAD ${uploadId}] ======== NEW UPLOAD REQUEST ========`);
    
    try {
        const { date, language, uploadedBy, about } = req.body;
        console.log(`📝 [UPLOAD ${uploadId}] Request body:`, { date, language, uploadedBy, about });
        console.log(`📎 [UPLOAD ${uploadId}] File info:`, req.file ? {
            fieldname: req.file.fieldname,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        } : 'NO FILE');
        
        // Step 1: Validate required fields
        if (!date || !language || !req.file) {
            console.log(`❌ [UPLOAD ${uploadId}] Missing required fields`);
            return res.status(400).json({
                success: false,
                message: 'Date, language, and image file are required'
            });
        }
        console.log(`✅ [UPLOAD ${uploadId}] Required fields validated`);
        
        // Step 2: Validate language
        const validLanguages = ['hindi', 'english', 'marathi', 'gujarati','punjabi' , 'bengali', 'odia', 'tamil', 'telugu', 'kannada', 'malayalam', 'urdu'];
        const langLower = language.toLowerCase();
        console.log(`🔍 [UPLOAD ${uploadId}] Validating language: "${langLower}"`);
        
        if (!validLanguages.includes(langLower)) {
            console.log(`❌ [UPLOAD ${uploadId}] Invalid language: "${langLower}"`);
            return res.status(400).json({
                success: false,
                message: 'Invalid language. Must be one of: ' + validLanguages.join(', ')
            });
        }
        console.log(`✅ [UPLOAD ${uploadId}] Language validated: "${langLower}"`);
        
        // Step 3: Parse date
        console.log(`📅 [UPLOAD ${uploadId}] Parsing date: "${date}"`);
        const promotionDate = new Date(date);
        promotionDate.setHours(0, 0, 0, 0);
        console.log(`✅ [UPLOAD ${uploadId}] Date parsed:`, promotionDate.toISOString());
        
        // Step 4: Find existing promotion for this date+language or create new
        console.log(`🔍 [UPLOAD ${uploadId}] Searching for existing promotion with date: ${promotionDate.toISOString()} and language: ${langLower}`);
        
        let promotion = await Promotion.findOne({ 
            date: promotionDate, 
            language: langLower 
        });
        
        if (promotion) {
            console.log(`♻️ [UPLOAD ${uploadId}] Found existing promotion, updating it:`, promotion._id);
            // Update existing
            promotion.imageData = req.file.buffer;
            promotion.contentType = req.file.mimetype;
            promotion.uploadedBy = uploadedBy || 'admin';
            promotion.uploadedAt = new Date();
            if (about !== undefined) {
                promotion.about = about || '';
            }
        } else {
            console.log(`➕ [UPLOAD ${uploadId}] Creating new promotion document`);
            // Create new
            promotion = new Promotion({
                date: promotionDate,
                about: about || '',
                language: langLower,
                imageData: req.file.buffer,
                contentType: req.file.mimetype,
                uploadedBy: uploadedBy || 'admin',
                uploadedAt: new Date()
            });
        }
        
        console.log(`📊 [UPLOAD ${uploadId}] Document size: ${req.file.buffer.length} bytes (${(req.file.buffer.length / 1024).toFixed(2)} KB)`);
        
        // Step 5: Save to database
        console.log(`💾 [UPLOAD ${uploadId}] Saving to database...`);
        await promotion.save();
        console.log(`✅ [UPLOAD ${uploadId}] Successfully saved to database`);
        console.log(`🎉 [UPLOAD ${uploadId}] Upload complete for ${langLower} on ${date}`);
        
        res.json({
            success: true,
            message: `Promotion uploaded successfully for ${language} on ${date}`,
            promotionId: promotion._id,
            date: promotion.date,
            language: langLower
        });
        
        console.log(`✅ [UPLOAD ${uploadId}] Response sent successfully\n`);
    } catch (error) {
        console.error(`❌❌❌ [UPLOAD ${uploadId}] CRITICAL ERROR ❌❌❌`);
        console.error(`❌ [UPLOAD ${uploadId}] Error name:`, error.name);
        console.error(`❌ [UPLOAD ${uploadId}] Error message:`, error.message);
        console.error(`❌ [UPLOAD ${uploadId}] Error stack:`, error.stack);
        
        res.status(500).json({
            success: false,
            message: 'Failed to upload promotion',
            error: error.message,
            errorName: error.name
        });
        
        console.log(`❌ [UPLOAD ${uploadId}] Error response sent\n`);
    }
});

// POST upload multiple languages for a date - DEPRECATED (use single upload endpoint)
// Keeping for backwards compatibility but not recommended
router.post('/upload-multiple', upload.array('images', 12), async (req, res) => {
    try {
        const { date, languages, uploadedBy } = req.body;
        
        if (!date || !languages || !req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Date, languages array, and image files are required'
            });
        }
        
        // Parse languages
        let languageArray;
        if (typeof languages === 'string') {
            try {
                languageArray = JSON.parse(languages);
            } catch {
                languageArray = languages.split(',').map(l => l.trim());
            }
        } else {
            languageArray = languages;
        }
        
        if (req.files.length !== languageArray.length) {
            return res.status(400).json({
                success: false,
                message: 'Number of files must match number of languages'
            });
        }
        
        // Parse date
        const promotionDate = new Date(date);
        promotionDate.setHours(0, 0, 0, 0);
        
        // Upload each language separately with new schema
        const validLanguages = ['hindi', 'english', 'marathi', 'gujarati', 'tamil', 'telugu', 'kannada', 'bengali', 'odia', 'urdu', 'malayalam', 'punjabi'];
        const uploadedLanguages = [];
        
        for (let i = 0; i < req.files.length; i++) {
            const lang = languageArray[i].toLowerCase();
            
            if (!validLanguages.includes(lang)) {
                continue;
            }
            
            // Find or create document for this date+language
            let promotion = await Promotion.findOne({ date: promotionDate, language: lang });
            
            if (promotion) {
                // Update existing
                promotion.imageData = req.files[i].buffer;
                promotion.contentType = req.files[i].mimetype;
                promotion.uploadedBy = uploadedBy || 'admin';
                promotion.uploadedAt = new Date();
            } else {
                // Create new
                promotion = new Promotion({
                    date: promotionDate,
                    language: lang,
                    imageData: req.files[i].buffer,
                    contentType: req.files[i].mimetype,
                    uploadedBy: uploadedBy || 'admin',
                    uploadedAt: new Date()
                });
            }
            
            await promotion.save();
            uploadedLanguages.push(lang);
        }
        
        res.json({
            success: true,
            message: `Promotions uploaded for ${uploadedLanguages.length} languages`,
            date: promotionDate,
            languages: uploadedLanguages
        });
    } catch (error) {
        console.error('Error uploading multiple promotions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload promotions',
            error: error.message
        });
    }
});

// GET all promotions (admin view with metadata only)
router.get('/admin/all', async (req, res) => {
    try {
        // NEW: Group by date and collect languages with metadata
        const promotions = await Promotion.aggregate([
            {
                $group: {
                    _id: '$date',
                    about: { $first: '$about' },
                    languages: {
                        $push: {
                            code: '$language',
                            uploadedAt: '$uploadedAt',
                            contentType: '$contentType',
                            uploadedBy: '$uploadedBy'
                        }
                    },
                    uploadedBy: { $first: '$uploadedBy' },
                    createdAt: { $first: '$createdAt' }
                }
            },
            { $sort: { _id: -1 } }
        ]);
        
        // Transform to admin format
        const transformedPromotions = promotions.map(promo => {
            const languageInfo = {};
            
            promo.languages.forEach(lang => {
                languageInfo[lang.code] = {
                    available: true,
                    uploadedAt: lang.uploadedAt,
                    contentType: lang.contentType
                };
            });
            
            return {
                _id: promo._id,
                date: promo._id,
                about: promo.about || '',
                languages: languageInfo,
                uploadedBy: promo.uploadedBy,
                createdAt: promo.createdAt
            };
        });
        
        res.json({
            success: true,
            promotions: transformedPromotions
        });
    } catch (error) {
        console.error('Error fetching admin promotions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch promotions',
            error: error.message
        });
    }
});

// DELETE all promotions for a specific date
router.delete('/:dateString', async (req, res) => {
    try {
        const { dateString } = req.params;
        
        // Parse the date
        const targetDate = new Date(dateString);
        targetDate.setHours(0, 0, 0, 0);
        
        // Delete all promotions for this date
        const result = await Promotion.deleteMany({ date: targetDate });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'No promotions found for this date'
            });
        }
        
        res.json({
            success: true,
            message: `Deleted ${result.deletedCount} promotion(s) for ${dateString}`
        });
    } catch (error) {
        console.error('Error deleting promotions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete promotions',
            error: error.message
        });
    }
});

// DELETE specific language from a promotion date
router.delete('/:dateString/:language', async (req, res) => {
    try {
        const { dateString, language } = req.params;
        
        // Parse the date
        const targetDate = new Date(dateString);
        targetDate.setHours(0, 0, 0, 0);
        
        const promotion = await Promotion.findOneAndDelete({ 
            date: targetDate, 
            language: language.toLowerCase() 
        });
        
        if (!promotion) {
            return res.status(404).json({
                success: false,
                message: `Promotion not found for ${language} on ${dateString}`
            });
        }
        
        res.json({
            success: true,
            message: `Language ${language} removed from promotion on ${dateString}`
        });
    } catch (error) {
        console.error('Error deleting language:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete language',
            error: error.message
        });
    }
});

module.exports = router;
