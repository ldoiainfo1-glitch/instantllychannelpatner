const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  country: {
    type: String,
    default: 'India'
  },
  zone: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  division: {
    type: String,
    required: true
  },
  district: {
    type: String,
    required: true
  },
  tehsil: {
    type: String,
    required: false  // Optional - allows district-level locations
  },
  pincode: {
    type: String,
    required: false  // Optional - allows district-level locations
  },
  village: {
    type: String,
    required: false  // Optional - allows district-level locations
  }
}, {
  timestamps: true
});

// Create indexes for faster queries
locationSchema.index({ zone: 1 });
locationSchema.index({ state: 1 });
locationSchema.index({ division: 1 });
locationSchema.index({ district: 1 });
locationSchema.index({ tehsil: 1 });
locationSchema.index({ pincode: 1 });
locationSchema.index({ village: 1 });

module.exports = mongoose.model('Location', locationSchema);
