const express = require('express');
const router = express.Router();
const User = require('../models/User');
const axios = require('axios');

// Fast2SMS configuration (you'll need to add API key in .env)
const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Store OTPs temporarily (in production, use Redis)
const otpStore = new Map();

// Send OTP via Fast2SMS
async function sendOTP(phone, otp) {
  try {
    const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
      route: 'v3',
      sender_id: 'TXTIND',
      message: `Your OTP for Instantly Cards password reset is: ${otp}. Valid for 10 minutes.`,
      language: 'english',
      flash: 0,
      numbers: phone
    }, {
      headers: {
        'authorization': FAST2SMS_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error sending OTP:', error);
    throw new Error('Failed to send OTP');
  }
}

// User login
router.post('/login', async (req, res) => {
  try {
    const { loginId, password } = req.body;
    
    const user = await User.findOne({ loginId }).populate('positionId');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Return user data (excluding password)
    const userData = {
      id: user._id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      personCode: user.personCode,
      loginId: user.loginId,
      credits: user.credits,
      introducedCount: user.introducedCount,
      position: user.positionId,
      isVerified: user.isVerified,
      isFirstLogin: user.isFirstLogin,
      photo: user.photo
    };
    
    res.json({ success: true, user: userData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change password
router.post('/change-password', async (req, res) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    user.password = newPassword;
    user.isFirstLogin = false;
    await user.save();
    
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Request OTP for forgot password
router.post('/forgot-password/request-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ error: 'User not found with this phone number' });
    }
    
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    otpStore.set(phone, { otp, expiresAt, userId: user._id.toString() });
    
    // Send OTP via Fast2SMS
    await sendOTP(phone, otp);
    
    res.json({ success: true, message: 'OTP sent to your phone number' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify OTP and reset password
router.post('/forgot-password/verify-otp', async (req, res) => {
  try {
    const { phone, otp, newPassword } = req.body;
    
    const storedData = otpStore.get(phone);
    if (!storedData) {
      return res.status(400).json({ error: 'OTP not found or expired' });
    }
    
    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(phone);
      return res.status(400).json({ error: 'OTP expired' });
    }
    
    if (storedData.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }
    
    const user = await User.findById(storedData.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.password = newPassword;
    await user.save();
    
    otpStore.delete(phone);
    
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user profile
router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('positionId')
      .select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user credits history
router.get('/:userId/credits-history', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('creditsHistory credits');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Sort credits history by date (newest first)
    const history = user.creditsHistory || [];
    history.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json({ 
      creditsHistory: history,
      currentCredits: user.credits
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process payment
router.post('/:userId/process-payment', async (req, res) => {
  try {
    const { amount, paymentMethod, transactionId } = req.body;
    
    const user = await User.findById(req.params.userId).populate('positionId');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify payment amount matches position contribution
    const position = await require('../models/Position').findById(user.positionId);
    if (!position) {
      return res.status(404).json({ error: 'Position not found' });
    }
    
    if (amount !== position.contribution) {
      return res.status(400).json({ 
        error: `Payment amount must be ₹${position.contribution}` 
      });
    }
    
    // Payment rule: ₹10,000 → 60,000 credits
    let creditsToAdd = 0;
    if (amount === 10000) {
      creditsToAdd = 60000;
    } else {
      // For other amounts, credits = amount * 6
      creditsToAdd = amount * 6;
    }
    
    user.credits += creditsToAdd;
    user.paymentStatus = 'paid';
    user.paymentAmount = amount;
    user.paymentDate = new Date();
    await user.save();
    
    // Update position status
    position.status = 'Occupied';
    await position.save();
    
    res.json({ 
      success: true, 
      message: 'Payment processed successfully',
      user, 
      creditsAdded: creditsToAdd,
      paymentDetails: {
        amount,
        paymentMethod,
        transactionId,
        paymentDate: user.paymentDate
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user credits after payment
router.post('/:userId/add-credits', async (req, res) => {
  try {
    const { amount } = req.body;
    
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Payment rule: ₹10,000 → 60,000 credits
    if (amount === 10000) {
      user.credits += 60000;
      user.paymentStatus = 'paid';
      user.paymentDate = new Date();
      await user.save();
      
      res.json({ success: true, user, creditsAdded: 60000 });
    } else {
      res.status(400).json({ error: 'Invalid payment amount' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get introduced count
router.get('/:personCode/introduced-count', async (req, res) => {
  try {
    const count = await User.countDocuments({ introducedBy: req.params.personCode });
    res.json({ personCode: req.params.personCode, count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /users/my-ads
 * Fetch current user's ads from Instantlly Cards backend
 * Proxies the request to avoid CORS issues
 */
router.get('/my-ads', async (req, res) => {
  try {
    const fetch = require('node-fetch');
    const { phone } = req.query;
    
    if (!phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone number is required' 
      });
    }
    
    console.log('🔄 Fetching ads for user phone:', phone);
    
    const MAIN_BACKEND_URL = process.env.MAIN_BACKEND_URL || 'https://instantlly-cards-backend-6ki0.onrender.com';
    const url = `${MAIN_BACKEND_URL}/api/channel-partner/ads?phone=${encodeURIComponent(phone)}`;
    
    console.log('🌐 Calling main backend:', url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Fetched ${data.ads?.length || 0} ads for user`);
      res.json(data);
    } else {
      console.error('❌ Failed to fetch user ads:', response.status, data);
      res.status(response.status).json(data);
    }
  } catch (error) {
    console.error('❌ User ads fetch error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch ads',
      error: error.message 
    });
  }
});

module.exports = router;
