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
  pincode: {
    type: String,
    required: false,
    validate: {
      validator: function(v) {
        return !v || /^[0-9]{6}$/.test(v);
      },
      message: 'Pincode must be 6 digits'
    }
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
  // NEW CREDIT SYSTEM: Separate cash and extra credits
  credits: {
    type: Number,
    default: 0,  // Total credits (cash + extra)
    min: 0
  },
  cashCredits: {
    type: Number,
    default: 0,  // Cash credits (paid amount converted to credits)
    min: 0
  },
  extraCredits: {
    type: Number,
    default: 0,  // Bonus/Extra credits given free
    min: 0
  },
  // Cash table transactions (paid credits)
  cashHistory: [{
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    balance: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  // Extra credits table transactions (bonus credits)
  extraHistory: [{
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    balance: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  // Legacy credits history (keep for backward compatibility)
  creditsHistory: [{
    type: {
      type: String,
      enum: ['initial', 'referral', 'purchase', 'deduction', 'bonus'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    referredUser: {
      type: String  // Name or phone of referred user
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  // Commission balance (withdrawable) and history
  commissionBalance: {
    type: Number,
    default: 0
  },
  commissionHistory: [{
    type: {
      type: String,
      enum: ['credit', 'withdraw'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    balance: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    fromAdId: {
      type: String
    },
    level: {
      type: String
    },
    // Commission percentage (e.g., 10, 20, 5, 2.5)
    percent: {
      type: Number
    },
    // Position details for commission tracking
    positionLevel: {
      type: String
    },
    positionLocation: {
      type: String
    },
    uploaderName: {
      type: String
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
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
