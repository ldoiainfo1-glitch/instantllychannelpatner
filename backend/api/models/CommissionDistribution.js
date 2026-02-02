const mongoose = require('mongoose');

// Model to store commission distribution paths for transparency and tracking
// Shows the complete hierarchy and which positions received commission vs were skipped
const commissionDistributionSchema = new mongoose.Schema({
  // Ad reference (optional - null for cash credits distribution)
  adId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ad',
    required: false  // FIXED: Changed to false for cash credits distribution
  },
  
  // Creator info
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  creatorPhone: {
    type: String,
    required: true,
    index: true
  },
  creatorName: {
    type: String,
    required: true
  },
  
  // Ad details
  adAmount: {
    type: Number,
    required: true
  },
  distributionDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Self commission info
  selfCommission: {
    paid: Boolean,  // true if self got commission, false if skipped (extra credits used)
    amount: Number,
    percent: Number
  },
  
  // Complete hierarchy path from creator upward to country
  // Each entry shows whether position was filled (got commission) or empty (skipped)
  hierarchyPath: [{
    level: {
      type: String,
      enum: ['pincode', 'tehsil', 'district', 'division', 'state', 'zone', 'country'],
      required: true
    },
    location: {
      type: String,  // e.g., "401107", "Thane", "Maharashtra", "India"
      required: true
    },
    holder: {
      type: String,  // Name of position holder, null if empty
      default: null
    },
    holderPhone: {
      type: String,  // Phone of position holder, null if empty
      default: null
    },
    holderId: {
      type: mongoose.Schema.Types.ObjectId,  // User ID of position holder
      ref: 'User',
      default: null
    },
    status: {
      type: String,
      enum: ['filled', 'empty', 'self'],  // filled = got commission, empty = skipped, self = creator
      required: true
    },
    commission: {
      type: Number,  // Amount paid to this position (0 if empty)
      default: 0
    },
    percent: {
      type: Number,  // Percentage paid (0 if empty)
      default: 0
    },
    sequentialPosition: {
      type: Number,  // Parent #1, Parent #2, etc. (null if self or empty)
      default: null
    }
  }],
  
  // Summary stats
  totalDistributed: {
    type: Number,
    required: true
  },
  filledPositions: {
    type: Number,  // Count of positions that received commission
    required: true
  },
  emptyPositions: {
    type: Number,  // Count of positions that were skipped
    required: true
  },
  
  // Credit type used for ad
  creditBreakdown: {
    cash: Number,
    extra: Number
  }
}, {
  timestamps: true  // Adds createdAt and updatedAt
});

// Index for efficient querying by creator
commissionDistributionSchema.index({ creatorPhone: 1, distributionDate: -1 });
commissionDistributionSchema.index({ creatorId: 1, distributionDate: -1 });

// Index for querying by recipients (to show "who paid me" view)
commissionDistributionSchema.index({ 'hierarchyPath.holderPhone': 1, distributionDate: -1 });
commissionDistributionSchema.index({ 'hierarchyPath.holderId': 1, distributionDate: -1 });

module.exports = mongoose.model('CommissionDistribution', commissionDistributionSchema);
