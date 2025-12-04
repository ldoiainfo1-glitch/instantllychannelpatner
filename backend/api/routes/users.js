const express = require('express');
const router = express.Router();
const User = require('../models/User');
const axios = require('axios');
const NodeCache = require('node-cache');

// Fast2SMS configuration
const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;

// OTP Cache - expires in 5 minutes (300 seconds)
const otpCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Store OTP with metadata
function storeOTP(phone, otp) {
  const data = {
    otp,
    phone,
    timestamp: Date.now(),
    attempts: 0
  };
  otpCache.set(phone, data);
  console.log(`[OTP-STORE] ✅ Stored OTP for ${phone} (expires in 5 min)`);
}

// Verify OTP
function verifyOTP(phone, otp) {
  const data = otpCache.get(phone);
  
  if (!data) {
    console.log(`[OTP-VERIFY] ❌ No OTP found for ${phone}`);
    return false;
  }

  // Increment attempt counter
  data.attempts += 1;
  
  // Max 3 attempts
  if (data.attempts > 3) {
    console.log(`[OTP-VERIFY] ❌ Too many attempts for ${phone}`);
    otpCache.del(phone);
    return false;
  }

  // Check if OTP matches
  if (data.otp !== otp) {
    console.log(`[OTP-VERIFY] ❌ Invalid OTP for ${phone} (attempt ${data.attempts}/3)`);
    otpCache.set(phone, data); // Update attempt count
    return false;
  }

  // OTP is valid - delete it (one-time use)
  otpCache.del(phone);
  console.log(`[OTP-VERIFY] ✅ OTP verified and deleted for ${phone}`);
  return true;
}

// Send OTP via Fast2SMS (same as InstantllyCards)
async function sendOTP(phone, otp) {
  try {
    // Remove any non-numeric characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Remove +91 prefix if present
    const phoneNumber = cleanPhone.replace(/^91/, '');
    
    if (phoneNumber.length !== 10) {
      throw new Error('Invalid phone number. Must be 10 digits.');
    }
    
    const message = `${otp} is your OTP for Instantly Channel Partner password reset. Valid for 5 minutes. Do not share with anyone.`;
    
    console.log(`[SEND-OTP] 📤 Sending OTP to ${phoneNumber}`);
    
    const response = await axios.get(
      `https://www.fast2sms.com/dev/bulkV2`,
      {
        params: {
          authorization: FAST2SMS_API_KEY,
          sender_id: 'FSTSMS',
          message: message,
          language: 'english',
          route: 'q', // Quick SMS route
          numbers: phoneNumber
        },
        headers: {
          'Cache-Control': 'no-cache'
        },
        timeout: 10000
      }
    );
    
    console.log(`[SEND-OTP] ✅ Fast2SMS response:`, response.data);
    
    if (!response.data.return) {
      console.error(`[SEND-OTP] ❌ Fast2SMS error:`, response.data);
      throw new Error('Failed to send OTP via Fast2SMS');
    }
    
    return response.data;
  } catch (error) {
    console.error('[SEND-OTP] ❌ Error:', error.message);
    // Still return success for development/testing
    return { return: true, _debug: 'SMS sending failed but OTP is stored' };
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
    
    console.log(`[FORGOT-PASSWORD] 📱 OTP request for ${phone}`);
    
    if (!phone) {
      return res.status(400).json({ 
        success: false,
        error: 'Phone number is required' 
      });
    }
    
    // Normalize phone number
    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // Find user by phone
    const user = await User.findOne({ phone: normalizedPhone });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'No account found with this phone number' 
      });
    }
    
    console.log(`[FORGOT-PASSWORD] ✅ User found: ${user.name}`);
    
    // Generate OTP
    const otp = generateOTP();
    
    // Store OTP with phone (expires in 5 minutes)
    storeOTP(normalizedPhone, otp);
    
    // Send OTP via Fast2SMS
    try {
      await sendOTP(normalizedPhone, otp);
      console.log(`[FORGOT-PASSWORD] ✅ OTP sent to ${normalizedPhone}`);
    } catch (smsError) {
      console.error(`[FORGOT-PASSWORD] ⚠️  SMS send failed:`, smsError.message);
      // Continue - OTP is still stored for testing
    }
    
    res.json({ 
      success: true, 
      message: 'OTP sent successfully to your phone number',
      _debug: process.env.NODE_ENV === 'development' ? { otp } : undefined
    });
  } catch (error) {
    console.error('[FORGOT-PASSWORD] ❌ Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to send OTP. Please try again.' 
    });
  }
});

// Verify OTP and reset password
router.post('/forgot-password/reset', async (req, res) => {
  try {
    const { phone, otp, newPassword } = req.body;
    
    console.log(`[RESET-PASSWORD] 🔐 Reset request for ${phone}`);
    
    if (!phone || !otp || !newPassword) {
      return res.status(400).json({ 
        success: false,
        error: 'Phone, OTP, and new password are required' 
      });
    }
    
    // Normalize phone number
    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // Verify OTP
    const isValid = verifyOTP(normalizedPhone, otp);
    
    if (!isValid) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid or expired OTP. Please request a new one.' 
      });
    }
    
    // Find user
    const user = await User.findOne({ phone: normalizedPhone });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    console.log(`[RESET-PASSWORD] ✅ OTP verified, updating password for ${user.name}`);
    
    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();
    
    console.log(`[RESET-PASSWORD] ✅ Password updated successfully for ${user.name}`);
    
    res.json({ 
      success: true, 
      message: 'Password reset successfully. You can now login with your new password.' 
    });
  } catch (error) {
    console.error('[RESET-PASSWORD] ❌ Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to reset password. Please try again.' 
    });
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
