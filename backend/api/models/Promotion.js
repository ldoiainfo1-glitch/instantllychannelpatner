const mongoose = require('mongoose');

// NEW SCHEMA: One document per language per date
// This avoids MongoDB's 16MB document size limit
const promotionSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        index: true
    },
    language: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true
    },
    imageData: {
        type: Buffer,
        required: true
    },
    contentType: {
        type: String,
        required: true
    },
    uploadedBy: {
        type: String,
        required: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound index for efficient querying by date and language
promotionSchema.index({ date: -1, language: 1 });

// Unique constraint: one document per date+language combination
promotionSchema.index({ date: 1, language: 1 }, { unique: true });

module.exports = mongoose.model('Promotion', promotionSchema);
