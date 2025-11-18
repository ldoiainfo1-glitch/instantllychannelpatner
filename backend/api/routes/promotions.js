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
    try {
        const promotions = await Promotion.find({})
            .sort({ date: -1 })
            .select('date languages createdAt')
            .lean();
        
        // Transform data to include only language names (not the full image data)
        const transformedPromotions = promotions.map(promo => {
            const availableLanguages = [];
            
            if (promo.languages) {
                for (const [lang, data] of Object.entries(promo.languages)) {
                    if (data && data.imageData) {
                        availableLanguages.push(lang);
                    }
                }
            }
            
            return {
                _id: promo._id,
                date: promo.date,
                languages: availableLanguages,
                createdAt: promo.createdAt
            };
        });
        
        res.json({
            success: true,
            promotions: transformedPromotions
        });
    } catch (error) {
        console.error('Error fetching promotions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch promotions',
            error: error.message
        });
    }
});

// GET promotion image by ID and language
router.get('/image/:promotionId/:language', async (req, res) => {
    try {
        const { promotionId, language } = req.params;
        
        const promotion = await Promotion.findById(promotionId);
        
        if (!promotion) {
            return res.status(404).json({
                success: false,
                message: 'Promotion not found'
            });
        }
        
        const languageData = promotion.languages.get(language);
        
        if (!languageData || !languageData.imageData) {
            return res.status(404).json({
                success: false,
                message: `Image not available for ${language}`
            });
        }
        
        // Set appropriate headers
        res.set('Content-Type', languageData.contentType || 'image/png');
        res.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
        
        // Send the image buffer
        res.send(languageData.imageData);
    } catch (error) {
        console.error('Error fetching promotion image:', error);
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
    try {
        const { date, language, uploadedBy } = req.body;
        
        if (!date || !language || !req.file) {
            return res.status(400).json({
                success: false,
                message: 'Date, language, and image file are required'
            });
        }
        
        // Validate language
        const validLanguages = ['hindi', 'english', 'marathi', 'gujarati', 'tamil', 'telugu', 'kannada', 'bengali', 'odia', 'urdu'];
        if (!validLanguages.includes(language.toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid language. Must be one of: ' + validLanguages.join(', ')
            });
        }
        
        // Parse date
        const promotionDate = new Date(date);
        promotionDate.setHours(0, 0, 0, 0); // Normalize to start of day
        
        // Find or create promotion for this date
        let promotion = await Promotion.findOne({ date: promotionDate });
        
        if (!promotion) {
            promotion = new Promotion({
                date: promotionDate,
                languages: new Map(),
                uploadedBy: uploadedBy || 'admin'
            });
        }
        
        // Add or update language data
        promotion.languages.set(language.toLowerCase(), {
            imageData: req.file.buffer,
            contentType: req.file.mimetype,
            uploadedAt: new Date()
        });
        
        await promotion.save();
        
        res.json({
            success: true,
            message: `Promotion uploaded successfully for ${language} on ${date}`,
            promotionId: promotion._id,
            date: promotion.date,
            language: language.toLowerCase()
        });
    } catch (error) {
        console.error('Error uploading promotion:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload promotion',
            error: error.message
        });
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
        const validLanguages = ['hindi', 'english', 'marathi', 'gujarati', 'tamil', 'telugu', 'kannada', 'bengali', 'odia', 'urdu'];
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
