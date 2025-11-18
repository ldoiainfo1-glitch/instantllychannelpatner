const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        index: true
    },
    languages: {
        type: Map,
        of: {
            imageData: Buffer,
            contentType: String,
            uploadedAt: Date
        },
        default: {}
    },
    uploadedBy: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for efficient querying
promotionSchema.index({ date: -1 });

module.exports = mongoose.model('Promotion', promotionSchema);
