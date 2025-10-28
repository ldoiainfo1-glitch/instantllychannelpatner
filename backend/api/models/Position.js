const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema({
  sNo: {
    type: Number,
    required: true,
    unique: true
  },
  post: {
    type: String,
    required: true,
    enum: ['President', 'Zone Head', 'State Head', 'Division Head', 'District Head', 'Tehsil Head', 'Pincode Head', 'Village Head']
  },
  designation: {
    type: String,
    required: true
  },
  location: {
    country: { type: String, default: 'India' },
    zone: String,
    state: String,
    division: String,
    district: String,
    tehsil: String,
    pincode: String,
    village: String
  },
  contribution: {
    type: Number,
    required: true,
    default: 10000
  },
  credits: {
    type: Number,
    default: 60000
  },
  isTemplate: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['Available', 'Pending', 'Approved', 'Occupied'],
    default: 'Available'
  },
  applicantDetails: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: String,
    phone: String,
    email: String,
    address: String,
    personCode: String,
    photo: String,
    appliedDate: Date,
    introducedBy: String,
    companyName: String,
    businessName: String,
    introducedCount: {
      type: Number,
      default: 0
    },
    days: Number
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

positionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Position', positionSchema);
