const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const Application = require('../models/Application');
const Position = require('../models/Position');

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
    const filename = 'photo-' + uniqueSuffix + path.extname(file.originalname);
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

// Apply for a position - Store in applications collection
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const { 
      positionId, 
      name, 
      phone, 
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
      village
    } = req.body;
    
    console.log('📝 New application received:', { positionId, name, phone, companyName, businessName });
    
    // Validate required fields
    if (!positionId || !name || !phone || !address || !companyName || !businessName) {
      return res.status(400).json({ error: 'Missing required fields: name, phone, companyName, businessName, address' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'Photo is required' });
    }

    console.log('📸 Photo uploaded:', req.file.filename);

    // Convert photo to base64 for MongoDB storage
    const fs = require('fs');
    const photoPath = path.join(uploadsDir, req.file.filename);
    const photoBuffer = fs.readFileSync(photoPath);
    const photoBase64 = `data:${req.file.mimetype};base64,${photoBuffer.toString('base64')}`;
    
    // Delete the file from server after converting to base64
    fs.unlinkSync(photoPath);
    console.log('✅ Photo converted to base64 and file deleted from server');

    // Create a new ObjectId for this application (no need for positions collection)
    const newApplicationId = new mongoose.Types.ObjectId();
    console.log('🆔 Generated new application ID:', newApplicationId);
    
    // For now, we'll use the positionId as a reference, but we don't need to validate it exists
    // The application is self-contained with all necessary information
    
    // Check if this user has already applied (by phone number)
    const existingApplication = await Application.findOne({ 
      'applicantInfo.phone': phone.trim(),
      status: { $in: ['pending', 'approved'] }
    });
    
    if (existingApplication) {
      return res.status(400).json({ error: 'You have already submitted an application. Please wait for admin review.' });
    }

    // Generate email from phone
    const email = `${phone}@instantlycards.com`;

    // Create new application in applications collection
    const newApplication = new Application({
      positionId: newApplicationId, // Use the new application ID as position reference
      applicantInfo: {
        name: name.trim(),
        phone: phone.trim(),
        email: email,
        photo: photoBase64,
        address: address.trim(),
        companyName: companyName.trim(),
        businessName: businessName.trim()
      },
      location: {
        country: country || 'India',
        zone: zone || null,
        state: state || null,
        division: division || null,
        district: district || null,
        tehsil: tehsil || null,
        pincode: pincode || null,
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
      village 
    } = req.query;
    
    console.log('📋 Loading applications with filters:', { status, country, zone, state, division, district, tehsil, pincode, village });
    
    // Build application filter
    let applicationFilter = {};
    if (status) applicationFilter.status = status;
    
    // Get all applications from applications collection (no position population needed)
    const applications = await Application.find(applicationFilter)
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
      location: { 
        country: 'India',
        state: 'Applied Location', // Could extract from address if needed
        // Add more location parsing from address if required
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
      
      // Generate person code (you can customize this logic)
      const personCode = `IC${Date.now().toString().slice(-8)}`;
      
      // Generate password: First 4 letters of name in CAPITAL
      const nameForPassword = application.applicantInfo.name.replace(/\s+/g, ''); // Remove spaces
      const defaultPassword = nameForPassword.substring(0, 4).toUpperCase().padEnd(4, 'X'); // Ensure at least 4 chars
      
      const newUser = new User({
        name: application.applicantInfo.name,
        phone: application.applicantInfo.phone,
        email: application.applicantInfo.email,
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
      
      console.log('✅ User account created:', {
        personCode,
        loginId: application.applicantInfo.phone,
        defaultPassword
      });
      
      // Update introduced count for introducer
      if (application.introducedBy && application.introducedBy !== 'Self') {
        await User.updateOne(
          { personCode: application.introducedBy },
          { $inc: { introducedCount: 1 } }
        );
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

module.exports = router;
