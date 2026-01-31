const mongoose = require('mongoose');

const adSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in months
    required: true
  },
  cost: {
    type: Number,
    required: true
  },
  uploaderName: {
    type: String,
    required: true
  },
  uploaderPhone: {
    type: String,
    required: true
  },
  bottomMediaType: {
    type: String,
    enum: ['image', 'video'],
    default: 'image'
  },
  fullscreenMediaType: {
    type: String,
    enum: ['image', 'video'],
    default: 'image'
  },
  bottomImageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'fs.files' // GridFS file reference
  },
  bottomVideoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'fs.files'
  },
  fullscreenImageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'fs.files'
  },
  fullscreenVideoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'fs.files'
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminComments: {
    type: String
  },
  mainBackendAdId: {
    type: String, // ID from main instantllycards backend
  },
  mainBackendSyncStatus: {
    type: String,
    enum: ['pending', 'synced', 'failed'],
    default: 'pending'
  },
  mainBackendError: {
    type: String
  }
}, {
  timestamps: true
});

// Index for faster queries
adSchema.index({ approvalStatus: 1, createdAt: -1 });
adSchema.index({ uploaderPhone: 1 });

module.exports = mongoose.model('Ad', adSchema);
