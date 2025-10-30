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
      required: false,
      default: ''
    },
    photo: {
      type: String,
      required: false,
      default: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9IiNlMmU4ZjAiLz4KPHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSIxNiIgeT0iMTYiPgo8cGF0aCBkPSJNMjQgMjRDMjguNDE4MyAyNCAzMiAyMC40MTgzIDMyIDE2QzMyIDExLjU4MTcgMjguNDE4MyA4IDI0IDhDMTkuNTgxNyA4IDE2IDExLjU4MTcgMTYgMTZDMTYgMjAuNDE4MyAxOS41ODE3IDI0IDI0IDI0WiIgZmlsbD0iIzYzNjM3NiIvPgo8cGF0aCBkPSJNMjQgMjhDMTguNjcgMjggMTQgMzIuNjcgMTQgMzhWNDBIMzRWMzhDMzQgMzIuNjcgMjkuMzMgMjggMjQgMjhaIiBmaWxsPSIjNjM2Mzc2Ii8+Cjwvc3ZnPgo8L3N2Zz4='
    },
    address: {
      type: String,
      required: false,
      default: ''
    },
    companyName: {
      type: String,
      required: false,
      default: ''
    },
    businessName: {
      type: String,
      required: false,
      default: ''
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
