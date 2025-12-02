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
      // Generate UNIQUE personCode if not already present in application
      let personCode = application.personCode;
      if (!personCode) {
        // Generate unique person code: YYYY-MMDD-XXXX (XXXX is 4-digit random)
        // Keep trying until we get a unique one
        let isUnique = false;
        while (!isUnique) {
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const random = String(Math.floor(1000 + Math.random() * 9000)); // 4-digit number
          personCode = `${year}-${month}${day}-${random}`;
          
          // Check if this personCode already exists
          const existingUser = await User.findOne({ personCode });
          const existingApp = await Application.findOne({ personCode });
          
          if (!existingUser && !existingApp) {
            isUnique = true;
          }
        }
        
        // Save personCode to application
        application.personCode = personCode;
        console.log(`🆔 Generated new UNIQUE personCode: ${personCode}`);
      }
      
      // Generate password: First 4 letters of name in CAPITAL
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
        password: defaultPassword, // First 4 letters of name in CAPITAL (e.g., "RAJE" for Rajesh)
        photo: application.applicantInfo.photo,
        introducedBy: application.introducedBy,
        positionId: application.positionId,
        appliedDate: application.appliedDate,
        approvedDate: new Date(),
        credits: 500000, // START WITH 500,000 CREDITS (5 lacs joining bonus)
        hasReceivedInitialCredits: true, // Mark as already received
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
        passwordLength: defaultPassword.length,
        initialCredits: 500000
      });
    } else {
      // User already exists - grant 500,000 credits on first approval if not already received
      if (!user.hasReceivedInitialCredits) {
        user.credits = (user.credits || 0) + 500000; // 5 lacs joining bonus
        user.hasReceivedInitialCredits = true;
        
        // Add to credits history
        if (!user.creditsHistory) user.creditsHistory = [];
        user.creditsHistory.push({
          type: 'initial',
          amount: 500000,
          description: 'Welcome bonus on first approval - 5 lacs joining bonus',
          date: new Date()
        });
        
        await user.save();
        console.log(`💰 Granted 500,000 initial credits to ${user.name}. Total credits: ${user.credits}`);
      }
    }
    
    // Update introduced count and credits for introducer (100,000 credits per referral - 20% of 5 lacs)
    if (application.introducedBy && application.introducedBy !== 'Self') {
      const introducer = await User.findOne({ personCode: application.introducedBy });
      if (introducer) {
        // Increment introduced count (always, no limit)
        introducer.introducedCount = (introducer.introducedCount || 0) + 1;
        
        // Add 100,000 credits for EACH referral (20% of 500,000 joining bonus)
        const creditsPerReferral = 100000;
        
        introducer.credits = (introducer.credits || 0) + creditsPerReferral;
        
        // Add to credits history
        if (!introducer.creditsHistory) introducer.creditsHistory = [];
        introducer.creditsHistory.push({
          type: 'referral',
          amount: creditsPerReferral,
          description: `Referral bonus for ${application.applicantInfo.name}`,
          referredUser: application.applicantInfo.name,
          date: new Date()
        });
        
        console.log(`✅ Introducer ${introducer.name} earned ${creditsPerReferral} credits (Total referrals: ${introducer.introducedCount})`);
        
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
      message: 'Application approved successfully! User has been granted 500,000 credits (5 lacs joining bonus).',
      application,
      creditsGranted: 500000,
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

// FIX ENDPOINT: Create user accounts for approved applications that don't have user accounts
router.post('/fix-approved-without-users', async (req, res) => {
  try {
    const User = require('../models/User');
    
    // Find all approved applications
    const approvedApplications = await Application.find({ status: 'approved' });
    
    const fixed = [];
    const skipped = [];
    const errors = [];
    
    for (const application of approvedApplications) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ phone: application.applicantInfo.phone });
        
        if (existingUser) {
          skipped.push({
            name: application.applicantInfo.name,
            phone: application.applicantInfo.phone,
            reason: 'User already exists'
          });
          continue;
        }
        
        // Generate UNIQUE personCode
        let personCode = application.personCode;
        if (!personCode) {
          let isUnique = false;
          while (!isUnique) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const random = String(Math.floor(1000 + Math.random() * 9000));
            personCode = `${year}-${month}${day}-${random}`;
            
            const existingUser = await User.findOne({ personCode });
            const existingApp = await Application.findOne({ personCode });
            
            if (!existingUser && !existingApp) {
              isUnique = true;
            }
          }
          application.personCode = personCode;
          await application.save();
        }
        
        // Generate password: First 4 letters of name in CAPITAL
        const nameForPassword = application.applicantInfo.name.replace(/\s+/g, '');
        const defaultPassword = nameForPassword.substring(0, 4).toUpperCase().padEnd(4, 'X');
        
        // Create user account
        const user = new User({
          name: application.applicantInfo.name,
          phone: application.applicantInfo.phone,
          email: application.applicantInfo.email || '',
          personCode: personCode,
          loginId: application.applicantInfo.phone,
          password: defaultPassword,
          photo: application.applicantInfo.photo,
          introducedBy: application.introducedBy,
          positionId: application.positionId,
          appliedDate: application.appliedDate,
          approvedDate: application.approvedDate || new Date(),
          credits: 1200, // 1200 credits for all users
          hasReceivedInitialCredits: true,
          introducedCount: 0,
          isVerified: false,
          isFirstLogin: true
        });
        
        await user.save();
        
        // Update application with userId
        application.userId = user._id;
        await application.save();
        
        fixed.push({
          name: application.applicantInfo.name,
          phone: application.applicantInfo.phone,
          personCode: personCode,
          loginId: application.applicantInfo.phone,
          password: defaultPassword,
          credits: 1200
        });
        
      } catch (error) {
        errors.push({
          name: application.applicantInfo.name,
          phone: application.applicantInfo.phone,
          error: error.message
        });
      }
    }
    
    res.json({
      message: 'Fix completed',
      fixed: fixed.length,
      skipped: skipped.length,
      errors: errors.length,
      details: {
        fixed,
        skipped,
        errors
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// FIX ENDPOINT: Update specific user - fix name and credits
router.post('/fix-user/:phone', async (req, res) => {
  try {
    const User = require('../models/User');
    const { phone } = req.params;
    const { name, password, credits } = req.body;
    
    const user = await User.findOne({ phone });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const oldData = {
      name: user.name,
      credits: user.credits
    };
    
    // Update fields if provided
    if (name) user.name = name;
    if (password) user.password = password; // Will be hashed by pre-save hook
    if (credits !== undefined) user.credits = credits;
    
    await user.save();
    
    res.json({
      message: 'User updated successfully',
      oldData,
      newData: {
        name: user.name,
        phone: user.phone,
        personCode: user.personCode,
        credits: user.credits,
        loginId: user.loginId,
        passwordUpdated: !!password
      },
      loginCredentials: {
        loginId: user.phone,
        password: password || '(not changed)',
        credits: user.credits
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET ALL USERS - for debugging and frontend display
router.get('/all-users', async (req, res) => {
  try {
    const User = require('../models/User');
    const users = await User.find({}).select('-password').lean().limit(1000).sort({ createdAt: -1 });
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET USERS STATS - for admin dashboard/credits page
router.get('/users-stats', async (req, res) => {
  try {
    const User = require('../models/User');
    
    // Count total users
    const totalUsers = await User.countDocuments();
    
    // Calculate total credits across all users
    const users = await User.find({}).select('credits').lean();
    const totalCredits = users.reduce((sum, user) => sum + (user.credits || 0), 0);
    
    res.json({
      success: true,
      totalUsers,
      totalCredits
    });
  } catch (error) {
    console.error('❌ Get users stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET ALL TRANSACTIONS - for admin credits page
router.get('/all-transactions', async (req, res) => {
  try {
    const User = require('../models/User');
    const limit = parseInt(req.query.limit) || 1000;
    
    console.log('📊 Fetching all transactions from channel partner backend...');
    
    // Get all users with their credits history
    const users = await User.find({})
      .select('name phone personCode creditsHistory')
      .lean();
    
    // Create multiple maps for quick user lookup
    const userByName = new Map();
    const userByPhone = new Map();
    const userByNameLower = new Map();
    
    users.forEach(user => {
      userByName.set(user.name, user);
      if (user.phone) {
        userByPhone.set(user.phone, user);
      }
      // Store by lowercase name for case-insensitive lookup
      userByNameLower.set(user.name.toLowerCase().trim(), user);
    });
    
    // Helper function to find user by name (case-insensitive, handles slight variations)
    const findUserByName = (name) => {
      if (!name) return null;
      
      // Try exact match first
      let user = userByName.get(name);
      if (user) return user;
      
      // Try case-insensitive match
      user = userByNameLower.get(name.toLowerCase().trim());
      if (user) return user;
      
      // Try partial match (for slight spelling variations)
      const nameLower = name.toLowerCase().trim();
      for (const [key, value] of userByNameLower.entries()) {
        // Check if names are very similar (allowing for minor differences)
        if (key.includes(nameLower) || nameLower.includes(key)) {
          return value;
        }
      }
      
      return null;
    };
    
    // Aggregate all transactions from all users
    const allTransactions = [];
    
    for (const user of users) {
      if (!user.creditsHistory || user.creditsHistory.length === 0) {
        continue;
      }
      
      for (const historyItem of user.creditsHistory) {
        // Determine transaction type
        let type = 'other';
        let fromUser = null;
        let toUser = null;
        
        if (historyItem.description?.includes('Transferred to')) {
          // This user sent credits to someone
          type = 'transfer_sent';
          fromUser = {
            _id: user._id,
            name: user.name,
            phone: user.phone
          };
          
          // Extract receiver name and try to find their full info
          const receiverName = historyItem.description.split('Transferred to ')[1]?.trim();
          if (receiverName) {
            const receiverUser = findUserByName(receiverName);
            if (receiverUser) {
              toUser = {
                _id: receiverUser._id,
                name: receiverUser.name,
                phone: receiverUser.phone
              };
            } else {
              toUser = { name: receiverName };
            }
          }
        } else if (historyItem.description?.includes('Received from')) {
          // This user received credits from someone
          type = 'transfer_received';
          toUser = {
            _id: user._id,
            name: user.name,
            phone: user.phone
          };
          
          // Extract sender name and try to find their full info
          const senderName = historyItem.description.split('Received from ')[1]?.trim();
          if (senderName) {
            const senderUser = findUserByName(senderName);
            if (senderUser) {
              fromUser = {
                _id: senderUser._id,
                name: senderUser.name,
                phone: senderUser.phone
              };
            } else {
              fromUser = { name: senderName };
            }
          }
        } else if (historyItem.type === 'referral') {
          type = 'referral_bonus';
          toUser = {
            _id: user._id,
            name: user.name,
            phone: user.phone
          };
          
          // Try to find the referred user
          const referredName = historyItem.referredUser;
          if (referredName) {
            const referredUser = findUserByName(referredName);
            if (referredUser) {
              fromUser = {
                _id: referredUser._id,
                name: referredUser.name,
                phone: referredUser.phone
              };
            } else {
              fromUser = { name: `Referral - ${referredName}` };
            }
          } else {
            fromUser = { name: 'System - Referral' };
          }
        } else if (historyItem.type === 'initial') {
          type = 'signup_bonus';
          toUser = {
            _id: user._id,
            name: user.name,
            phone: user.phone
          };
          fromUser = { name: 'System - Welcome Bonus' };
        } else if (historyItem.type === 'bonus') {
          type = 'admin_adjustment';
          toUser = {
            _id: user._id,
            name: user.name,
            phone: user.phone
          };
          fromUser = { name: 'Admin' };
        } else if (historyItem.type === 'deduction') {
          type = 'admin_adjustment';
          fromUser = {
            _id: user._id,
            name: user.name,
            phone: user.phone
          };
          toUser = { name: 'Admin Deduction' };
        }
        
        // Create transaction object
        const transaction = {
          _id: historyItem._id || `${user._id}_${historyItem.date}`,
          type: type,
          amount: Math.abs(historyItem.amount || 0),
          description: historyItem.description || 'Credit transaction',
          createdAt: historyItem.date,
          fromUser: fromUser,
          toUser: toUser,
          status: 'completed'
        };
        
        allTransactions.push(transaction);
      }
    }
    
    // Sort by date (newest first) and limit
    allTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const limitedTransactions = allTransactions.slice(0, limit);
    
    console.log(`✅ Fetched ${limitedTransactions.length} transactions (total: ${allTransactions.length})`);
    
    res.json({
      success: true,
      transactions: limitedTransactions,
      total: allTransactions.length
    });
  } catch (error) {
    console.error('❌ Get all transactions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// FIX ENDPOINT: Recalculate all introducedCount values
router.post('/fix-introduced-counts', async (req, res) => {
  try {
    const User = require('../models/User');
    
    // Get all users
    const allUsers = await User.find({});
    const fixed = [];
    
    for (const user of allUsers) {
      // Count how many users have this user's personCode as introducedBy
      const introducedCount = await User.countDocuments({ 
        introducedBy: user.personCode 
      });
      
      const oldCount = user.introducedCount;
      
      if (oldCount !== introducedCount) {
        user.introducedCount = introducedCount;
        await user.save();
        
        fixed.push({
          name: user.name,
          phone: user.phone,
          personCode: user.personCode,
          oldCount,
          newCount: introducedCount
        });
      }
    }
    
    res.json({
      message: 'Introduced counts fixed',
      fixed: fixed.length,
      details: fixed
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// FIX ENDPOINT: Backfill credits history for existing users
router.post('/fix-credits-history', async (req, res) => {
  try {
    const User = require('../models/User');
    
    // Get all users
    const allUsers = await User.find({});
    const fixed = [];
    
    for (const user of allUsers) {
      // CLEAR existing credits history and rebuild from scratch
      user.creditsHistory = [];
      
      // Add initial credits entry (1200)
      if (user.hasReceivedInitialCredits || user.credits >= 1200) {
        user.creditsHistory.push({
          type: 'initial',
          amount: 1200,
          description: 'Welcome bonus on first approval',
          date: user.approvedDate || user.createdAt || new Date()
        });
      }
      
      // Add referral bonus entries for each person they referred
      // Calculate how many referral bonuses they should have
      if (user.introducedCount > 0) {
        // Find users who were introduced by this person (using personCode)
        const referredUsers = await User.find({ introducedBy: user.personCode });
        
        for (const referredUser of referredUsers) {
          user.creditsHistory.push({
            type: 'referral',
            amount: 1200,
            description: `Referral bonus for ${referredUser.name}`,
            referredUser: referredUser.name,
            date: referredUser.approvedDate || referredUser.createdAt || new Date()
          });
        }
      }
      
      await user.save();
      
      fixed.push({
        name: user.name,
        phone: user.phone,
        personCode: user.personCode,
        introducedBy: user.introducedBy,
        credits: user.credits,
        historyEntries: user.creditsHistory.length,
        introducedCount: user.introducedCount
      });
    }
    
    res.json({
      message: 'Credits history rebuilt for all users',
      fixed: fixed.length,
      details: fixed
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// FIX ENDPOINT: Sync introducedBy from applications to users
router.post('/fix-introduced-by', async (req, res) => {
  try {
    const User = require('../models/User');
    
    // Get all approved applications
    const approvedApplications = await Application.find({ status: 'approved' });
    const fixed = [];
    
    for (const application of approvedApplications) {
      const user = await User.findOne({ phone: application.applicantInfo.phone });
      
      if (!user) {
        continue;
      }
      
      // If application has introducedBy and user doesn't (or is "Self"), sync it
      if (application.introducedBy && 
          application.introducedBy !== 'Self' && 
          (!user.introducedBy || user.introducedBy === 'Self')) {
        
        const oldValue = user.introducedBy;
        user.introducedBy = application.introducedBy;
        await user.save();
        
        fixed.push({
          name: user.name,
          phone: user.phone,
          oldIntroducedBy: oldValue,
          newIntroducedBy: application.introducedBy
        });
      }
    }
    
    res.json({
      message: 'IntroducedBy synced from applications to users',
      fixed: fixed.length,
      details: fixed
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Get single user details including credits (supports BOTH Channel Partner and App users)
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { source } = req.query; // Optional: 'channelpartner' or 'instantlly'
    const mongoose = require('mongoose');

    console.log('📋 Admin fetching user details:', userId, 'source:', source);

    let user;
    let userType = 'Channel Partner';

    // Try Channel Partner database first
    const User = require('../models/User');
    user = await User.findById(userId)
      .select('name phone photo personCode credits creditsHistory introducedCount isVerified')
      .lean();

    // If not found in Channel Partner DB, try Instantlly App DB
    if (!user) {
      try {
        console.log('🔍 User not in Channel Partner DB, checking App DB...');
        const instantllyDB = mongoose.connection.useDb('instantlly');
        const AppUserSchema = new mongoose.Schema({
          name: String,
          phone: String,
          email: String,
          profilePicture: String,
          credits: Number,
          referralCode: String,
          creditsExpiryDate: Date
        });
        const AppUser = instantllyDB.model('User', AppUserSchema);
        
        user = await AppUser.findById(userId)
          .select('name phone email profilePicture credits referralCode creditsExpiryDate')
          .lean();
        
        if (user) {
          userType = 'App User';
          console.log(`✅ Found App User: ${user.name} with ${user.credits || 0} credits`);
        }
      } catch (appError) {
        console.error('⚠️ Error checking app database:', appError.message);
      }
    } else {
      console.log(`✅ Found Channel Partner User: ${user.name} with ${user.credits || 0} credits`);
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found in either database' });
    }

    // Format response based on user type
    const response = {
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        photo: user.photo || user.profilePicture,
        personCode: user.personCode || user.referralCode || 'N/A',
        credits: user.credits || 0,
        userType: userType,
        source: userType === 'App User' ? 'instantlly' : 'channelpartner'
      }
    };

    // Add Channel Partner specific fields
    if (userType === 'Channel Partner') {
      response.user.creditsHistory = user.creditsHistory || [];
      response.user.introducedCount = user.introducedCount || 0;
      response.user.isVerified = user.isVerified || false;
    }

    // Add App User specific fields
    if (userType === 'App User') {
      response.user.email = user.email;
      response.user.creditsExpiryDate = user.creditsExpiryDate;
    }

    res.json(response);
  } catch (error) {
    console.error('❌ Admin get user error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Search users by phone for credit transfer (searches BOTH Channel Partner and App users)
router.post('/search-users', async (req, res) => {
  try {
    const { phonePrefix } = req.body;
    const mongoose = require('mongoose');

    console.log('🔍 Admin searching users by phone prefix:', phonePrefix);

    if (!phonePrefix || phonePrefix.length < 2) {
      return res.json({ success: true, users: [] });
    }

    // Search in BOTH databases
    const allUsers = [];

    // 1. Search Channel Partner users (current database)
    const User = require('../models/User');
    const channelPartnerUsers = await User.find({
      phone: { $regex: phonePrefix, $options: 'i' }
    })
    .select('name phone photo personCode credits')
    .limit(20)
    .lean();

    console.log(`📋 Found ${channelPartnerUsers.length} Channel Partner users`);

    // Format Channel Partner users
    channelPartnerUsers.forEach(user => {
      allUsers.push({
        _id: user._id,
        name: user.name,
        phone: user.phone,
        displayPhone: user.phone,
        profilePicture: user.photo || null,
        personCode: user.personCode || 'N/A',
        credits: user.credits || 0,
        userType: 'Channel Partner',
        source: 'channelpartner'
      });
    });

    // 2. Search Instantlly Cards App users (main database)
    try {
      console.log('🔄 Attempting to connect to instantlly database...');
      const instantllyDB = mongoose.connection.useDb('instantlly');
      console.log('✅ Connected to instantlly database');
      
      const AppUserSchema = new mongoose.Schema({
        name: String,
        phone: String,
        email: String,
        profilePicture: String,
        credits: Number,
        referralCode: String
      }, { collection: 'users' }); // Explicitly specify collection name
      
      const AppUser = instantllyDB.model('User', AppUserSchema);
      
      console.log('🔍 Searching app users with phone prefix:', phonePrefix);

      const appUsers = await AppUser.find({
        phone: { $regex: phonePrefix, $options: 'i' }
      })
      .select('name phone email profilePicture credits referralCode')
      .limit(20)
      .lean();

      console.log(`📱 Found ${appUsers.length} Instantlly Cards App users`);

      // Format App users
      appUsers.forEach(user => {
        allUsers.push({
          _id: user._id,
          name: user.name || 'App User',
          phone: user.phone,
          displayPhone: user.phone,
          profilePicture: user.profilePicture || null,
          personCode: user.referralCode || 'App User',
          credits: user.credits || 0,
          userType: 'App User',
          source: 'instantlly'
        });
      });
    } catch (appError) {
      console.error('❌ Error searching app users:');
      console.error('  Message:', appError.message);
      console.error('  Stack:', appError.stack);
      // Continue with just channel partner users if app DB fails
    }

    console.log(`✅ Total found: ${allUsers.length} users (${channelPartnerUsers.length} CP + ${allUsers.length - channelPartnerUsers.length} App)`);

    res.json({ success: true, users: allUsers });
  } catch (error) {
    console.error('❌ Admin search users error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Transfer credits to any user (supports BOTH Channel Partner and App users)
router.post('/transfer-credits', async (req, res) => {
  try {
    const { toUserId, amount, description, userType, source } = req.body;
    const mongoose = require('mongoose');

    console.log('💸 Admin transferring credits:', { toUserId, amount, description, userType, source });

    // Validate amount
    const transferAmount = parseInt(amount);
    if (!transferAmount || transferAmount < 1) {
      return res.status(400).json({ error: 'Invalid transfer amount' });
    }

    let receiver;
    let isAppUser = false;

    // Determine which database to use based on source
    if (source === 'instantlly' || userType === 'App User') {
      // Transfer to Instantlly Cards App user
      isAppUser = true;
      console.log('📱 Transferring to App User in instantlly database');
      
      const instantllyDB = mongoose.connection.useDb('instantlly');
      const AppUserSchema = new mongoose.Schema({
        name: String,
        phone: String,
        email: String,
        profilePicture: String,
        credits: Number,
        referralCode: String,
        creditsExpiryDate: Date
      });
      const AppUser = instantllyDB.model('User', AppUserSchema);
      
      receiver = await AppUser.findById(toUserId);
      if (!receiver) {
        return res.status(404).json({ error: 'App user not found' });
      }

      // Add credits to app user
      receiver.credits = (receiver.credits || 0) + transferAmount;
      
      // Extend credits expiry if needed (1 month from now)
      if (!receiver.creditsExpiryDate || new Date(receiver.creditsExpiryDate) < new Date()) {
        receiver.creditsExpiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }

      await receiver.save();
      
      console.log(`✅ Admin transfer to App User successful: ${transferAmount} credits → ${receiver.name} (${receiver.phone})`);
    } else {
      // Transfer to Channel Partner user
      console.log('📋 Transferring to Channel Partner user');
      
      const User = require('../models/User');
      receiver = await User.findById(toUserId);
      
      if (!receiver) {
        return res.status(404).json({ error: 'Channel Partner user not found' });
      }

      // Add credits to channel partner user
      receiver.credits = (receiver.credits || 0) + transferAmount;

      // Add to credits history for Channel Partner users
      if (!receiver.creditsHistory) receiver.creditsHistory = [];
      receiver.creditsHistory.push({
        type: 'bonus',
        amount: transferAmount,
        description: description || `Admin credit transfer - ${transferAmount.toLocaleString('en-IN')} credits`,
        date: new Date()
      });

      await receiver.save();
      
      console.log(`✅ Admin transfer to Channel Partner successful: ${transferAmount} credits → ${receiver.name} (${receiver.phone})`);
    }

    res.json({
      success: true,
      message: `Successfully transferred ${transferAmount.toLocaleString('en-IN')} credits to ${receiver.name}`,
      receiverCredits: receiver.credits,
      userType: isAppUser ? 'App User' : 'Channel Partner',
      transaction: {
        toUser: {
          _id: receiver._id,
          name: receiver.name,
          phone: receiver.phone
        },
        amount: transferAmount,
        description: description,
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error('❌ Admin transfer credits error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Edit Application - Update name and phone
router.put('/applications/:id/edit', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone } = req.body;

    console.log(`📝 Editing application ${id}:`, { name, phone });

    // Find the application
    const application = await Application.findById(id);
    
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    // Update application info
    if (name) application.applicantInfo.name = name;
    if (phone) application.applicantInfo.phone = phone;
    await application.save();

    // If application is approved, also update the User record
    if (application.status === 'approved' && application.userId) {
      const User = require('../models/User');
      const user = await User.findById(application.userId);
      
      if (user) {
        if (name) user.name = name;
        if (phone) user.phone = phone;
        await user.save();
        console.log(`✅ Updated user: ${user.name} (${user.phone})`);
      }
    }

    console.log(`✅ Updated application: ${application.applicantInfo.name}`);

    res.json({
      success: true,
      message: "Application updated successfully",
      application
    });
  } catch (error) {
    console.error('❌ Edit application error:', error);
    res.status(500).json({ message: "Server error" });
  }
});

// Transfer Position - Move application to different position
router.put('/applications/:id/transfer', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPositionId } = req.body;

    console.log(`🔄 Transferring application ${id} to position:`, newPositionId);

    // Find the application
    const application = await Application.findById(id);
    
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    const oldPositionId = application.positionId;

    // Check if new position already has an applicant
    const existingApplication = await Application.findOne({
      positionId: newPositionId,
      status: { $in: ['pending', 'approved'] },
      _id: { $ne: id } // Exclude current application
    });

    if (existingApplication) {
      return res.status(400).json({ 
        message: "This position is already occupied",
        occupiedBy: existingApplication.applicantInfo.name
      });
    }

    // Update application's position
    application.positionId = newPositionId;
    await application.save();

    // If application is approved, also update the User record
    if (application.status === 'approved' && application.userId) {
      const User = require('../models/User');
      const user = await User.findById(application.userId);
      
      if (user) {
        user.positionId = newPositionId;
        await user.save();
        console.log(`✅ Updated user position: ${user.name} -> ${newPositionId}`);
      }
    }

    console.log(`✅ Transferred ${application.applicantInfo.name} from ${oldPositionId} to ${newPositionId}`);

    res.json({
      success: true,
      message: "Position transferred successfully",
      application,
      oldPosition: oldPositionId,
      newPosition: newPositionId
    });
  } catch (error) {
    console.error('❌ Transfer position error:', error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
