const mongoose = require('mongoose');

const locationBulkAuditLogSchema = new mongoose.Schema({
  // Admin who performed the operation
  adminId: {
    type: String,
    required: true
  },
  adminUsername: {
    type: String,
    required: true
  },
  
  // Operation details
  operationType: {
    type: String,
    enum: ['bulk-remap', 'find-replace'],
    default: 'bulk-remap'
  },
  
  // Number of records affected
  affectedRecordCount: {
    type: Number,
    required: true
  },
  
  // Location IDs that were updated
  locationIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location'
  }],
  
  // Fields that were updated
  updatedFields: [String],
  
  // Old values snapshot (array of location objects before update)
  oldValuesJson: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  // New values snapshot (array of location objects after update)
  newValuesJson: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  // Related updates
  relatedUpdates: {
    applicationsUpdated: {
      type: Number,
      default: 0
    },
    positionsUpdated: {
      type: Number,
      default: 0
    }
  },
  
  // Execution details
  executionStatus: {
    type: String,
    enum: ['success', 'partial', 'failed'],
    default: 'success'
  },
  executionDuration: {
    type: Number, // milliseconds
    required: false
  },
  errorDetails: {
    type: String,
    required: false
  },
  
  // IP and user agent for security
  ipAddress: String,
  userAgent: String,
  
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for faster queries
locationBulkAuditLogSchema.index({ adminUsername: 1 });
locationBulkAuditLogSchema.index({ createdAt: -1 });
locationBulkAuditLogSchema.index({ operationType: 1 });

module.exports = mongoose.model('LocationBulkAuditLog', locationBulkAuditLogSchema);
