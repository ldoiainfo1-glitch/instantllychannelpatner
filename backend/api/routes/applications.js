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
    const { positionId, name, phone, address, introducedBy, companyName, businessName } = req.body;
    
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

    // Handle both MongoDB ObjectIds and temporary IDs to find the position
    let position;
    let actualPositionId;
    
    // Check if it's a valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(positionId)) {
      position = await Position.findById(positionId);
      actualPositionId = positionId;
    } else {
      // Handle temporary IDs by finding using sNo (extract number from temp ID)
      console.log('⚠️  Non-ObjectId positionId detected:', positionId);
      
      // Extract serial number from temporary ID (e.g., "temp_1_1761581511896" -> 1)
      const sNoMatch = positionId.match(/temp_(\d+)_/);
      if (sNoMatch) {
        const sNo = parseInt(sNoMatch[1]);
        position = await Position.findOne({ sNo: sNo });
        actualPositionId = position ? position._id : null;
        console.log('🔄 Found position by sNo:', sNo, position ? 'Success' : 'Failed');
      }
    }
    
    if (!position) {
      console.error('❌ Position not found for ID:', positionId);
      return res.status(404).json({ error: 'Position not found' });
    }
    
    // Check if someone has already applied for this position
    const existingApplication = await Application.findOne({ 
      positionId: actualPositionId,
      status: { $in: ['pending', 'approved'] }
    });
    
    if (existingApplication) {
      return res.status(400).json({ error: 'Position is not available - someone has already applied' });
    }

    // Generate email from phone
    const email = `${phone}@instantlycards.com`;

    // Create new application in applications collection
    const newApplication = new Application({
      positionId: actualPositionId,
      applicantInfo: {
        name: name.trim(),
        phone: phone.trim(),
        email: email,
        photo: photoBase64,
        address: address.trim(),
        companyName: companyName.trim(),
        businessName: businessName.trim()
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

// Get all applications with location filtering
router.get('/', async (req, res) => {
  try {
    const { 
      status, 
      positionId, 
      country, 
      zone, 
      state, 
      division, 
      district, 
      tehsil, 
      pincode, 
      village 
    } = req.query;
    
    // Build application filter
    let applicationFilter = {};
    if (status) applicationFilter.status = status;
    if (positionId) applicationFilter.positionId = positionId;
    
    // Get applications from applications collection and populate position details
    let applicationsQuery = Application.find(applicationFilter)
      .populate('positionId')
      .sort({ appliedDate: -1 });
    
    const applications = await applicationsQuery;
    
    // Filter by location if provided
    let filteredApplications = applications;
    if (country || zone || state || division || district || tehsil || pincode || village) {
      filteredApplications = applications.filter(app => {
        if (!app.positionId || !app.positionId.location) return false;
        
        const location = app.positionId.location;
        
        if (country && location.country !== country) return false;
        if (zone && location.zone !== zone) return false;
        if (state && location.state !== state) return false;
        if (division && location.division !== division) return false;
        if (district && location.district !== district) return false;
        if (tehsil && location.tehsil !== tehsil) return false;
        if (pincode && location.pincode !== pincode) return false;
        if (village && location.village !== village) return false;
        
        return true;
      });
    }
    
    // Format applications for frontend
    const formattedApplications = filteredApplications.map(app => ({
      _id: app._id,
      applicationId: app._id,
      positionId: app.positionId?._id,
      positionTitle: app.positionId?.designation,
      positionPost: app.positionId?.post,
      location: app.positionId?.location,
      applicantInfo: app.applicantInfo,
      introducedBy: app.introducedBy,
      status: app.status,
      appliedDate: app.appliedDate,
      approvedDate: app.approvedDate,
      paymentStatus: app.paymentStatus,
      paymentAmount: app.paymentAmount,
      paymentDate: app.paymentDate,
      adminNotes: app.adminNotes,
      contribution: app.positionId?.contribution || 10000,
      credits: app.positionId?.credits || 60000
    }));
    
    console.log(`📊 Found ${formattedApplications.length} applications in applications collection`);
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
