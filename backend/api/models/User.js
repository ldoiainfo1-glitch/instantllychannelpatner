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
    unique: true
  },
  email: {
    type: String,
    required: true
  },
  personCode: {
    type: String,
    required: true,
    unique: true
  },
  loginId: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
    // Default password: First 4 letters of name in CAPITAL (e.g., "John Doe" -> "JOHN")
  },
  credits: {
    type: Number,
    default: 0
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
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Position'
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
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
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

// Update timestamp
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema);
