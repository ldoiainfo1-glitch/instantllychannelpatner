const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  country: {
    type: String,
    default: 'India'
  },
  zone: {
    type: String,
    required: false
  },
  state: {
    type: String,
    required: false
  },
  division: {
    type: String,
    required: false
  },
  district: {
    type: String,
    required: false
  },
  tehsil: {
    type: String,
    required: false
  },
  pincode: {
    type: String,
    required: false
  },
  village: {
    type: String,
    required: false
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
