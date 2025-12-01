const express = require('express');
const router = express.Router();
const User = require('../models/User');
const multer = require('multer');
const GridFSBucket = require('mongodb').GridFSBucket;
const mongoose = require('mongoose');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

/**
 * POST /api/ads
 * Create a new ad - deduct 1020 credits from channel partner
 * Then forward to main Instantlly Cards backend for ad creation
 */
router.post('/', upload.array('images', 5), async (req, res) => {
  try {
    console.log('📤 Ad creation request received');
    console.log('Body:', req.body);
    console.log('Files:', req.files?.length || 0);

    const { title, phoneNumber, startDate, endDate, uploaderName, uploaderPhone } = req.body;
    const files = req.files;

    // Validation
    if (!title || !phoneNumber || !startDate || !endDate) {
      return res.status(400).json({
        message: 'Missing required fields',
        required: ['title', 'phoneNumber', 'startDate', 'endDate'],
      });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'At least one image is required (bottom image)' });
    }

    // Get the user's phone (who is creating the ad)
    const userPhone = uploaderPhone || phoneNumber;
    console.log('🔍 Looking for user with phone:', userPhone);
    console.log('📞 Available data - uploaderPhone:', uploaderPhone, 'phoneNumber:', phoneNumber);

    // Find user in Channel Partner database
    console.log('🔎 Searching in database...');
    let user = await User.findOne({ phone: userPhone });
    console.log('🎯 Direct match result:', user ? `Found: ${user.name} (${user.phone}) with ${user.credits} credits` : 'Not found');

    // Try phone format variations
    if (!user && userPhone.startsWith('+91')) {
      const phoneWithoutPrefix = userPhone.substring(3);
      console.log('🔄 Trying without +91 prefix:', phoneWithoutPrefix);
      user = await User.findOne({ phone: phoneWithoutPrefix });
      console.log('🎯 Without prefix result:', user ? `Found: ${user.name}` : 'Not found');
    }

    if (!user && !userPhone.startsWith('+')) {
      const phoneWithPrefix = '+91' + userPhone;
      console.log('🔄 Trying with +91 prefix:', phoneWithPrefix);
      user = await User.findOne({ phone: phoneWithPrefix });
      console.log('🎯 With prefix result:', user ? `Found: ${user.name}` : 'Not found');
    }

    console.log('👤 Final user lookup result:', user ? `${user.name} (${user.phone}) with ${user.credits} credits` : 'NOT FOUND');

    if (!user) {
      // Show sample users for debugging
      const sampleUsers = await User.find({}).limit(3).select('name phone credits');
      console.log('📋 Sample users in database:', sampleUsers);
      
      return res.status(404).json({
        message: 'User not found. Please ensure you are logged in.',
        searchedPhone: userPhone,
        debug: {
          triedPhones: [
            userPhone,
            userPhone.startsWith('+91') ? userPhone.substring(3) : null,
            !userPhone.startsWith('+') ? '+91' + userPhone : null
          ].filter(Boolean)
        }
      });
    }

    // Check credits
    const currentCredits = user.credits || 0;
    if (currentCredits < 1020) {
      return res.status(400).json({
        message: 'Insufficient credits. You need 1020 credits to create an ad.',
        currentCredits: currentCredits,
        required: 1020,
      });
    }

    // Deduct 1020 credits
    user.credits = currentCredits - 1020;
    user.creditsHistory = user.creditsHistory || [];
    user.creditsHistory.push({
      type: 'deduction',
      amount: -1020,
      description: `Ad creation: ${title}`,
      date: new Date(),
    });
    await user.save();

    console.log(`✅ Deducted 1020 credits from ${user.phone}. Remaining: ${user.credits}`);

    // Now forward the request to main Instantlly Cards backend for ad storage
    const FormData = require('form-data');
    const fetch = require('node-fetch');
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('phoneNumber', phoneNumber);
    formData.append('startDate', startDate);
    formData.append('endDate', endDate);
    formData.append('uploaderName', uploaderName || user.name);
    formData.append('uploaderPhone', user.phone);

    // Add images
    files.forEach((file, index) => {
      formData.append('images', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });
    });

    const MAIN_BACKEND_URL = process.env.MAIN_BACKEND_URL || 'https://instantlly-cards-backend-6ki0.onrender.com/api';
    const response = await fetch(`${MAIN_BACKEND_URL}/channel-partner/ads`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Ad created successfully in main backend');
      return res.status(201).json({
        message: 'Ad submitted successfully! 1020 credits deducted. Admin will review your ad. You will need to pay ₹180 after approval.',
        creditsDeducted: 1020,
        remainingCredits: user.credits,
        cashPaymentRequired: 180,
        totalCost: '1020 credits + ₹180 cash',
        ad: data.ad || data,
      });
    } else {
      // Refund credits if ad creation failed
      user.credits = currentCredits;
      user.creditsHistory.push({
        type: 'bonus',
        amount: 1020,
        description: `Ad creation failed - refund: ${title}`,
        date: new Date(),
      });
      await user.save();

      console.error('❌ Ad creation failed in main backend, credits refunded');
      return res.status(response.status).json({
        message: data.message || 'Failed to create ad in main backend. Credits have been refunded.',
        refunded: true,
      });
    }
  } catch (error) {
    console.error('❌ Ad creation error:', error);
    return res.status(500).json({
      message: 'Failed to create ad',
      error: error.message,
    });
  }
});

module.exports = router;
