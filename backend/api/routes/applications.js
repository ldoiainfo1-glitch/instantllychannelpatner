const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Application = require('../models/Application');
const Position = require('../models/Position');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Ensure uploads directory exists
const fs = require('fs');
const uploadsDir = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const prefix = file.fieldname === 'paymentScreenshot' ? 'payment-' : 'photo-';
    const filename = prefix + uniqueSuffix + path.extname(file.originalname);
    cb(null, filename);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Check if phone number already exists
router.get('/check-phone/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    
    console.log('🔍 Checking phone uniqueness:', phone);
    
    // Check in Application collection
    const existingApplication = await Application.findOne({ 
      'applicantInfo.phone': phone 
    });
    
    // Also check in User collection
    const User = require('../models/User');
    const existingUser = await User.findOne({ phone: phone });
    
    const exists = !!(existingApplication || existingUser);
    
    console.log(`📱 Phone ${phone} exists: ${exists}`);
    
    res.json({ 
      exists: exists,
      message: exists ? 'Phone number already registered' : 'Phone number available'
    });
    
  } catch (error) {
    console.error('❌ Error checking phone:', error);
    res.status(500).json({ error: 'Error checking phone number' });
  }
});

// Apply for a position - Store in applications collection
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const { 
      positionId, 
      name, 
      phone,
      email, 
      address, 
      introducedBy, 
      companyName, 
      businessName,
      // Location fields
      country,
      zone,
      state,
      division,
      district,
      tehsil,
      pincode,
      positionPincode,
      village
    } = req.body;
    
    console.log('📝 New application received:', { positionId, name, phone, companyName, businessName });
    
    // Validate position ID format and required fields
    if (!positionId || Array.isArray(positionId)) {
      console.error('❌ Invalid positionId received:', positionId, 'Type:', typeof positionId);
      return res.status(400).json({ error: 'Invalid position ID format' });
    }
    
    // Only name and phone are required
    if (!name || !phone) {
      return res.status(400).json({ error: 'Missing required fields: name and phone' });
    }
    
    console.log('✅ Position ID validation passed:', positionId);
    
    // Photo is now optional
    let photoBase64 = null;
    if (req.file) {
      console.log('📸 Photo uploaded:', req.file.filename);

      // Convert photo to base64 for MongoDB storage
      const fs = require('fs');
      const photoPath = path.join(uploadsDir, req.file.filename);
      const photoBuffer = fs.readFileSync(photoPath);
      photoBase64 = `data:${req.file.mimetype};base64,${photoBuffer.toString('base64')}`;
      
      // Delete the file from server after converting to base64
      fs.unlinkSync(photoPath);
      console.log('✅ Photo converted to base64 and file deleted from server');
    } else {
      console.log('ℹ️ No photo uploaded - using default placeholder');
      // Use a default user icon as base64
      photoBase64 = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9IiNlMmU4ZjAiLz4KPHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1zbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSIxNiIgeT0iMTYiPgo8cGF0aCBkPSJNMjQgMjRDMjguNDE4MyAyNCAzMiAyMC40MTgzIDMyIDE2QzMyIDExLjU4MTcgMjguNDE4MyA4IDI0IDhDMTkuNTgxNyA4IDE2IDExLjU4MTcgMTYgMTZDMTYgMjAuNDE4MyAxOS41ODE3IDI0IDI0IDIwWiIgZmlsbD0iIzYzNjM3NiIvPgo8cGF0aCBkPSJNMjQgMjhDMTguNjcgMjggMTQgMzIuNjcgMTQgMzhWNDBIMzRWMzhDMzQgMzIuNjcgMjkuMzMgMjggMjQgMjhaIiBmaWxsPSIjNjM2Mzc2Ii8+Cjwvc3ZnPgo8L3N2Zz4=';
    }

    // Create a new ObjectId for this application (no need for positions collection)
    const newApplicationId = new mongoose.Types.ObjectId();
    console.log('🆔 Generated new application ID:', newApplicationId);
    
    // For now, we'll use the positionId as a reference, but we don't need to validate it exists
    // The application is self-contained with all necessary information
    
    // Check if this phone number is already registered (check both applications and users)
    const User = require('../models/User');
    
    // Check if user with this phone already exists
    const existingUser = await User.findOne({ phone: phone.trim() });
    if (existingUser) {
      return res.status(400).json({ 
        error: 'This phone number is already registered. Please login or use a different phone number.' 
      });
    }
    
    // Check if this user has already applied (by phone number)
    const existingApplication = await Application.findOne({ 
      'applicantInfo.phone': phone.trim(),
      status: { $in: ['pending', 'approved'] }
    });
    
    if (existingApplication) {
      return res.status(400).json({ error: 'You have already submitted an application. Please wait for admin review.' });
    }

    // Email is optional - don't auto-generate
    // Users can provide their own email or leave it empty
    
    // Generate unique 6-digit person code immediately
    const generatePersonCode = () => {
      // Generate 6-digit random number (100000-999999)
      return Math.floor(100000 + Math.random() * 900000).toString();
    };
    
    let personCode = generatePersonCode();
    
    // Ensure uniqueness by checking against existing applications and users
    // (User model already imported above)
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!isUnique && attempts < maxAttempts) {
      const existingUser = await User.findOne({ personCode: personCode });
      const existingApp = await Application.findOne({ personCode: personCode });
      
      if (!existingUser && !existingApp) {
        isUnique = true;
      } else {
        personCode = generatePersonCode();
        attempts++;
      }
    }
    
    console.log('🎫 Generated unique person code:', personCode);

    // Create new application in applications collection
    const newApplication = new Application({
      positionId: positionId, // Use the position ID passed from frontend
      personCode: personCode, // Store person code in application
      applicantInfo: {
        name: name.trim(),
        phone: phone.trim(),
        email: email ? email.trim() : '', // Email is optional - empty string if not provided
        photo: photoBase64,
        address: address ? address.trim() : '',
        companyName: companyName ? companyName.trim() : '',
        businessName: businessName ? businessName.trim() : ''
      },
      location: {
        country: country || 'India',
        zone: zone || null,
        state: state || null,
        division: division || null,
        district: district || null,
        tehsil: tehsil || null,
        pincode: positionPincode || null,
        village: village || null
      },
      introducedBy: introducedBy ? introducedBy.trim() : 'Self',
      status: 'pending',
      appliedDate: new Date()
    });
    
    const savedApplication = await newApplication.save();
    console.log('✅ Application saved to applications collection:', savedApplication._id);

    res.status(201).json({
      message: 'Application submitted successfully! Your application is now pending review.',
      applicationId: savedApplication._id,
      application: savedApplication
    });
  } catch (error) {
    console.error('❌ Error submitting application:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to submit application',
      details: error.toString()
    });
  }
});

// Get all applications directly (no position dependency)
router.get('/', async (req, res) => {
  try {
    const { 
      status, 
      country, 
      zone, 
      state, 
      division, 
      district, 
      tehsil, 
      pincode, 
      village,
      introducedBy 
    } = req.query;
    
    console.log('📋 Loading applications with filters:', { status, country, zone, state, division, district, tehsil, pincode, village, introducedBy });
    
    // Build application filter
    let applicationFilter = {};
    if (status) applicationFilter.status = status;
    if (introducedBy) applicationFilter.introducedBy = introducedBy;
    
    // Get all applications from applications collection (no position population needed)
    const applications = await Application.find(applicationFilter)
      .lean()
      .limit(500)
      .sort({ appliedDate: -1 });
    
    console.log(`📊 Found ${applications.length} applications in database`);

    
    // Since applications don't have location data, we'll return all applications
    // In a real system, you'd add location fields to the Application model
    let filteredApplications = applications;
    
    // For now, we'll just filter by status and show all applications
    // Location filtering can be added later by storing location in application itself
    
    // Format applications for frontend (no position dependency)
    const formattedApplications = filteredApplications.map(app => ({
      _id: app._id,
      applicationId: app._id,
      positionId: app.positionId,
      positionTitle: `${app.applicantInfo.companyName} Channel Partner`, // Generate title from application
      positionPost: 'Committee',
      location: app.location && Object.keys(app.location).length > 0 ? app.location : { 
        country: 'India',
        // For applications without location data, default to basic location
      },
      applicantInfo: app.applicantInfo,
      introducedBy: app.introducedBy,
      status: app.status,
      appliedDate: app.appliedDate,
      approvedDate: app.approvedDate,
      paymentStatus: app.paymentStatus,
      paymentAmount: app.paymentAmount,
      paymentDate: app.paymentDate,
      adminNotes: app.adminNotes,
      contribution: 10000,
      credits: 60000
    }));
    
    console.log(`📊 Returning ${formattedApplications.length} formatted applications`);
    res.json(formattedApplications);
  } catch (error) {
    console.error('❌ Error fetching applications:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's own applications (requires authentication)
// MUST be before /:id route to avoid matching /me as an ID
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const User = require('../models/User');
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find all applications by this user's phone number
    const applications = await Application.find({ 
      'applicantInfo.phone': user.phone 
    }).sort({ appliedDate: -1 });

    console.log(`✅ Found ${applications.length} applications for user ${user.phone}`);
    res.json(applications);
  } catch (error) {
    console.error('Applications fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get application by ID
router.get('/:id', async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('positionId');
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    res.json(application);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update application status (Admin only)
router.put('/:id/status', async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    application.status = status;
    if (adminNotes) application.adminNotes = adminNotes;
    
    if (status === 'approved') {
      application.approvedDate = new Date();
      
      // Create user account
      const User = require('../models/User');
      
      // Check if user already exists
      const existingUser = await User.findOne({ phone: application.applicantInfo.phone });
      if (existingUser) {
        console.log('⚠️ User already exists for this phone number:', application.applicantInfo.phone);
        // Link existing user to application
        application.userId = existingUser._id;
      } else {
        // Use the person code from application (already generated when application was submitted)
        const personCode = application.personCode;
        
        // Generate password: First 4 letters of name in CAPITAL
        const nameForPassword = application.applicantInfo.name.replace(/\s+/g, ''); // Remove spaces
        const defaultPassword = nameForPassword.substring(0, 4).toUpperCase().padEnd(4, 'X'); // Ensure at least 4 chars
        
        console.log('🔐 Creating user account with credentials:', {
          loginId: application.applicantInfo.phone,
          password: defaultPassword,
          personCode: personCode
        });
        
        const newUser = new User({
          name: application.applicantInfo.name,
          phone: application.applicantInfo.phone,
          email: application.applicantInfo.email,
          pincode: application.applicantInfo.pincode,
          personCode: personCode,
          loginId: application.applicantInfo.phone, // Login ID is phone number
          password: defaultPassword, // First 4 letters of name in CAPITAL
          photo: application.applicantInfo.photo,
          introducedBy: application.introducedBy,
          positionId: application.positionId,
          appliedDate: application.appliedDate,
          approvedDate: new Date(),
          paymentStatus: 'pending',
          paymentAmount: 10000,
          isVerified: false,
          isFirstLogin: true
        });
        
        await newUser.save();
        
        // Link user to application
        application.userId = newUser._id;
        
        console.log('✅ User account created successfully:', {
          userId: newUser._id,
          personCode: personCode,
          loginId: application.applicantInfo.phone,
          defaultPassword: defaultPassword,
          passwordLength: defaultPassword.length
        });
      }
      
      // Update introduced count and credits for introducer
      console.log(`🔍 REFERRAL CHECK: introducedBy = "${application.introducedBy}"`);
      if (application.introducedBy && application.introducedBy !== 'Self') {
        console.log(`🔍 Looking for introducer with phone: ${application.introducedBy}`);
        // Find introducer by phone number (introducedBy contains phone number, not personCode)
        const introducer = await User.findOne({ phone: application.introducedBy });
        if (introducer) {
          const oldCount = introducer.introducedCount || 0;
          // Increment introduced count (always, no limit)
          introducer.introducedCount = oldCount + 1;
          console.log(`🎯 INCREMENTING introducedCount: ${introducer.name} (${introducer.phone}) ${oldCount} → ${introducer.introducedCount}`);
          
          // Add 100 credits only for first 20 referrals
          const maxPaidReferrals = 20;
          const creditsPerReferral = 100;
          
          if (introducer.introducedCount <= maxPaidReferrals) {
            introducer.credits = (introducer.credits || 0) + creditsPerReferral;
            console.log(`✅ Introducer ${introducer.name} (${introducer.phone}) earned ${creditsPerReferral} credits (${introducer.introducedCount}/${maxPaidReferrals})`);
          } else {
            console.log(`✅ Introducer ${introducer.name} (${introducer.phone}) count increased (${introducer.introducedCount}) - max credits reached`);
          }
          
          await introducer.save();
          console.log(`✅ SAVED introducer ${introducer.name} with introducedCount: ${introducer.introducedCount}`);
        } else {
          console.log(`⚠️ Introducer not found with phone: ${application.introducedBy}`);
        }
      } else {
        console.log(`⏭️ No referral to process (introducedBy = "${application.introducedBy}")`);
      }
    }

    await application.save();
    
    res.json({
      message: 'Application status updated successfully',
      application
    });
  } catch (error) {
    console.error('❌ Error updating application status:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update payment status
router.put('/:id/payment', async (req, res) => {
  try {
    const { paymentStatus, paymentAmount } = req.body;
    const application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    application.paymentStatus = paymentStatus;
    if (paymentAmount) application.paymentAmount = paymentAmount;
    if (paymentStatus === 'paid') application.paymentDate = new Date();

    await application.save();
    
    res.json({
      message: 'Payment status updated successfully',
      application
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Submit application with payment (updated for manual payment with screenshot)
router.post('/with-payment', upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'paymentScreenshot', maxCount: 1 }
]), async (req, res) => {
  try {
    const { 
      positionId, 
      name, 
      phone,
      email, 
      address, 
      introducedBy, 
      companyName, 
      businessName,
      country,
      zone,
      state,
      division,
      district,
      tehsil,
      pincode,
      positionPincode,
      village,
      paymentAmount,
      paymentProfit,
      paymentCredit,
      paymentStatus
    } = req.body;
    
    console.log('📝 Application with payment received:', { 
      positionId, 
      name, 
      phone,
      pincode,
      pincodeType: typeof pincode,
      pincodeLength: pincode ? pincode.length : 0,
      paymentAmount,
      hasPaymentScreenshot: !!(req.files && req.files.paymentScreenshot)
    });
    
    // Validate required fields
    if (!positionId || !name || !phone || !pincode || !paymentAmount) {
      console.error('❌ Missing required fields:', { positionId: !!positionId, name: !!name, phone: !!phone, pincode: !!pincode, paymentAmount: !!paymentAmount });
      return res.status(400).json({ error: 'Missing required fields (name, phone, pincode, paymentAmount)' });
    }
    
    // Clean pincode - remove any whitespace
    const cleanPincode = pincode.toString().trim();
    
    // Validate pincode format
    if (!/^\d{6}$/.test(cleanPincode)) {
      console.error('❌ Invalid pincode format:', { 
        original: pincode, 
        cleaned: cleanPincode, 
        length: cleanPincode.length,
        containsOnlyDigits: /^\d+$/.test(cleanPincode)
      });
      return res.status(400).json({ 
        error: 'Pincode must be exactly 6 digits', 
        details: { received: cleanPincode, length: cleanPincode.length } 
      });
    }
    
    console.log('✅ Pincode validated:', cleanPincode);
    
    // Payment screenshot is now optional
    const hasScreenshot = !!(req.files && req.files.paymentScreenshot && req.files.paymentScreenshot[0]);
    if (hasScreenshot) {
      console.log('✅ Payment screenshot uploaded');
    } else {
      console.log('ℹ️  No payment screenshot provided (optional)');
    }
    
    // Handle photo upload (applicant photo)
    let photoBase64 = null;
    if (req.files && req.files.photo && req.files.photo[0]) {
      console.log('📸 Applicant photo uploaded:', req.files.photo[0].filename);
      const photoPath = path.join(uploadsDir, req.files.photo[0].filename);
      const photoBuffer = fs.readFileSync(photoPath);
      photoBase64 = `data:${req.files.photo[0].mimetype};base64,${photoBuffer.toString('base64')}`;
      fs.unlinkSync(photoPath);
      console.log('✅ Photo converted to base64 and file deleted');
    } else {
      // Default placeholder
      photoBase64 = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9IiNlMmU4ZjAiLz4KPHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSIxNiIgeT0iMTYiPgo8cGF0aCBkPSJNMjQgMjRDMjguNDE4MyAyNCAzMiAyMC40MTgzIDMyIDE2QzMyIDExLjU4MTcgMjguNDE4MyA4IDI0IDhDMTkuNTgxNyA4IDE2IDExLjU4MTcgMTYgMTZDMTYgMjAuNDE4MyAxOS41ODE3IDI0IDI0IDI0WiIgZmlsbD0iIzYzNjM3NiIvPgo8cGF0aCBkPSJNMjQgMjhDMTguNjcgMjggMTQgMzIuNjcgMTQgMzhWNDBIMzRWMzhDMzQgMzIuNjcgMjkuMzMgMjggMjQgMjhaIiBmaWxsPSIjNjM2Mzc2Ii8+Cjwvc3ZnPgo8L3N2Zz4=';
    }
    
    // Handle payment screenshot upload (optional)
    let paymentScreenshotBase64 = null;
    if (req.files && req.files.paymentScreenshot && req.files.paymentScreenshot[0]) {
      const screenshotFile = req.files.paymentScreenshot[0];
      console.log('💳 Payment screenshot uploaded:', screenshotFile.filename);
      const screenshotPath = path.join(uploadsDir, screenshotFile.filename);
      const screenshotBuffer = fs.readFileSync(screenshotPath);
      paymentScreenshotBase64 = `data:${screenshotFile.mimetype};base64,${screenshotBuffer.toString('base64')}`;
      fs.unlinkSync(screenshotPath);
      console.log('✅ Payment screenshot converted to base64 and file deleted');
    } else {
      console.log('ℹ️  No payment screenshot to process');
    }
    
    // Generate unique person code
    const User = require('../models/User');
    function generatePersonCode() {
      return Math.floor(100000 + Math.random() * 900000).toString();
    }
    
    let personCode = generatePersonCode();
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!isUnique && attempts < maxAttempts) {
      const existingUser = await User.findOne({ personCode });
      const existingApp = await Application.findOne({ personCode });
      
      if (!existingUser && !existingApp) {
        isUnique = true;
      } else {
        personCode = generatePersonCode();
        attempts++;
      }
    }
    
    console.log('🎫 Generated unique person code:', personCode);

    // Create new application with manual payment info
    const newApplication = new Application({
      positionId: positionId,
      personCode: personCode,
      applicantInfo: {
        name: name.trim(),
        phone: phone.trim(),
        pincode: cleanPincode,
        email: email ? email.trim() : '',
        photo: photoBase64,
        address: address ? address.trim() : '',
        companyName: companyName ? companyName.trim() : '',
        businessName: businessName ? businessName.trim() : ''
      },
      location: {
        country: country || 'India',
        zone: zone || null,
        state: state || null,
        division: division || null,
        district: district || null,
        tehsil: tehsil || null,
        pincode: positionPincode || null,
        village: village || null
      },
      payment: {
        selectedTier: {
          pay: parseInt(paymentAmount),
          profit: parseInt(paymentProfit),
          credit: parseInt(paymentCredit)
        },
        paymentScreenshot: paymentScreenshotBase64,
        amount: parseInt(paymentAmount),
        status: paymentStatus || 'pending', // pending verification by admin
        paidAt: new Date()
      },
      introducedBy: introducedBy ? introducedBy.trim() : 'Self',
      status: 'pending', // Application pending admin approval and payment verification
      appliedDate: new Date(),
      creditsAllocated: false
    });
    
    const savedApplication = await newApplication.save();
    console.log('✅ Application with payment screenshot saved:', savedApplication._id);

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully! Your payment will be verified by admin.',
      applicationId: savedApplication._id,
      application: savedApplication
    });
  } catch (error) {
    console.error('❌ Error submitting application with payment:', error);
    res.status(500).json({ error: error.message || 'Failed to submit application' });
  }
});

module.exports = router;
