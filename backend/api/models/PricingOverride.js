const mongoose = require('mongoose');

/**
 * PricingOverride Model
 * Stores custom pricing overrides for specific positions
 * This allows super admin to set custom prices, commissions, and credits
 * for any channel partner position without changing global defaults
 */
const pricingOverrideSchema = new mongoose.Schema({
  // Reference to the position
  positionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Position',
    required: true,
    index: true
  },
  
  // Position details (denormalized for quick access)
  positionDetails: {
    post: String,
    designation: String,
    location: {
      country: String,
      zone: String,
      state: String,
      division: String,
      district: String,
      tehsil: String,
      pincode: String,
      village: String
    }
  },
  
  // Override status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Default pricing tiers (for reference/restore)
  defaultTiers: [{
    pay: Number,
    profit: Number,
    profitPercentage: Number,  // Commission %
    credit: Number,
    creditPercentage: Number    // Credits %
  }],
  
  // Custom override tiers
  overrideTiers: [{
    pay: {
      type: Number,
      required: true
    },
    profit: {
      type: Number,
      required: true
    },
    profitPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    credit: {
      type: Number,
      required: true
    },
    creditPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 200  // Allow up to 200% for special promotions
    }
  }],
  
  // Admin who created/last updated
  updatedBy: {
    adminId: String,
    adminName: String,
    adminEmail: String
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Notes/reason for override
  notes: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
pricingOverrideSchema.index({ positionId: 1, isActive: 1 });
pricingOverrideSchema.index({ 'positionDetails.location.state': 1 });
pricingOverrideSchema.index({ 'positionDetails.location.zone': 1 });
pricingOverrideSchema.index({ 'positionDetails.post': 1 });

// Method to get active override for a position
pricingOverrideSchema.statics.getActiveOverride = async function(positionId) {
  return await this.findOne({ positionId, isActive: true });
};

// Method to deactivate override (soft delete)
pricingOverrideSchema.methods.deactivate = async function() {
  this.isActive = false;
  this.updatedAt = new Date();
  return await this.save();
};

// Method to calculate tier values from percentage
pricingOverrideSchema.statics.calculateTierFromPercentage = function(pay, profitPercent, creditPercent) {
  return {
    pay: pay,
    profit: Math.round(pay * (profitPercent / 100)),
    profitPercentage: profitPercent,
    credit: Math.round(pay * (creditPercent / 100)),
    creditPercentage: creditPercent
  };
};

module.exports = mongoose.model('PricingOverride', pricingOverrideSchema);
