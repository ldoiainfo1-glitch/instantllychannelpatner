const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Position = require('../models/Position');
const Ad = require('../models/Ad'); // NEW: Local ad storage
const multer = require('multer');
const GridFSBucket = require('mongodb').GridFSBucket;
const mongoose = require('mongoose');
const { Readable } = require('stream');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // if (!file.mimetype.startsWith('image/')) {
    //   return cb(new Error('Only image files are allowed'));
    // }
    cb(null, true);
  },
});

/**
 * POST /api/ads
 * Create a new ad - deduct 1200 credits from channel partner
 * Then forward to main Instantlly Cards backend for ad creation
 */
// router.post('/', upload.any(), async (req, res) => {
//   try {
//     console.log('📤 Ad creation request received');
//     console.log('Body:', JSON.stringify(req.body, null, 2));
//     console.log('Files:', req.files?.length || 0);

//     const { title, phoneNumber, startDate, endDate, uploaderName, uploaderPhone, bottomMediaType = 'image', fullscreenMediaType = 'image' } = req.body;
//     const files = req.files || [];

//     // Validation
//     if (!title || !phoneNumber || !startDate || !endDate) {
//       return res.status(400).json({
//         message: 'Missing required fields',
//         required: ['title', 'phoneNumber', 'startDate', 'endDate'],
//       });
//     }
//     const bottomImage = files.find(f => f.fieldname === "bottomImage");
//     const bottomVideo = files.find(f => f.fieldname === "bottomVideo");
//     const fullscreenVideo = files.find(f => f.fieldname === "fullscreenVideo")


//     // bottom validation
//     if (bottomMediaType === "image" && !bottomImage) {
//       return res.status(400).json({ message: "Bottom image required" });
//     }

//     if (bottomMediaType === "video" && !bottomVideo) {
//       return res.status(400).json({ message: "Bottom video required" });
//     }

//     // video type validation
//     if (bottomVideo && !bottomVideo.mimetype.startsWith("video/")) {
//       return res.status(400).json({ message: "Bottom video must be video format" });
//     }

//     if (fullscreenVideo && !fullscreenVideo.mimetype.startsWith("video/")) {
//       return res.status(400).json({ message: "Fullscreen video must be video format" });
//     }

//     // if (!files || files.length === 0) {
//     //   return res.status(400).json({ message: 'At least one image is required (bottom image)' });
//     // }

//     // Get the user's phone (who is creating the ad)
//     const userPhone = uploaderPhone || phoneNumber;
//     console.log('🔍 Looking for user with phone:', userPhone);
//     console.log('📞 Available data - uploaderPhone:', uploaderPhone, 'phoneNumber:', phoneNumber);

//     // Find user in Channel Partner database
//     console.log('🔎 Searching in database...');
//     let user = await User.findOne({ phone: userPhone });
//     console.log('🎯 Direct match result:', user ? `Found: ${user.name} (${user.phone}) with ${user.credits} credits` : 'Not found');

//     // Try phone format variations
//     if (!user && userPhone.startsWith('+91')) {
//       const phoneWithoutPrefix = userPhone.substring(3);
//       console.log('🔄 Trying without +91 prefix:', phoneWithoutPrefix);
//       user = await User.findOne({ phone: phoneWithoutPrefix });
//       console.log('🎯 Without prefix result:', user ? `Found: ${user.name}` : 'Not found');
//     }

//     if (!user && !userPhone.startsWith('+')) {
//       const phoneWithPrefix = '+91' + userPhone;
//       console.log('🔄 Trying with +91 prefix:', phoneWithPrefix);
//       user = await User.findOne({ phone: phoneWithPrefix });
//       console.log('🎯 With prefix result:', user ? `Found: ${user.name}` : 'Not found');
//     }

//     console.log('👤 Final user lookup result:', user ? `${user.name} (${user.phone}) with ${user.credits} credits` : 'NOT FOUND');

//     if (!user) {
//       // Show sample users for debugging
//       const sampleUsers = await User.find({}).limit(3).select('name phone credits');
//       console.log('📋 Sample users in database:', sampleUsers.map(u => `${u.name}: ${u.phone} (${u.credits} credits)`));

//       // Count total users
//       const totalUsers = await User.countDocuments();
//       console.log('📊 Total users in database:', totalUsers);

//       return res.status(400).json({
//         message: `User not found with phone ${userPhone}. Please ensure you are logged in.`,
//         searchedPhone: userPhone,
//         currentCredits: 0,
//         required: 1020,
//         debug: {
//           triedPhones: [
//             userPhone,
//             userPhone.startsWith('+91') ? userPhone.substring(3) : null,
//             !userPhone.startsWith('+') ? '+91' + userPhone : null
//           ].filter(Boolean),
//           sampleUsers: sampleUsers.map(u => ({ name: u.name, phone: u.phone, credits: u.credits }))
//         }
//       });
//     }

//     // Check credits
//     const currentCredits = user.credits || 0;
//     if (currentCredits < 1200) {
//       return res.status(400).json({
//         message: 'Insufficient credits. You need 1200 credits to create an ad.',
//         currentCredits: currentCredits,
//         required: 1200,
//       });
//     }

//     // Deduct 1200 credits
//     user.credits = currentCredits - 1200;
//     user.creditsHistory = user.creditsHistory || [];
//     user.creditsHistory.push({
//       type: 'deduction',
//       amount: -1200,
//       description: `Ad creation: ${title}`,
//       date: new Date(),
//     });
//     await user.save();

//     console.log(`✅ Deducted 1200 credits from ${user.phone}. Remaining: ${user.credits}`);

//     // Now forward the request to main Instantlly Cards backend for ad storage
//     const FormData = require('form-data');
//     const fetch = require('node-fetch');

//     const formData = new FormData();
//     formData.append('title', title);
//     formData.append('phoneNumber', phoneNumber);
//     formData.append('startDate', startDate);
//     formData.append('endDate', endDate);
//     formData.append('uploaderName', uploaderName || user.name);
//     formData.append('uploaderPhone', user.phone);
//     formData.append('bottomMediaType', bottomMediaType);
//     formData.append('fullscreenMediaType', fullscreenMediaType);

//     // Add images
//     files.forEach(file => {
//       formData.append(file.fieldname, file.buffer, { filename: file.originalname, contentType: file.mimetype });
//     })

//     const MAIN_BACKEND_URL = process.env.MAIN_BACKEND_URL || 'https://api.instantllycards.com';
//     const response = await fetch(`${MAIN_BACKEND_URL}/api/channel-partner/ads`, {
//       method: 'POST',
//       body: formData,
//     });

//     console.log('📡 Main backend response status:', response.status, response.statusText);
    
//     let data;
//     try {
//       data = await response.json();
//       console.log('📦 Main backend response data:', JSON.stringify(data, null, 2));
//     } catch (parseError) {
//       console.error('❌ Failed to parse main backend response:', parseError.message);
//       const textResponse = await response.text();
//       console.error('📄 Raw response:', textResponse);
      
//       // Refund credits
//       user.credits = currentCredits;
//       user.creditsHistory.push({
//         type: 'bonus',
//         amount: 1200,
//         description: `Ad creation failed - refund: ${title}`,
//         date: new Date(),
//       });
//       await user.save();
      
//       return res.status(500).json({
//         message: 'Main backend returned invalid response. Credits have been refunded.',
//         refunded: true,
//         error: textResponse.substring(0, 200)
//       });
//     }

//     if (response.ok) {
//       console.log('✅ Ad created successfully in main backend');
//       return res.status(201).json({
//         message: 'Ad submitted successfully! 1200 credits deducted. Admin will review your ad.',
//         creditsDeducted: 1200,
//         remainingCredits: user.credits,
//         ad: data.ad || data,
//       });
//     } else {
//       // Refund credits if ad creation failed
//       user.credits = currentCredits;
//       user.creditsHistory.push({
//         type: 'bonus',
//         amount: 1200,
//         description: `Ad creation failed - refund: ${title}`,
//         date: new Date(),
//       });
//       await user.save();

//       console.error('❌ Ad creation failed in main backend, credits refunded');
//       console.error('❌ Error details:', JSON.stringify(data, null, 2));
//       return res.status(response.status).json({
//         message: data.message || 'Failed to create ad in main backend. Credits have been refunded.',
//         refunded: true,
//         mainBackendError: data
//       });
//     }
//   } catch (error) {
//     console.error('❌ Ad creation error:', error);
//     console.error('Error stack:', error.stack);
//     return res.status(500).json({
//       message: 'Failed to create ad',
//       error: error.message,
//       stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
//     });
//   }
// });

router.post('/', upload.any(), async (req, res) => {

  console.log('\n==============================');
  console.log('📤 [AD CREATE] Request received');
  console.log('🕒 Time:', new Date().toISOString());

  try {
    const {
      title,
      phoneNumber,
      startDate,
      endDate,
      cost,
      uploaderName,
      uploaderPhone,
      bottomMediaType = 'image',
      fullscreenMediaType = 'image'
    } = req.body;
    
    const AD_COST = Number(cost);
    const files = req.files || [];

    console.log('📦 Payload:', {
      title,
      phoneNumber,
      uploaderPhone,
      startDate,
      endDate,
      cost: AD_COST,
      bottomMediaType,
      fullscreenMediaType,
      filesCount: files.length
    });

    // =======================
    // BASIC VALIDATION
    // =======================
    if (!title || !phoneNumber || !startDate || !endDate || !AD_COST) {
      console.warn('⚠️ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    if(AD_COST <= 0 || isNaN(AD_COST)) {
      console.warn('⚠️ Invalid ad cost');
      return res.status(400).json({ message: 'Invalid ad cost' });
    }

    const bottomImage = files.find(f => f.fieldname === 'bottomImage');
    const bottomVideo = files.find(f => f.fieldname === 'bottomVideo');
    const fullscreenVideo = files.find(f => f.fieldname === 'fullscreenVideo');

    if (bottomMediaType === 'image' && !bottomImage) {
      console.warn('⚠️ Bottom image missing');
      return res.status(400).json({ message: 'Bottom image required' });
    }

    if (bottomMediaType === 'video' && !bottomVideo) {
      console.warn('⚠️ Bottom video missing');
      return res.status(400).json({ message: 'Bottom video required' });
    }

    if (bottomVideo && !bottomVideo.mimetype.startsWith('video/')) {
      console.warn('⚠️ Invalid bottom video format');
      return res.status(400).json({ message: 'Bottom video must be video format' });
    }

    if (fullscreenVideo && !fullscreenVideo.mimetype.startsWith('video/')) {
      console.warn('⚠️ Invalid fullscreen video format');
      return res.status(400).json({ message: 'Fullscreen video must be video format' });
    }

    // =======================
    // FIND USER
    // =======================
    const userPhone = uploaderPhone || phoneNumber;
    console.log('🔍 Searching user for phone:', userPhone);

    let user = await User.findOne({ phone: userPhone });

    if (!user && userPhone.startsWith('+91')) {
      console.log('🔄 Trying without +91');
      user = await User.findOne({ phone: userPhone.substring(3) });
    }

    if (!user && !userPhone.startsWith('+')) {
      console.log('🔄 Trying with +91');
      user = await User.findOne({ phone: '+91' + userPhone });
    }

    if (!user) {
      console.error('❌ User not found');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('✅ User found:', {
      name: user.name,
      phone: user.phone
    });

    // =======================
    // CREDIT CHECK
    // =======================
    const cashCredits = user.cashCredits || 0;
    const extraCredits = user.extraCredits || 0;
    const totalCredits = cashCredits + extraCredits;

    console.log('💰 Credit snapshot (before):', {
      cash: cashCredits,
      extra: extraCredits,
      total: totalCredits,
      required: AD_COST
    });

    if (totalCredits < AD_COST) {
      console.warn('❌ Insufficient credits');
      return res.status(400).json({
        success: false,
        message: 'Insufficient credits',
        required: AD_COST,
        available: totalCredits
      });
    }

    // =======================
    // DUAL CREDIT DEDUCTION
    // =======================
    let remaining = AD_COST;
    let deductedFromCash = 0;
    let deductedFromExtra = 0;

    if (cashCredits > 0) {
      deductedFromCash = Math.min(cashCredits, remaining);
      remaining -= deductedFromCash;
    }

    if (remaining > 0 && extraCredits > 0) {
      deductedFromExtra = Math.min(extraCredits, remaining);
    }

    console.log('🧮 Deduction calculation:', {
      deductedFromCash,
      deductedFromExtra
    });

    // Apply deduction
    user.cashCredits -= deductedFromCash;
    user.extraCredits -= deductedFromExtra;
    user.credits = user.cashCredits + user.extraCredits;

    if (deductedFromCash > 0) {
      user.cashHistory.push({
        type: 'debit',
        amount: deductedFromCash,
        balance: user.cashCredits,
        description: `Ad creation: ${title}`,
        date: new Date()
      });
    }

    if (deductedFromExtra > 0) {
      user.extraHistory.push({
        type: 'debit',
        amount: deductedFromExtra,
        balance: user.extraCredits,
        description: `Ad creation: ${title}`,
        date: new Date()
      });
    }

    user.creditsHistory.push({
      type: 'deduction',
      amount: AD_COST,
      description: `Ad creation (Cash ${deductedFromCash}, Extra ${deductedFromExtra})`,
      date: new Date()
    });

    await user.save();

    console.log('💾 Credits saved (after):', {
      cash: user.cashCredits,
      extra: user.extraCredits,
      total: user.credits
    });

    // =======================
    // FORWARD TO MAIN BACKEND
    // =======================
    console.log('📡 Forwarding ad to main backend');

    const FormData = require('form-data');
    const fetch = require('node-fetch');

    const formData = new FormData();
    formData.append('title', title);
    formData.append('phoneNumber', phoneNumber);
    formData.append('startDate', startDate);
    formData.append('endDate', endDate);
    formData.append('uploaderName', uploaderName || user.name);
    formData.append('uploaderPhone', user.phone);
    formData.append('bottomMediaType', bottomMediaType);
    formData.append('fullscreenMediaType', fullscreenMediaType);

    files.forEach(file => {
      formData.append(file.fieldname, file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype
      });
    });

    const APP_BACKEND_URL = process.env.APP_BACKEND_URL || process.env.MAIN_BACKEND_URL || 'https://api.instantllycards.com';
    let response;
    try {
      response = await fetch(`${APP_BACKEND_URL}/api/channel-partner/ads`, {
        method: 'POST',
        body: formData
      });
    } catch (fetchErr) {
      console.error('❌ Failed to forward ad to main backend:', fetchErr.message || fetchErr);

      // Refund credits because ad couldn't be forwarded
      user.cashCredits += deductedFromCash;
      user.extraCredits += deductedFromExtra;
      user.credits = user.cashCredits + user.extraCredits;

      if (deductedFromCash > 0) {
        user.cashHistory.push({
          type: 'credit',
          amount: deductedFromCash,
          balance: user.cashCredits,
          description: 'Refund: Ad creation failed (network)',
          date: new Date()
        });
      }

      if (deductedFromExtra > 0) {
        user.extraHistory.push({
          type: 'credit',
          amount: deductedFromExtra,
          balance: user.extraCredits,
          description: 'Refund: Ad creation failed (network)',
          date: new Date()
        });
      }

      await user.save();

      return res.status(502).json({
        success: false,
        message: 'Failed to reach main ads backend. Credits have been refunded.',
        error: fetchErr.message || String(fetchErr)
      });
    }

    console.log('📨 Main backend response:', response.status);

    let responseData;
    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }

    // =======================
    // REFUND ON FAILURE
    // =======================
    if (!response.ok) {
      console.error('❌ Main backend failed, refunding credits');

      user.cashCredits += deductedFromCash;
      user.extraCredits += deductedFromExtra;
      user.credits = user.cashCredits + user.extraCredits;

      if (deductedFromCash > 0) {
        user.cashHistory.push({
          type: 'credit',
          amount: deductedFromCash,
          balance: user.cashCredits,
          description: 'Refund: Ad creation failed',
          date: new Date()
        });
      }

      if (deductedFromExtra > 0) {
        user.extraHistory.push({
          type: 'credit',
          amount: deductedFromExtra,
          balance: user.extraCredits,
          description: 'Refund: Ad creation failed',
          date: new Date()
        });
      }

      await user.save();

      console.log('💸 Refund completed');

      return res.status(response.status || 500).json({
        success: false,
        message: 'Ad creation failed. Credits refunded.',
        mainBackendStatus: response.status,
        mainBackendError: responseData || null
      });
    }

    // =======================
    // SUCCESS RESPONSE
    // =======================
    console.log('✅ Ad created successfully');

    // -----------------------
    // Commission distribution
    // -----------------------
    // TWO-TIER COMMISSION SYSTEM:
    // 1. If ONLY cash credits used (no extra): Self gets 20%, parents get their shares
    // 2. If extra credits used: Self gets 0%, parents get their shares (skip self)
    if (deductedFromCash > 0) {
      (async () => {
        try {
          const uploader = user; // user who created the ad
          const adId = responseData?.ad?._id || responseData?.ad?.id || null;
          const Application = require('../models/Application');
          const CommissionDistribution = require('../models/CommissionDistribution');

          // Commission shares (percent of ad amount) by position
          // Self gets 20%, then parent positions get percentages in sequence
          const levelShares = [
            { levelName: 'pincode', percent: 20, label: 'Pincode' },
            { levelName: 'tehsil', percent: 10, label: 'Tehsil' },
            { levelName: 'district', percent: 5, label: 'District' },
            { levelName: 'division', percent: 2.5, label: 'Division' },
            { levelName: 'state', percent: 1.25, label: 'State' },
            { levelName: 'zone', percent: 0.6, label: 'Zone' },
            { levelName: 'country', percent: 0.3, label: 'India' }
          ];
          
          // Parent commission percentages (used when positions are filled)
          // First filled parent gets 10%, second gets 5%, third gets 2.5%, etc.
          const parentPercentages = [10, 5, 2.5, 1.25, 0.6, 0.3];

          // Determine if self gets commission (only when paid fully in cash)
          const selfGetsCommission = (deductedFromExtra === 0);
          
          if (selfGetsCommission) {
            // Credit uploader with 'self' share when paid fully in cash
            const selfShare = levelShares[0];
            const selfAmt = Number((AD_COST * (selfShare.percent / 100)).toFixed(2));
            
            // Get uploader's position info
            const uploaderApp = await Application.findOne({
              'applicantInfo.phone': uploader.phone,
              status: 'approved'
            }).lean();
            
            const uploaderLocation = uploaderApp?.applicantInfo?.pincode || 'N/A';
            const uploaderPosition = uploaderApp?.position?.level || 'Pincode';
            
            // CREDIT AS CASH CREDITS (since paid with cash)
            uploader.cashCredits = (uploader.cashCredits || 0) + selfAmt;
            uploader.credits = (uploader.cashCredits || 0) + (uploader.extraCredits || 0);
            uploader.cashHistory = uploader.cashHistory || [];
            uploader.cashHistory.push({
              type: 'credit',
              amount: selfAmt,
              balance: uploader.cashCredits,
              description: `Commission (Self) from ad - ${selfShare.percent}% of ₹${AD_COST}`,
              date: new Date()
            });
            
            // Also track in commission history for reporting
            uploader.commissionBalance = (uploader.commissionBalance || 0) + selfAmt;
            uploader.commissionHistory = uploader.commissionHistory || [];
            uploader.commissionHistory.push({
              type: 'credit',
              amount: selfAmt,
              balance: uploader.commissionBalance,
              description: `Commission (Self) from ad\nLevel: ${selfShare.label}\nLocation: ${uploaderLocation}`,
              fromAdId: adId,
              level: selfShare.label,
              positionLevel: uploaderPosition,
              positionLocation: uploaderLocation,
              percent: selfShare.percent,
              date: new Date()
            });
            
            await uploader.save();
            console.log(`✅ [COMMISSION] Self: ₹${selfAmt} added to CASH CREDITS for ${uploader.name || uploader.phone}`);
          } else {
            console.log(`ℹ️ [COMMISSION] Self commission skipped (extra credits used: ₹${deductedFromExtra})`);
          }

          // Find uploader's approved application to determine hierarchy
          const uploaderApp = await Application.findOne({
            'applicantInfo.phone': uploader.phone,
            status: 'approved'
          }).lean();

          if (!uploaderApp) {
            console.warn('⚠️ Cannot distribute commissions: uploader has no approved application');
            return;
          }

          // Extract location hierarchy from uploader's application
          const hierarchy = {
            pincode: uploaderApp.applicantInfo?.pincode,
            tehsil: uploaderApp.applicantInfo?.tehsil,
            district: uploaderApp.applicantInfo?.district,
            division: uploaderApp.applicantInfo?.division,
            state: uploaderApp.applicantInfo?.state,
            zone: uploaderApp.applicantInfo?.zone,
            country: uploaderApp.applicantInfo?.country || 'India'
          };

          console.log('📍 [COMMISSION] Uploader hierarchy:', hierarchy);

          // Helper: find approved application holder for a level - NO REALLOCATION
          // Only returns if the exact position is filled, otherwise returns null
          const findLevelHolder = async (levelName, excludePhone = null) => {
            // First try: search by positionId patterns (must contain level-head)
            let query = { status: 'approved' };
            if (excludePhone) {
              query['applicantInfo.phone'] = { $ne: excludePhone }; // exclude uploader
            }
            
            const token = hierarchy[levelName];
            if (token && levelName !== 'country') {
              const flexToken = String(token).trim().toLowerCase().replace(/[^a-z0-9]+/g, '[-_\\s]*');
              const levelFlex = levelName.replace(/\s+/g, '[-_\\s]*');
              // MUST contain both: level-head AND location token
              query.positionId = { $regex: new RegExp(`${levelFlex}[-_\\s]*head.*${flexToken}`, 'i') };
            } else if (levelName === 'country') {
              query.positionId = { $regex: /president|india[-_\s]*head/i };
            }

            let app = await Application.findOne(query).lean();
            if (app) return { app, paidLevel: levelName };

            // NO FALLBACK to location fields - position must be explicitly in positionId
            // NO REALLOCATION - if position is empty, return null
            console.log(`ℹ️ [COMMISSION] Position ${levelName} is empty - will be skipped`);
            return null;
          };

          // For parent levels, find holder and credit with SEQUENTIAL PERCENTAGES
          // Start from index 1 (tehsil) regardless of whether self got commission
          // NEW LOGIC: First filled parent gets 10%, second gets 5%, third gets 2.5%, etc.
          
          const filledParents = []; // Store filled parent positions in order
          
          // First pass: Find all filled parent positions
          for (let i = 1; i < levelShares.length; i++) {
            const level = levelShares[i];
            try {
              const result = await findLevelHolder(level.levelName, uploader.phone);
              if (result && result.app) {
                const recipient = await User.findById(result.app.userId);
                if (recipient) {
                  filledParents.push({
                    level: level,
                    recipient: recipient,
                    originalLevel: level.label,
                    reallocatedFrom: result.reallocatedFrom
                  });
                  console.log(`✅ [COMMISSION] Found filled position #${filledParents.length}: ${level.label} - ${recipient.name || recipient.phone}`);
                } else {
                  console.log(`⚠️ [COMMISSION] User not found for ${level.label} holder`);
                }
              } else {
                console.log(`ℹ️ [COMMISSION] Empty position: ${level.label}`);
              }
            } catch (innerErr) {
              console.error(`❌ [COMMISSION] Failed for ${level.label}:`, innerErr.message);
            }
          }
          
          // Second pass: Assign sequential percentages to filled parents
          console.log(`\n💰 [COMMISSION] Distributing to ${filledParents.length} filled parent position(s):\n`);
          
          // Get uploader's position info for display
          const uploaderPosition = uploaderApp.position?.level || 'Pincode';
          const uploaderLocation = hierarchy.pincode || uploaderApp.applicantInfo?.village || 'N/A';
          
          for (let i = 0; i < filledParents.length; i++) {
            try {
              const parent = filledParents[i];
              const percent = parentPercentages[i] || 0; // Get sequential percentage
              const amt = Number((AD_COST * (percent / 100)).toFixed(2));
              
              if (amt > 0) {
                // CREDIT AS CASH CREDITS (if paid with cash) or EXTRA CREDITS (if paid with extra)
                // Since commission only distributes when cash credits are used, always credit as cash
                parent.recipient.cashCredits = (parent.recipient.cashCredits || 0) + amt;
                parent.recipient.credits = (parent.recipient.cashCredits || 0) + (parent.recipient.extraCredits || 0);
                parent.recipient.cashHistory = parent.recipient.cashHistory || [];
                parent.recipient.cashHistory.push({
                  type: 'credit',
                  amount: amt,
                  balance: parent.recipient.cashCredits,
                  description: `Commission ${percent}% from ${uploader.name || uploader.phone}'s ad`,
                  date: new Date()
                });
                
                // Also track in commission history for reporting
                parent.recipient.commissionBalance = (parent.recipient.commissionBalance || 0) + amt;
                parent.recipient.commissionHistory = parent.recipient.commissionHistory || [];
                parent.recipient.commissionHistory.push({
                  type: 'credit',
                  amount: amt,
                  balance: parent.recipient.commissionBalance,
                  description: `Commission from ad by ${uploader.name || uploader.phone} (${uploaderPosition})\nUploader Position: ${uploaderPosition}\nUploader Location: ${uploaderLocation}`,
                  fromAdId: adId,
                  level: `Parent ${i + 1}`,
                  positionLevel: uploaderPosition,
                  positionLocation: uploaderLocation,
                  uploaderName: uploader.name || uploader.phone,
                  percent: percent,
                  date: new Date()
                });
                
                await parent.recipient.save();
                
                console.log(`✅ [COMMISSION] Parent #${i + 1}: ${parent.recipient.name || parent.recipient.phone} (${parent.originalLevel}) → ${percent}% = ₹${amt} added to CASH CREDITS`);
              }
            } catch (saveErr) {
              console.error(`❌ [COMMISSION] Failed to save commission:`, saveErr.message);
            }
          }
          console.log('💸 Commission distribution completed for ad');
          
          // ==========================================
          // CREATE COMMISSION PATH RECORD
          // ==========================================
          // Store the complete hierarchy path for transparency
          // This shows which positions received commission and which were empty/skipped
          try {
            const hierarchyPathArray = [];
            let totalDistributed = 0;
            let filledCount = 0;
            let emptyCount = 0;
            
            // Add self to path
            const selfAmt = selfGetsCommission ? Number((AD_COST * 0.2).toFixed(2)) : 0;
            if (selfGetsCommission) {
              totalDistributed += selfAmt;
              filledCount++;
            }
            hierarchyPathArray.push({
              level: levelShares[0].levelName,
              location: hierarchy[levelShares[0].levelName] || uploaderApp.positionId?.split('_')[levelShares[0].levelName === 'pincode' ? 7 : 0] || 'Unknown',
              holder: uploader.name,
              holderPhone: uploader.phone,
              holderId: uploader._id,
              status: 'self',
              commission: selfAmt,
              percent: selfGetsCommission ? 20 : 0,
              sequentialPosition: null
            });
            
            // Build complete path array showing filled and empty positions
            let parentIndex = 0;
            for (let i = 1; i < levelShares.length; i++) {
              const level = levelShares[i];
              const location = hierarchy[level.levelName] || level.label;
              
              // Check if this position was filled (in filledParents array)
              const filledParent = filledParents.find(p => p.level.levelName === level.levelName);
              
              if (filledParent) {
                const percent = parentPercentages[parentIndex] || 0;
                const amt = Number((AD_COST * (percent / 100)).toFixed(2));
                totalDistributed += amt;
                filledCount++;
                
                hierarchyPathArray.push({
                  level: level.levelName,
                  location: location,
                  holder: filledParent.recipient.name,
                  holderPhone: filledParent.recipient.phone,
                  holderId: filledParent.recipient._id,
                  status: 'filled',
                  commission: amt,
                  percent: percent,
                  sequentialPosition: parentIndex + 1
                });
                
                parentIndex++;
              } else {
                // Position is empty - add to path but with 0 commission
                emptyCount++;
                hierarchyPathArray.push({
                  level: level.levelName,
                  location: location,
                  holder: null,
                  holderPhone: null,
                  holderId: null,
                  status: 'empty',
                  commission: 0,
                  percent: 0,
                  sequentialPosition: null
                });
              }
            }
            
            // Create CommissionDistribution record
            const distributionRecord = new CommissionDistribution({
              adId: adId,
              creatorId: uploader._id,
              creatorPhone: uploader.phone,
              creatorName: uploader.name,
              adAmount: AD_COST,
              distributionDate: new Date(),
              selfCommission: {
                paid: selfGetsCommission,
                amount: selfAmt,
                percent: selfGetsCommission ? 20 : 0
              },
              hierarchyPath: hierarchyPathArray,
              totalDistributed: totalDistributed,
              filledPositions: filledCount,
              emptyPositions: emptyCount,
              creditBreakdown: {
                cash: deductedFromCash,
                extra: deductedFromExtra
              }
            });
            
            await distributionRecord.save();
            console.log(`✅ [COMMISSION PATH] Saved distribution record with ${filledCount} filled and ${emptyCount} empty positions`);
            
          } catch (pathErr) {
            console.error('❌ [COMMISSION PATH] Failed to save distribution record:', pathErr.message);
          }
          // ==========================================
          
        } catch (err) {
          console.error('❌ Commission distribution error:', err);
        }
      })();
    } else {
      console.log('ℹ️ Commission skipped because no cash credits were used');
    }

    return res.status(201).json({
      success: true,
      message: 'Ad submitted successfully',
      creditsDeducted: AD_COST,
      deductionBreakdown: {
        cash: deductedFromCash,
        extra: deductedFromExtra
      },
      remainingCredits: {
        total: user.credits,
        cash: user.cashCredits,
        extra: user.extraCredits
      },
      ad: responseData?.ad || responseData
    });

  } catch (error) {
    console.error('💥 Ad creation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});


/**
 * GET /api/ads/image/:id/:type
 * Proxy endpoint to fetch ad images from Instantlly Cards backend
 * This serves images for the admin panel
 */
router.get('/image/:id/:type', async (req, res) => {
  try {
    const fetch = require('node-fetch');
    const { id, type } = req.params;

    console.log(`🖼️  [IMAGE PROXY] Requesting - Ad: ${id}, Type: ${type}`);

    const APP_BACKEND_URL = process.env.APP_BACKEND_URL || process.env.MAIN_BACKEND_URL || 'https://api.instantllycards.com';
    const url = `${APP_BACKEND_URL}/api/ads/image/${id}/${type}`;

    console.log(`🔗 [IMAGE PROXY] Fetching from: ${url}`);

    const response = await fetch(url, {
      headers: {
        'Accept': 'image/*,*/*',
        'User-Agent': 'ChannelPartner/1.0'
      }
    });

    console.log(`📡 [IMAGE PROXY] Response status: ${response.status}`);

    if (response.ok) {
      // Get the content type from the response
      const contentType = response.headers.get('content-type');
      console.log(`📄 [IMAGE PROXY] Content-Type: ${contentType}`);

      // Set appropriate headers for image caching and CORS
      res.setHeader('Content-Type', contentType || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

      // Pipe the image data directly to the response
      response.body.pipe(res);

      console.log(`✅ [IMAGE PROXY] Served image ${id}/${type}`);
    } else {
      const errorText = await response.text();
      console.error(`❌ [IMAGE PROXY] Failed - Ad: ${id}, Type: ${type}`);
      console.error(`   Status: ${response.status}`);
      console.error(`   Error: ${errorText.substring(0, 200)}`);
      
      // Return a 404 with empty response instead of JSON
      res.status(404).send('Image not found');
    }
  } catch (error) {
    console.error('❌ [IMAGE PROXY] Error:', error.message);
    console.error('   Stack:', error.stack);
    res.status(500).send('Failed to load image');
  }
});

module.exports = router;
