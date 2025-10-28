const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  positionId: {
    type: String, // Changed from ObjectId to String to support custom position IDs
    required: true,
    index: true // Add index for faster queries
  },
  applicantInfo: {
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    photo: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    companyName: {
      type: String,
      required: true
    },
    businessName: {
      type: String,
      required: true
    }
  },
  // Add location information to the application itself
  location: {
    country: {
      type: String,
      default: 'India'
    },
    zone: String,
    state: String,
    division: String,
    district: String,
    tehsil: String,
    pincode: String,
    village: String
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  introducedBy: {
    type: String,
    default: 'Self'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  appliedDate: {
    type: Date,
    default: Date.now
  },
  approvedDate: {
    type: Date
  },
  adminNotes: {
    type: String
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  paymentAmount: {
    type: Number,
    default: 10000
  },
  paymentDate: {
    type: Date
  },
  isVerified: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('Application', applicationSchema);
