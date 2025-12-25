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
        
        // Use aggregation with $objectToArray to get only keys without loading buffer values
        const aggregateStart = Date.now();
        const promotions = await Promotion.aggregate([
            { $sort: { date: -1 } },
            { $limit: 50 },
            {
                $project: {
                    _id: 1,
                    date: 1,
                    createdAt: 1,
                    // Convert languages map to array of key-value pairs
                    languagesArray: { $objectToArray: '$languages' }
                }
            },
            {
                $project: {
                    _id: 1,
                    date: 1,
                    createdAt: 1,
                    // Extract just the keys (language codes)
                    languages: {
                        $map: {
                            input: '$languagesArray',
                            as: 'item',
                            in: '$$item.k'
                        }
                    }
                }
            }
        ]);
        const aggregateTime = Date.now() - aggregateStart;
        
        console.log(`   ⏱️  Aggregation: ${aggregateTime}ms`);
        console.log(`   📊 Found ${promotions.length} promotions`);
        console.log(`   ✅ Total time: ${Date.now() - startTime}ms\n`);
        
        // Add cache headers
        res.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
        res.set('ETag', `promotions-list`);
        
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

// GET promotion image by ID and language
router.get('/image/:promotionId/:language', async (req, res) => {
    const startTime = Date.now();
    try {
        const { promotionId, language } = req.params;
        console.log(`🖼️  [${new Date().toISOString()}] Image request: ${promotionId}/${language}`);
        
        // Step 1: Query MongoDB - get the full document (Map type doesn't support field selection)
        const queryStart = Date.now();
        const promotion = await Promotion.findById(promotionId)
            .maxTimeMS(15000); // 15 second timeout
        const queryTime = Date.now() - queryStart;
        console.log(`   ⏱️  MongoDB query: ${queryTime}ms`);
        
        if (!promotion) {
            console.log(`   ❌ Promotion not found: ${promotionId}`);
            return res.status(404).json({
                success: false,
                message: 'Promotion not found'
            });
        }
        
        // Step 2: Extract language data from Map
        const extractStart = Date.now();
        const languageData = promotion.languages.get(language);
        const extractTime = Date.now() - extractStart;
        console.log(`   ⏱️  Data extraction: ${extractTime}ms`);
        
        if (!languageData || !languageData.imageData) {
            console.log(`   ❌ Image not available for ${language}`);
            console.log(`   Available languages: ${Array.from(promotion.languages.keys()).join(', ')}`);
            return res.status(404).json({
                success: false,
                message: `Image not available for ${language}`
            });
        }
        
        // Step 3: Get buffer info
        const bufferSize = languageData.imageData.length;
        const bufferSizeMB = (bufferSize / (1024 * 1024)).toFixed(2);
        console.log(`   📦 Image size: ${bufferSizeMB}MB (${bufferSize} bytes)`);
        
        // Step 4: Set headers and send
        const sendStart = Date.now();
        res.set('Content-Type', languageData.contentType || 'image/png');
        res.set('Cache-Control', 'public, max-age=604800'); // Cache for 7 days
        res.set('ETag', `${promotionId}-${language}`);
        res.set('Content-Length', bufferSize);
        
        res.send(languageData.imageData);
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
        const { date, language, uploadedBy } = req.body;
        console.log(`📝 [UPLOAD ${uploadId}] Request body:`, { date, language, uploadedBy });
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
        const validLanguages = ['hindi', 'english', 'marathi', 'gujarati', 'tamil', 'telugu', 'kannada', 'bengali', 'odia', 'urdu', 'malayalam', 'punjabi'];
        const langLower = language.toLowerCase();
        console.log(`🔍 [UPLOAD ${uploadId}] Validating language: "${langLower}"`);
        console.log(`📋 [UPLOAD ${uploadId}] Valid languages:`, validLanguages);
        
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
        promotionDate.setHours(0, 0, 0, 0); // Normalize to start of day
        console.log(`✅ [UPLOAD ${uploadId}] Date parsed:`, promotionDate.toISOString());
        
        // Step 4: Find or create promotion for this date
        console.log(`🔍 [UPLOAD ${uploadId}] Searching for existing promotion with date:`, promotionDate);
        let promotion = await Promotion.findOne({ date: promotionDate });
        
        if (!promotion) {
            console.log(`➕ [UPLOAD ${uploadId}] No existing promotion found, creating new one`);
            promotion = new Promotion({
                date: promotionDate,
                languages: new Map(),
                uploadedBy: uploadedBy || 'admin'
            });
            console.log(`✅ [UPLOAD ${uploadId}] New promotion object created`);
        } else {
            console.log(`✅ [UPLOAD ${uploadId}] Found existing promotion:`, promotion._id);
            console.log(`📋 [UPLOAD ${uploadId}] Existing languages:`, Array.from(promotion.languages.keys()));
        }
        
        // Step 5: Add or update language data
        console.log(`💾 [UPLOAD ${uploadId}] Setting language data for: "${langLower}"`);
        console.log(`📊 [UPLOAD ${uploadId}] Buffer size: ${req.file.buffer.length} bytes`);
        
        promotion.languages.set(langLower, {
            imageData: req.file.buffer,
            contentType: req.file.mimetype,
            uploadedAt: new Date()
        });
        console.log(`✅ [UPLOAD ${uploadId}] Language data set in Map`);
        console.log(`📋 [UPLOAD ${uploadId}] Current languages in Map:`, Array.from(promotion.languages.keys()));
        
        // Step 6: Save to database
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

// POST upload multiple languages for a date
router.post('/upload-multiple', upload.array('images', 10), async (req, res) => {
    try {
        const { date, languages, uploadedBy } = req.body;
        
        if (!date || !languages || !req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Date, languages array, and image files are required'
            });
        }
        
        // Parse languages (should be comma-separated or JSON array)
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
        
        // Find or create promotion
        let promotion = await Promotion.findOne({ date: promotionDate });
        
        if (!promotion) {
            promotion = new Promotion({
                date: promotionDate,
                languages: new Map(),
                uploadedBy: uploadedBy || 'admin'
            });
        }
        
        // Add all language data
        const validLanguages = ['hindi', 'english', 'marathi', 'gujarati', 'tamil', 'telugu', 'kannada', 'bengali', 'odia', 'urdu', 'malayalam', 'punjabi'];
        const uploadedLanguages = [];
        
        for (let i = 0; i < req.files.length; i++) {
            const lang = languageArray[i].toLowerCase();
            
            if (!validLanguages.includes(lang)) {
                continue; // Skip invalid languages
            }
            
            promotion.languages.set(lang, {
                imageData: req.files[i].buffer,
                contentType: req.files[i].mimetype,
                uploadedAt: new Date()
            });
            
            uploadedLanguages.push(lang);
        }
        
        await promotion.save();
        
        res.json({
            success: true,
            message: `Promotions uploaded for ${uploadedLanguages.length} languages`,
            promotionId: promotion._id,
            date: promotion.date,
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
        const promotions = await Promotion.find({})
            .sort({ date: -1 })
            .select('-languages.imageData') // Exclude large image data
            .lean();
        
        // Transform to show language availability
        const transformedPromotions = promotions.map(promo => {
            const languageInfo = {};
            
            if (promo.languages) {
                for (const [lang, data] of Object.entries(promo.languages)) {
                    languageInfo[lang] = {
                        available: !!(data && data.contentType),
                        uploadedAt: data?.uploadedAt,
                        contentType: data?.contentType
                    };
                }
            }
            
            return {
                _id: promo._id,
                date: promo.date,
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

// DELETE promotion by ID
router.delete('/:promotionId', async (req, res) => {
    try {
        const { promotionId } = req.params;
        
        const promotion = await Promotion.findByIdAndDelete(promotionId);
        
        if (!promotion) {
            return res.status(404).json({
                success: false,
                message: 'Promotion not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Promotion deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting promotion:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete promotion',
            error: error.message
        });
    }
});

// DELETE specific language from a promotion
router.delete('/:promotionId/:language', async (req, res) => {
    try {
        const { promotionId, language } = req.params;
        
        const promotion = await Promotion.findById(promotionId);
        
        if (!promotion) {
            return res.status(404).json({
                success: false,
                message: 'Promotion not found'
            });
        }
        
        if (!promotion.languages.has(language)) {
            return res.status(404).json({
                success: false,
                message: `Language ${language} not found in this promotion`
            });
        }
        
        promotion.languages.delete(language);
        await promotion.save();
        
        res.json({
            success: true,
            message: `Language ${language} removed from promotion`
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
