const mongoose = require('mongoose');

/**
 * PricingChangeLog Model
 * Audit trail for all pricing changes
 * Tracks who changed what, when, and from what values
 */
const pricingChangeLogSchema = new mongoose.Schema({
  // Reference to position and override
  positionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Position',
    required: true,
    index: true
  },
  
  overrideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PricingOverride',
    index: true
  },
  
  // Position details (denormalized)
  positionDetails: {
    post: String,
    designation: String,
    locationString: String  // e.g., "Maharashtra > Mumbai > Andheri"
  },
  
  // Action type
  action: {
    type: String,
    enum: ['CREATED', 'UPDATED', 'DELETED', 'RESTORED_DEFAULT'],
    required: true,
    index: true
  },
  
  // Old values (before change)
  oldValues: {
    tiers: [{
      pay: Number,
      profit: Number,
      profitPercentage: Number,
      credit: Number,
      creditPercentage: Number
    }]
  },
  
  // New values (after change)
  newValues: {
    tiers: [{
      pay: Number,
      profit: Number,
      profitPercentage: Number,
      credit: Number,
      creditPercentage: Number
    }]
  },
  
  // Who made the change
  changedBy: {
    adminId: {
      type: String,
      required: true
    },
    adminName: String,
    adminEmail: String,
    ipAddress: String
  },
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Additional notes
  notes: String,
  
  // Change summary for quick display
  changeSummary: String  // e.g., "Updated commission from 85% to 90% for ₹90K plan"
  
}, {
  timestamps: false  // We use custom timestamp field
});

// Indexes
pricingChangeLogSchema.index({ positionId: 1, timestamp: -1 });
pricingChangeLogSchema.index({ 'changedBy.adminId': 1, timestamp: -1 });
pricingChangeLogSchema.index({ timestamp: -1 });

// Static method to create log entry
pricingChangeLogSchema.statics.logChange = async function(logData) {
  const log = new this(logData);
  return await log.save();
};

// Static method to get change history for a position
pricingChangeLogSchema.statics.getPositionHistory = async function(positionId, limit = 50) {
  return await this.find({ positionId })
    .sort({ timestamp: -1 })
    .limit(limit);
};

// Static method to get all recent changes
pricingChangeLogSchema.statics.getRecentChanges = async function(limit = 100) {
  return await this.find()
    .sort({ timestamp: -1 })
    .limit(limit);
};

// Method to generate change summary
pricingChangeLogSchema.methods.generateSummary = function() {
  const { action, oldValues, newValues } = this;
  
  if (action === 'CREATED') {
    return `Created custom pricing with ${newValues.tiers?.length || 0} tiers`;
  }
  
  if (action === 'DELETED' || action === 'RESTORED_DEFAULT') {
    return `Removed custom pricing, restored to default`;
  }
  
  if (action === 'UPDATED' && oldValues?.tiers && newValues?.tiers) {
    const changes = [];
    newValues.tiers.forEach((newTier, i) => {
      const oldTier = oldValues.tiers[i];
      if (oldTier) {
        if (oldTier.profitPercentage !== newTier.profitPercentage) {
          changes.push(`Commission ${oldTier.profitPercentage}% → ${newTier.profitPercentage}%`);
        }
        if (oldTier.creditPercentage !== newTier.creditPercentage) {
          changes.push(`Credits ${oldTier.creditPercentage}% → ${newTier.creditPercentage}%`);
        }
      }
    });
    return changes.length > 0 ? changes.join(', ') : 'Updated pricing tiers';
  }
  
  return 'Pricing modified';
};

// Pre-save hook to generate summary
pricingChangeLogSchema.pre('save', function(next) {
  if (!this.changeSummary) {
    this.changeSummary = this.generateSummary();
  }
  next();
});

module.exports = mongoose.model('PricingChangeLog', pricingChangeLogSchema);
