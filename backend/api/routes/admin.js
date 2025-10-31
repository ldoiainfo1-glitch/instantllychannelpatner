const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const Position = require('../models/Position');

// Get dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    // Count total applications (each application represents a filled position)
    const totalApplications = await Application.countDocuments();
    const pendingApplications = await Application.countDocuments({ status: 'pending' });
    const approvedApplications = await Application.countDocuments({ status: 'approved' });
    const rejectedApplications = await Application.countDocuments({ status: 'rejected' });
    
    // In dynamic position system:
    // - Total positions = All applications (each represents an occupied position)
    // - Available positions would be infinite (dynamic generation)
    // So we show "Total Positions" as total applications submitted
    const totalPositions = totalApplications;
    const availablePositions = 0; // Dynamic system - positions are generated on demand
    const occupiedPositions = totalApplications;

    const stats = {
      totalPositions,
      availablePositions,
      occupiedPositions,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      totalApplications
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all pending applications for admin review
router.get('/applications/pending', async (req, res) => {
  try {
    const pendingApplications = await Application.find({ status: 'pending' })
      .sort({ appliedDate: -1 });
    
    res.json(pendingApplications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all approved applications
router.get('/applications/approved', async (req, res) => {
  try {
    const approvedApplications = await Application.find({ status: 'approved' })
      .sort({ approvedDate: -1 });
    
    res.json(approvedApplications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all rejected applications
router.get('/applications/rejected', async (req, res) => {
  try {
    const rejectedApplications = await Application.find({ status: 'rejected' })
      .sort({ appliedDate: -1 });
    
    res.json(rejectedApplications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve application
router.put('/applications/:id/approve', async (req, res) => {
  try {
    const { adminNotes } = req.body;
    const User = require('../models/User');
    
    // Don't populate positionId since it's a string, not a reference
    const application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    console.log(`👨‍💼 Admin approving application: ${application._id}`);
    console.log(`📍 Position ID: ${application.positionId}`);
    console.log(`👤 Applicant: ${application.applicantInfo.name}`);

    // Check if user exists or create new user
    let user = await User.findOne({ phone: application.applicantInfo.phone });
    
    if (!user) {
      // Generate personCode if not already present in application
      let personCode = application.personCode;
      if (!personCode) {
        // Generate unique person code: YYYY-MMDD-XXXX (XXXX is 4-digit random)
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const random = String(Math.floor(1000 + Math.random() * 9000)); // 4-digit number
        personCode = `${year}-${month}${day}-${random}`;
        
        // Save personCode to application
        application.personCode = personCode;
        console.log(`🆔 Generated new personCode: ${personCode}`);
      }
      
      // Generate password: First 4 letters of name in capital
      const nameForPassword = application.applicantInfo.name.replace(/\s+/g, ''); // Remove spaces
      const defaultPassword = nameForPassword.substring(0, 4).toUpperCase().padEnd(4, 'X'); // Ensure at least 4 chars
      
      console.log('🔐 Creating user account with credentials:', {
        loginId: application.applicantInfo.phone,
        password: defaultPassword,
        personCode: personCode
      });
      
      // Create new user account with proper credentials
      user = new User({
        name: application.applicantInfo.name,
        phone: application.applicantInfo.phone,
        email: application.applicantInfo.email || '',
        personCode: personCode,
        loginId: application.applicantInfo.phone, // Login ID is phone number
        password: defaultPassword, // First 4 letters of name in CAPITAL
        photo: application.applicantInfo.photo,
        introducedBy: application.introducedBy,
        positionId: application.positionId,
        appliedDate: application.appliedDate,
        approvedDate: new Date(),
        credits: 0,
        hasReceivedInitialCredits: false,
        introducedCount: 0,
        isVerified: false,
        isFirstLogin: true
      });
      await user.save();
      
      console.log('✅ User account created successfully:', {
        userId: user._id,
        personCode: personCode,
        loginId: application.applicantInfo.phone,
        defaultPassword: defaultPassword,
        passwordLength: defaultPassword.length
      });
    }

    // Grant 500 credits on first approval if not already received
    if (!user.hasReceivedInitialCredits) {
      user.credits = (user.credits || 0) + 500;
      user.hasReceivedInitialCredits = true;
      await user.save();
      console.log(`💰 Granted 500 initial credits to ${user.name}. Total credits: ${user.credits}`);
    }
    
    // Update introduced count and credits for introducer
    if (application.introducedBy && application.introducedBy !== 'Self') {
      const introducer = await User.findOne({ personCode: application.introducedBy });
      if (introducer) {
        // Increment introduced count (always, no limit)
        introducer.introducedCount = (introducer.introducedCount || 0) + 1;
        
        // Add 100 credits only for first 20 referrals
        const maxPaidReferrals = 20;
        const creditsPerReferral = 100;
        
        if (introducer.introducedCount <= maxPaidReferrals) {
          introducer.credits = (introducer.credits || 0) + creditsPerReferral;
          console.log(`✅ Introducer ${introducer.name} earned ${creditsPerReferral} credits (${introducer.introducedCount}/${maxPaidReferrals})`);
        } else {
          console.log(`✅ Introducer ${introducer.name} count increased (${introducer.introducedCount}) - max credits reached`);
        }
        
        await introducer.save();
      } else {
        console.log(`⚠️ Introducer not found with personCode: ${application.introducedBy}`);
      }
    }

    // Update application
    application.status = 'approved';
    application.approvedDate = new Date();
    application.userId = user._id;
    if (adminNotes) application.adminNotes = adminNotes;

    await application.save();
    console.log(`✅ Application ${application._id} approved successfully`);
    
    res.json({
      message: 'Application approved successfully! User has been granted 500 credits.',
      application,
      creditsGranted: !user.hasReceivedInitialCredits ? 500 : 0,
      userCredits: user.credits
    });
  } catch (error) {
    console.error('❌ Error approving application:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reject application
router.put('/applications/:id/reject', async (req, res) => {
  try {
    const { adminNotes } = req.body;
    // Don't populate positionId since it's a string, not a reference
    const application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    console.log(`👨‍💼 Admin rejecting application: ${application._id}`);
    console.log(`📍 Position ID: ${application.positionId}`);
    console.log(`👤 Applicant: ${application.applicantInfo.name}`);

    application.status = 'rejected';
    if (adminNotes) application.adminNotes = adminNotes;

    await application.save();
    console.log(`❌ Application ${application._id} rejected`);
    
    res.json({
      message: 'Application rejected successfully. Position is now available for new applications.',
      application
    });
  } catch (error) {
    console.error('❌ Error rejecting application:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete application
router.delete('/applications/:id/delete', async (req, res) => {
  try {
    // Don't populate positionId since it's a string, not a reference
    const application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    console.log(`🗑️ Admin deleting application: ${application._id}`);
    console.log(`📍 Position ID: ${application.positionId}`);
    console.log(`👤 Applicant: ${application.applicantInfo.name}`);

    // Delete the application from database
    await Application.findByIdAndDelete(req.params.id);
    console.log(`✅ Application ${application._id} deleted from database`);
    
    res.json({
      message: 'Application deleted successfully from database.',
      deletedApplication: {
        id: application._id,
        name: application.applicantInfo.name,
        phone: application.applicantInfo.phone,
        positionId: application.positionId
      }
    });
  } catch (error) {
    console.error('❌ Error deleting application:', error);
    res.status(500).json({ error: error.message });
  }
});

// Initialize sample positions
router.post('/initialize-positions', async (req, res) => {
  try {
    // Clear existing positions
    await Position.deleteMany({});
    
    const samplePositions = [
      // India Level
      {
        sNo: 1,
        post: 'President',
        designation: 'President of India',
        location: { country: 'India' },
        contribution: 500000,
        status: 'Available'
      },
      
      // Zone Level - 6 Zones
      {
        sNo: 2,
        post: 'Zone Head',
        designation: 'Northern Zone Head',
        location: { country: 'India', zone: 'Northern' },
        contribution: 100000,
        status: 'Available'
      },
      {
        sNo: 3,
        post: 'Zone Head',
        designation: 'Western Zone Head',
        location: { country: 'India', zone: 'Western' },
        contribution: 100000,
        status: 'Available'
      },
      {
        sNo: 4,
        post: 'Zone Head',
        designation: 'Southern Zone Head',
        location: { country: 'India', zone: 'Southern' },
        contribution: 100000,
        status: 'Available'
      },
      {
        sNo: 5,
        post: 'Zone Head',
        designation: 'Eastern Zone Head',
        location: { country: 'India', zone: 'Eastern' },
        contribution: 100000,
        status: 'Available'
      },
      {
        sNo: 6,
        post: 'Zone Head',
        designation: 'Central Zone Head',
        location: { country: 'India', zone: 'Central' },
        contribution: 100000,
        status: 'Available'
      },
      {
        sNo: 7,
        post: 'Zone Head',
        designation: 'North Eastern Zone Head',
        location: { country: 'India', zone: 'North Eastern' },
        contribution: 100000,
        status: 'Available'
      },
      
      // State Level - Western Zone States
      {
        sNo: 8,
        post: 'State Head',
        designation: 'Maharashtra State Head',
        location: { country: 'India', zone: 'Western', state: 'Maharashtra' },
        contribution: 50000,
        status: 'Available'
      },
      {
        sNo: 9,
        post: 'State Head',
        designation: 'Gujarat State Head',
        location: { country: 'India', zone: 'Western', state: 'Gujarat' },
        contribution: 50000,
        status: 'Available'
      },
      {
        sNo: 10,
        post: 'State Head',
        designation: 'Rajasthan State Head',
        location: { country: 'India', zone: 'Western', state: 'Rajasthan' },
        contribution: 50000,
        status: 'Available'
      },
      {
        sNo: 11,
        post: 'State Head',
        designation: 'Goa State Head',
        location: { country: 'India', zone: 'Western', state: 'Goa' },
        contribution: 50000,
        status: 'Available'
      },
      
      // Division Level - Maharashtra Divisions
      {
        sNo: 12,
        post: 'Division Head',
        designation: 'Mumbai Division Head',
        location: { country: 'India', zone: 'Western', state: 'Maharashtra', division: 'Mumbai' },
        contribution: 25000,
        status: 'Available'
      },
      {
        sNo: 13,
        post: 'Division Head',
        designation: 'Pune Division Head',
        location: { country: 'India', zone: 'Western', state: 'Maharashtra', division: 'Pune' },
        contribution: 25000,
        status: 'Available'
      },
      {
        sNo: 14,
        post: 'Division Head',
        designation: 'Nashik Division Head',
        location: { country: 'India', zone: 'Western', state: 'Maharashtra', division: 'Nashik' },
        contribution: 25000,
        status: 'Available'
      },
      {
        sNo: 15,
        post: 'Division Head',
        designation: 'Aurangabad Division Head',
        location: { country: 'India', zone: 'Western', state: 'Maharashtra', division: 'Aurangabad' },
        contribution: 25000,
        status: 'Available'
      },
      {
        sNo: 16,
        post: 'Division Head',
        designation: 'Kolhapur Division Head',
        location: { country: 'India', zone: 'Western', state: 'Maharashtra', division: 'Kolhapur' },
        contribution: 25000,
        status: 'Available'
      },
      {
        sNo: 17,
        post: 'Division Head',
        designation: 'Nagpur Division Head',
        location: { country: 'India', zone: 'Western', state: 'Maharashtra', division: 'Nagpur' },
        contribution: 25000,
        status: 'Available'
      },
      
      // District Level - Mumbai Division Districts
      {
        sNo: 18,
        post: 'District Head',
        designation: 'Mumbai City District Head',
        location: { country: 'India', zone: 'Western', state: 'Maharashtra', division: 'Mumbai', district: 'Mumbai City' },
        contribution: 15000,
        status: 'Available'
      },
      {
        sNo: 19,
        post: 'District Head',
        designation: 'Mumbai Suburban District Head',
        location: { country: 'India', zone: 'Western', state: 'Maharashtra', division: 'Mumbai', district: 'Mumbai Suburban' },
        contribution: 15000,
        status: 'Available'
      },
      {
        sNo: 20,
        post: 'District Head',
        designation: 'Thane District Head',
        location: { country: 'India', zone: 'Western', state: 'Maharashtra', division: 'Mumbai', district: 'Thane' },
        contribution: 15000,
        status: 'Available'
      },
      {
        sNo: 21,
        post: 'District Head',
        designation: 'Raigad District Head',
        location: { country: 'India', zone: 'Western', state: 'Maharashtra', division: 'Mumbai', district: 'Raigad' },
        contribution: 15000,
        status: 'Available'
      }
    ];

    await Position.insertMany(samplePositions);
    
    res.json({
      message: 'Sample positions initialized successfully with hierarchical structure',
      count: samplePositions.length
    });
  } catch (error) {
    console.error('Error initializing positions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get users pending verification (paid but not verified)
router.get('/users/pending-verification', async (req, res) => {
  try {
    const User = require('../models/User');
    const pendingUsers = await User.find({
      isVerified: false
    })
      .sort({ createdAt: -1 });
    
    res.json(pendingUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user documents by phone number (for admin)
router.get('/user-documents/:phone', async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findOne({ phone: req.params.phone }).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        credits: user.credits,
        documents: user.documents,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint: Check user and reset password (for debugging)
router.post('/test-user/:phone', async (req, res) => {
  try {
    const User = require('../models/User');
    const Application = require('../models/Application');
    const { phone } = req.params;
    const { newPassword } = req.body;
    
    const user = await User.findOne({ phone });
    const application = await Application.findOne({ 'applicantInfo.phone': phone });
    
    // If no user AND no application, return 404
    if (!user && !application) {
      return res.status(404).json({ 
        error: 'No user or application found for this phone number',
        phone: phone
      });
    }

    // If only application exists (pending approval)
    if (!user && application) {
      return res.json({
        found: true,
        name: application.applicantInfo.name,
        phone: application.applicantInfo.phone,
        email: application.applicantInfo.email,
        personCode: application.personCode || 'N/A',
        introducedCount: 0,
        credits: 0,
        applicationId: application._id,
        status: application.status,
        isPendingApproval: true,
        hasPassword: false
      });
    }

    // User exists - return full details
    const result = {
      found: true,
      name: user.name,
      phone: user.phone,
      email: user.email,
      personCode: user.personCode || (application ? application.personCode : null) || 'N/A',
      introducedCount: user.introducedCount || 0,
      credits: user.credits || 0,
      applicationId: application ? application._id : null,
      status: application ? application.status : 'approved',
      isPendingApproval: false,
      hasPassword: !!user.password,
      passwordHash: user.password ? user.password.substring(0, 30) + '...' : 'None'
    };

    // If newPassword provided, update it
    if (newPassword) {
      user.password = newPassword; // Will be hashed by pre-save hook
      await user.save();
      result.passwordUpdated = true;
      result.newPassword = newPassword;
    }

    // Test password comparison with phone number
    const testWithPhone = await user.comparePassword(phone);
    result.phoneNumberWorks = testWithPhone;

    if (newPassword) {
      const testWithNew = await user.comparePassword(newPassword);
      result.newPasswordWorks = testWithNew;
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
