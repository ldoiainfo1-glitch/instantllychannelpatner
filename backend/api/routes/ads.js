const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Position = require('../models/Position');
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

          // Commission shares (percent of ad amount) by position
          const levelShares = [
            { levelName: 'pincode', percent: 20, label: 'Pincode' },
            { levelName: 'tehsil', percent: 10, label: 'Tehsil' },
            { levelName: 'district', percent: 5, label: 'District' },
            { levelName: 'division', percent: 2.5, label: 'Division' },
            { levelName: 'state', percent: 1.25, label: 'State' },
            { levelName: 'zone', percent: 0.6, label: 'Zone' },
            { levelName: 'country', percent: 0.3, label: 'India' }
          ];

          // Determine if self gets commission (only when paid fully in cash)
          const selfGetsCommission = (deductedFromExtra === 0);
          
          if (selfGetsCommission) {
            // Credit uploader with 'self' share when paid fully in cash
            const selfShare = levelShares[0];
            const selfAmt = Number((AD_COST * (selfShare.percent / 100)).toFixed(2));
            uploader.commissionBalance = (uploader.commissionBalance || 0) + selfAmt;
            uploader.commissionHistory = uploader.commissionHistory || [];
            uploader.commissionHistory.push({
              type: 'credit',
              amount: selfAmt,
              balance: uploader.commissionBalance,
              description: `Commission (Self) from ad`,
              fromAdId: adId,
              level: selfShare.label,
              date: new Date()
            });
            await uploader.save();
            console.log(`✅ [COMMISSION] Self: ₹${selfAmt} to ${uploader.name || uploader.phone}`);
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

          // Helper: find approved application holder for a level with fallback and reallocation
          const findLevelHolder = async (levelName, excludePhone = null) => {
            const levelsOrder = ['pincode','tehsil','district','division','state','zone','country'];
            const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            // First try: search by positionId patterns (flexible regex)
            let query = { status: 'approved' };
            if (excludePhone) {
              query['applicantInfo.phone'] = { $ne: excludePhone }; // exclude uploader
            }
            
            const token = hierarchy[levelName];
            if (token && levelName !== 'country') {
              const flexToken = String(token).trim().toLowerCase().replace(/[^a-z0-9]+/g, '[-_\\s]*');
              const levelFlex = levelName.replace(/\s+/g, '[-_\\s]*');
              query.positionId = { $regex: new RegExp(`(${levelFlex}[-_\\s]*head.*${flexToken}|${flexToken}.*${levelFlex}[-_\\s]*head)`, 'i') };
            } else if (levelName === 'country') {
              query.positionId = { $regex: /president|india[-_\s]*head/i };
            }

            let app = await Application.findOne(query).lean();
            if (app) return { app, paidLevel: levelName };

            // Second try: fallback by applicantInfo location field
            if (token && levelName !== 'country') {
              const fallbackQuery = { status: 'approved' };
              if (excludePhone) {
                fallbackQuery['applicantInfo.phone'] = { $ne: excludePhone };
              }
              fallbackQuery[`applicantInfo.${levelName}`] = new RegExp(esc(token), 'i');
              app = await Application.findOne(fallbackQuery).sort({ approvedDate: -1 }).lean();
              if (app) {
                console.log(`ℹ️ [COMMISSION] Found ${levelName} holder by applicantInfo`);
                return { app, paidLevel: levelName };
              }
            }

            // Third try: reallocate to next available upper level
            console.log(`ℹ️ [COMMISSION] No ${levelName} holder found, trying upper levels...`);
            const startIdx = Math.max(0, levelsOrder.indexOf(levelName));
            for (let i = startIdx + 1; i < levelsOrder.length; i++) {
              const upperLevel = levelsOrder[i];
              const upperResult = await findLevelHolder(upperLevel, excludePhone);
              if (upperResult && upperResult.app) {
                console.log(`ℹ️ [COMMISSION] Reallocated ${levelName} -> ${upperLevel}`);
                return { app: upperResult.app, paidLevel: upperLevel, reallocatedFrom: levelName };
              }
            }

            return null;
          };

          // For parent levels, find holder and credit
          // Start from index 1 (tehsil) regardless of whether self got commission
          for (let i = 1; i < levelShares.length; i++) {
            const level = levelShares[i];
            try {
              const result = await findLevelHolder(level.levelName, uploader.phone);
              if (!result || !result.app) {
                console.log(`⚠️ [COMMISSION] No holder found for ${level.label} (and no upper-level fallback)`);
                continue;
              }

              const recipient = await User.findById(result.app.userId);
              if (!recipient) {
                console.log(`⚠️ [COMMISSION] User not found for ${level.label} holder`);
                continue;
              }

              const amt = Number((AD_COST * (level.percent / 100)).toFixed(2));
              recipient.commissionBalance = (recipient.commissionBalance || 0) + amt;
              recipient.commissionHistory = recipient.commissionHistory || [];
              recipient.commissionHistory.push({
                type: 'credit',
                amount: amt,
                balance: recipient.commissionBalance,
                description: `Commission (${level.label}) from ad by ${uploader.name || uploader.phone}${result.reallocatedFrom ? ` [reallocated from ${result.reallocatedFrom}]` : ''}`,
                fromAdId: adId,
                level: level.label,
                date: new Date()
              });
              await recipient.save();
              console.log(`✅ [COMMISSION] ${level.label}: ₹${amt} to ${recipient.name || recipient.phone} (requested: ${level.levelName}, paid: ${result.paidLevel})`);
            } catch (innerErr) {
              console.error(`❌ [COMMISSION] Failed for ${level.label}:`, innerErr.message);
            }
          }
          console.log('💸 Commission distribution completed for ad');
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

    console.log(`🖼️  Proxying image request - Ad: ${id}, Type: ${type}`);

    const APP_BACKEND_URL = process.env.APP_BACKEND_URL || process.env.MAIN_BACKEND_URL || 'https://api.instantllycards.com';
    const url = `${APP_BACKEND_URL}/api/ads/image/${id}/${type}`;

    const response = await fetch(url);

    if (response.ok) {
      // Get the content type from the response
      const contentType = response.headers.get('content-type');

      // Set appropriate headers for image caching
      res.setHeader('Content-Type', contentType || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

      // Pipe the image data directly to the response
      response.body.pipe(res);

      console.log(`✅ Served image ${id}/${type}`);
    } else {
      console.error(`❌ Image not found: ${id}/${type} - Status: ${response.status}`);
      // Return a 404 with empty response instead of JSON
      res.status(404).send('Image not found');
    }
  } catch (error) {
    console.error('❌ Image proxy error:', error);
    res.status(500).send('Failed to load image');
  }
});

module.exports = router;
