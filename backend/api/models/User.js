const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: false
  },
  personCode: {
    type: String,
    required: false,
    unique: true,
    sparse: true
  },
  loginId: {
    type: String,
    required: false,
    unique: true,
    sparse: true
  },
  password: {
    type: String,
    required: true
    // Password for login (will be hashed)
  },
  credits: {
    type: Number,
    default: 0,
    min: 0
  },
  hasReceivedInitialCredits: {
    type: Boolean,
    default: false
  },
  introducedBy: {
    type: String,
    default: null
  },
  introducedCount: {
    type: Number,
    default: 0
  },
  positionId: {
    type: String  // Changed from ObjectId to String for dynamic position system
  },
  appliedDate: {
    type: Date
  },
  approvedDate: {
    type: Date
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
  },
  isFirstLogin: {
    type: Boolean,
    default: true
  },
  photo: {
    type: String
  },
  documents: {
    panCard: {
      type: String,
      required: false
    },
    aadhaarCard: {
      type: String,
      required: false
    },
    uploadedAt: {
      type: Date
    }
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

// Hash password before saving AND update timestamp
userSchema.pre('save', async function(next) {
  // Update timestamp
  this.updatedAt = Date.now();
  
  // Hash password if modified
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
