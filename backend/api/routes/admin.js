const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const Position = require('../models/Position');
const PaymentPlan = require('../models/PaymentPlan');

// Initialize default payment plans in database (run once)
async function initializePaymentPlans() {
    try {
        const count = await PaymentPlan.countDocuments();
        if (count === 0) {
            console.log('💰 Initializing default payment plans in database...');
            
            const defaultPlans = [
                {
                    positionLevel: 'India',
                    options: [{ pay: 90000, profit: 510000, credit: 600000, visibleFor: ['India'] }]
                },
                {
                    positionLevel: 'Zone',
                    options: [{ pay: 90000, profit: 510000, credit: 600000, visibleFor: ['Zone'] }]
                },
                {
                    positionLevel: 'State',
                    options: [{ pay: 90000, profit: 510000, credit: 600000, visibleFor: ['State'] }]
                },
                {
                    positionLevel: 'Division',
                    options: [
                        { pay: 90000, profit: 510000, credit: 600000, visibleFor: ['Division'] },
                        { pay: 75000, profit: 425000, credit: 500000, visibleFor: ['Division'] }
                    ]
                },
                {
                    positionLevel: 'District',
                    options: [
                        { pay: 90000, profit: 510000, credit: 600000, visibleFor: ['District'] },
                        { pay: 75000, profit: 425000, credit: 500000, visibleFor: ['District'] },
                        { pay: 60000, profit: 340000, credit: 400000, visibleFor: ['District'] }
                    ]
                },
                {
                    positionLevel: 'Tehsil',
                    options: [
                        { pay: 90000, profit: 510000, credit: 600000, visibleFor: ['Tehsil'] },
                        { pay: 75000, profit: 425000, credit: 500000, visibleFor: ['Tehsil'] },
                        { pay: 60000, profit: 340000, credit: 400000, visibleFor: ['Tehsil'] },
                        { pay: 45000, profit: 255000, credit: 300000, visibleFor: ['Tehsil'] }
                    ]
                },
                {
                    positionLevel: 'Pincode',
                    options: [
                        { pay: 90000, profit: 510000, credit: 600000, visibleFor: ['Pincode'] },
                        { pay: 75000, profit: 425000, credit: 500000, visibleFor: ['Pincode'] },
                        { pay: 60000, profit: 340000, credit: 400000, visibleFor: ['Pincode'] },
                        { pay: 45000, profit: 255000, credit: 300000, visibleFor: ['Pincode'] },
                        { pay: 30000, profit: 170000, credit: 200000, visibleFor: ['Pincode'] }
                    ]
                },
                {
                    positionLevel: 'Village',
                    options: [
                        { pay: 90000, profit: 510000, credit: 600000, visibleFor: ['Village'] },
                        { pay: 75000, profit: 425000, credit: 500000, visibleFor: ['Village'] },
                        { pay: 60000, profit: 340000, credit: 400000, visibleFor: ['Village'] },
                        { pay: 45000, profit: 255000, credit: 300000, visibleFor: ['Village'] },
                        { pay: 30000, profit: 170000, credit: 200000, visibleFor: ['Village'] },
                        { pay: 15000, profit: 85000, credit: 100000, visibleFor: ['Village'] }
                    ]
                }
            ];
            
            await PaymentPlan.insertMany(defaultPlans);
            console.log('✅ Default payment plans initialized in database');
        }
    } catch (error) {
        console.error('❌ Error initializing payment plans:', error);
    }
}

// Call initialization when module loads
initializePaymentPlans();

// Get payment plans from MongoDB
router.get('/payment-plans', async (req, res) => {
  try {
    const plans = await PaymentPlan.find();
    
    // Convert to the format expected by frontend
    const paymentPlans = {};
    plans.forEach(plan => {
      paymentPlans[plan.positionLevel] = plan.options;
    });
    
    res.json({ success: true, paymentPlans });
  } catch (error) {
    console.error('❌ Error fetching payment plans:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update payment plans in MongoDB
router.post('/payment-plans', async (req, res) => {
  try {
    const { paymentPlans: newPlans } = req.body;
    
    if (!newPlans) {
      return res.status(400).json({ error: 'Payment plans data required' });
    }
    
    // Handle both formats: array (new) or object (old)
    let plansToInsert = [];
    
    if (Array.isArray(newPlans)) {
      // New format: array of plans with visibleFor property
      console.log('📋 Received new format (array):', newPlans);
      
      // Convert new format to old format for storage
      const allLevels = ['India', 'Zone', 'State', 'Division', 'District', 'Tehsil', 'Pincode', 'Village'];
      const plansByLevel = {};
      
      // Initialize empty arrays for each level
      allLevels.forEach(level => {
        plansByLevel[level] = [];
      });
      
      // Distribute plans to appropriate levels based on visibleFor
      newPlans.forEach(plan => {
        const visibleFor = plan.visibleFor || allLevels;
        visibleFor.forEach(level => {
          plansByLevel[level].push({
            pay: plan.pay,
            profit: plan.profit,
            credit: plan.credit,
            visibleFor: [level]
          });
        });
      });
      
      // Create documents for storage
      for (const [positionLevel, options] of Object.entries(plansByLevel)) {
        plansToInsert.push({
          positionLevel,
          options
        });
      }
    } else {
      // Old format: object with position levels as keys
      console.log('📋 Received old format (object)');
      for (const [positionLevel, options] of Object.entries(newPlans)) {
        plansToInsert.push({
          positionLevel,
          options
        });
      }
    }
    
    // Delete all existing plans
    await PaymentPlan.deleteMany({});
    
    // Insert new plans
    await PaymentPlan.insertMany(plansToInsert);
    
    console.log('💰 Payment plans updated in database');
    
    res.json({ success: true, message: 'Payment plans updated successfully', paymentPlans: newPlans });
  } catch (error) {
    console.error('❌ Error updating payment plans:', error);
    console.error('Error details:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

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
      .populate('userId')
      .sort({ appliedDate: -1 });
    
    // Update photo from User model if available
    const updatedApplications = pendingApplications.map(app => {
      const appObj = app.toObject();
      if (app.userId && app.userId.photo) {
        appObj.applicantInfo.photo = app.userId.photo;
      }
      return appObj;
    });
    
    res.json(updatedApplications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all approved applications
router.get('/applications/approved', async (req, res) => {
  try {
    const approvedApplications = await Application.find({ status: 'approved' })
      .populate('userId')
      .sort({ approvedDate: -1 });
    
    // Update photo from User model if available
    const updatedApplications = approvedApplications.map(app => {
      const appObj = app.toObject();
      if (app.userId && app.userId.photo) {
        appObj.applicantInfo.photo = app.userId.photo;
      }
      return appObj;
    });
    
    res.json(updatedApplications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all rejected applications
router.get('/applications/rejected', async (req, res) => {
  try {
    const rejectedApplications = await Application.find({ status: 'rejected' })
      .populate('userId')
      .sort({ appliedDate: -1 });
    
    // Update photo from User model if available
    const updatedApplications = rejectedApplications.map(app => {
      const appObj = app.toObject();
      if (app.userId && app.userId.photo) {
        appObj.applicantInfo.photo = app.userId.photo;
      }
      return appObj;
    });
    
    res.json(updatedApplications);
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
        pincode: application.applicantInfo.pincode,
        personCode: personCode,
        loginId: application.applicantInfo.phone, // Login ID is phone number
        password: defaultPassword, // First 4 letters of name in CAPITAL (e.g., "RAJE" for Rajesh)
        photo: application.applicantInfo.photo,
        introducedBy: application.introducedBy,
        positionId: application.positionId,
        appliedDate: application.appliedDate,
        approvedDate: new Date(),
        credits: 0, // No default credits, admin will manually assign
        hasReceivedInitialCredits: false, // No initial credits
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
        initialCredits: 0
      });
    }
    // Admin will manually assign credits using the Give Credits feature
    
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
    const User = require('../models/User');
    
    // Don't populate positionId since it's a string, not a reference
    const application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    console.log(`🗑️ Admin deleting application: ${application._id}`);
    console.log(`📍 Position ID: ${application.positionId}`);
    console.log(`👤 Applicant: ${application.applicantInfo.name}`);
    console.log(`📞 Phone: ${application.applicantInfo.phone}`);

    // IMPORTANT: Decrement introducer's count if this was a referred application
    if (application.introducedBy && application.introducedBy !== 'Self' && application.status === 'approved') {
      const introducer = await User.findOne({ phone: application.introducedBy });
      if (introducer) {
        introducer.introducedCount = Math.max(0, (introducer.introducedCount || 0) - 1);
        await introducer.save();
        console.log(`✅ Decremented introducer ${introducer.name} (${introducer.phone}) count to ${introducer.introducedCount}`);
      } else {
        console.log(`⚠️ Introducer not found with phone: ${application.introducedBy}`);
      }
    }

    // IMPORTANT: Also delete the associated user account if it exists
    const associatedUser = await User.findOne({ phone: application.applicantInfo.phone });
    if (associatedUser) {
      await User.findByIdAndDelete(associatedUser._id);
      console.log(`✅ Associated user account deleted: ${associatedUser.name} (${associatedUser.phone})`);
    } else {
      console.log(`ℹ️ No associated user account found for phone: ${application.applicantInfo.phone}`);
    }

    // Delete the application from database
    await Application.findByIdAndDelete(req.params.id);
    console.log(`✅ Application ${application._id} deleted from database`);
    
    res.json({
      message: associatedUser 
        ? 'Application and associated user account deleted successfully from database.'
        : 'Application deleted successfully from database.',
      deletedApplication: {
        id: application._id,
        name: application.applicantInfo.name,
        phone: application.applicantInfo.phone,
        positionId: application.positionId
      },
      deletedUser: associatedUser ? {
        id: associatedUser._id,
        name: associatedUser.name,
        phone: associatedUser.phone
      } : null
    });
  } catch (error) {
    console.error('❌ Error deleting application:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete user account directly (without deleting application)
router.delete('/users/:id/delete', async (req, res) => {
  try {
    const User = require('../models/User');
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`🗑️ Admin deleting user account: ${user._id}`);
    console.log(`👤 Name: ${user.name}`);
    console.log(`📞 Phone: ${user.phone}`);
    console.log(`💰 Credits: ${user.credits}`);

    // Delete the user from database
    await User.findByIdAndDelete(req.params.id);
    console.log(`✅ User ${user._id} deleted from database`);
    
    res.json({
      message: 'User account deleted successfully from database.',
      deletedUser: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        credits: user.credits,
        personCode: user.personCode
      }
    });
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single application by ID
router.get('/applications/:id', async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({ application });
  } catch (error) {
    console.error('❌ Error fetching application:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify payment screenshot
router.post('/applications/:id/verify-payment', async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (!application.payment || !application.payment.paymentScreenshot) {
      return res.status(400).json({ error: 'No payment screenshot found' });
    }

    // Update payment status to verified
    application.payment.status = 'verified';
    application.payment.verifiedAt = new Date();
    application.payment.verifiedBy = 'Admin'; // You can pass admin info from auth token
    
    await application.save();
    
    console.log(`✅ Payment verified for application: ${application._id}`);

    res.json({
      message: 'Payment verified successfully',
      application
    });
  } catch (error) {
    console.error('❌ Error verifying payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reject payment screenshot
router.post('/applications/:id/reject-payment', async (req, res) => {
  try {
    const { reason } = req.body;
    const application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (!application.payment || !application.payment.paymentScreenshot) {
      return res.status(400).json({ error: 'No payment screenshot found' });
    }

    // Update payment status to rejected
    application.payment.status = 'rejected';
    application.adminNotes = reason || 'Payment rejected';
    
    await application.save();
    
    console.log(`❌ Payment rejected for application: ${application._id}. Reason: ${reason}`);

    res.json({
      message: 'Payment rejected',
      application
    });
  } catch (error) {
    console.error('❌ Error rejecting payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cleanup utility: Delete all users that don't have approved/pending applications
router.post('/cleanup-orphaned-users', async (req, res) => {
  try {
    const User = require('../models/User');
    
    console.log('🧹 Starting orphaned users cleanup...');
    
    // Get all users - optimized with select
    const allUsers = await User.find({})
      .select('_id phone name')
      .lean()
      .maxTimeMS(10000); // 10 second timeout
    console.log(`📊 Total users in database: ${allUsers.length}`);
    
    // Get all phone numbers from approved or pending applications - optimized
    const activeApplications = await Application.find({ 
      status: { $in: ['pending', 'approved'] }
    })
      .select('applicantInfo.phone')
      .lean()
      .maxTimeMS(10000);
    const activePhones = new Set(activeApplications.map(app => app.applicantInfo.phone));
    console.log(`📋 Active applications: ${activeApplications.length}`);
    
    // Find orphaned users (users without active applications)
    const orphanedUsers = allUsers.filter(user => !activePhones.has(user.phone));
    console.log(`🗑️ Orphaned users found: ${orphanedUsers.length}`);
    
    if (orphanedUsers.length === 0) {
      return res.json({
        message: 'No orphaned users found. Database is clean!',
        totalUsers: allUsers.length,
        activeUsers: allUsers.length,
        deletedUsers: []
      });
    }
    
    // Delete orphaned users
    const deletedUsers = [];
    for (const user of orphanedUsers) {
      await User.findByIdAndDelete(user._id);
      deletedUsers.push({
        id: user._id,
        name: user.name,
        phone: user.phone,
        credits: user.credits
      });
      console.log(`✅ Deleted orphaned user: ${user.name} (${user.phone})`);
    }
    
    console.log(`🧹 Cleanup complete! Deleted ${deletedUsers.length} orphaned users`);
    
    res.json({
      message: `Successfully cleaned up ${deletedUsers.length} orphaned user(s) from database.`,
      totalUsersBefore: allUsers.length,
      activeUsers: allUsers.length - deletedUsers.length,
      deletedCount: deletedUsers.length,
      deletedUsers: deletedUsers
    });
  } catch (error) {
    console.error('❌ Error cleaning up orphaned users:', error);
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
          pincode: application.applicantInfo.pincode,
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

// GET USERS STATS - for admin dashboard/credits page (includes BOTH Channel Partner and App users)
router.get('/users-stats', async (req, res) => {
  try {
    const User = require('../models/User');
    const mongoose = require('mongoose');
    
    console.log('📊 Fetching stats from BOTH databases...');
    
    // 1. Channel Partner users
    const cpUserCount = await User.countDocuments();
    const cpUsers = await User.find({}).select('credits').lean();
    const cpTotalCredits = cpUsers.reduce((sum, user) => sum + (user.credits || 0), 0);
    
    console.log(`📋 Channel Partner: ${cpUserCount} users, ${cpTotalCredits} credits`);
    
    // 2. Instantlly Cards App users
    let appUserCount = 0;
    let appTotalCredits = 0;
    
    try {
      const instantllyDB = mongoose.connection.useDb('instantlly');
      
      // Use direct MongoDB queries
      appUserCount = await instantllyDB.db.collection('users').countDocuments();
      const appUsers = await instantllyDB.db.collection('users')
        .find({})
        .project({ credits: 1 })
        .toArray();
      appTotalCredits = appUsers.reduce((sum, user) => sum + (user.credits || 0), 0);
      
      console.log(`📱 App Users: ${appUserCount} users, ${appTotalCredits} credits`);
    } catch (appError) {
      console.error('⚠️ Error fetching app stats:', appError.message);
    }
    
    // Combined stats
    const totalUsers = cpUserCount + appUserCount;
    const totalCredits = cpTotalCredits + appTotalCredits;
    
    console.log(`✅ Total: ${totalUsers} users, ${totalCredits} credits`);
    
    res.json({
      success: true,
      totalUsers,
      totalCredits,
      breakdown: {
        channelPartner: {
          users: cpUserCount,
          credits: cpTotalCredits
        },
        appUsers: {
          users: appUserCount,
          credits: appTotalCredits
        }
      }
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
        
        // Use direct MongoDB query
        const ObjectId = mongoose.Types.ObjectId;
        user = await instantllyDB.db.collection('users').findOne(
          { _id: new ObjectId(userId) },
          { 
            projection: { 
              name: 1, 
              phone: 1, 
              email: 1, 
              profilePicture: 1, 
              credits: 1, 
              referralCode: 1, 
              creditsExpiryDate: 1 
            } 
          }
        );
        
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

// Health check to verify cross-database connectivity
router.get('/health-check', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    console.log('=== HEALTH CHECK START ===');
    console.log('Main connection:', mongoose.connection.name);
    console.log('Main connection state:', mongoose.connection.readyState);
    
    // List all databases accessible
    let allDatabases = [];
    try {
      const admin = mongoose.connection.db.admin();
      const dbList = await admin.listDatabases();
      allDatabases = dbList.databases.map(db => db.name);
      console.log('All accessible databases:', allDatabases);
    } catch (err) {
      console.log('Could not list databases:', err.message);
    }
    
    // Check instantlly database connection
    const instantllyDB = mongoose.connection.useDb('instantlly');
    console.log('Instantlly DB connection created');
    
    // Try to list collections
    const collections = await instantllyDB.db.listCollections().toArray();
    console.log('Collections in instantlly:', collections.map(c => c.name));
    
    // Try to count users
    const userCount = await instantllyDB.db.collection('users').countDocuments();
    console.log('Total users in instantlly.users:', userCount);
    
    // Try to find a sample user with phone starting with 88
    const sampleUser = await instantllyDB.db.collection('users').findOne({ phone: /^(\+91)?88/ });
    console.log('Sample 88 user found:', sampleUser ? 'YES' : 'NO');
    if (sampleUser) {
      console.log('Sample user phone:', sampleUser.phone);
      console.log('Sample user name:', sampleUser.name);
    }
    
    // Check if there's a database named "instantllycards"
    let cardsDbUserCount = 0;
    try {
      const cardsDB = mongoose.connection.useDb('instantllycards');
      cardsDbUserCount = await cardsDB.db.collection('users').countDocuments();
      console.log('Users in instantllycards.users:', cardsDbUserCount);
    } catch (err) {
      console.log('Could not check instantllycards:', err.message);
    }
    
    console.log('=== HEALTH CHECK END ===');
    
    res.json({
      success: true,
      mainDb: mongoose.connection.name,
      mainDbState: mongoose.connection.readyState,
      allDatabases: allDatabases,
      instantllyCollections: collections.map(c => c.name),
      userCount: userCount,
      hasSampleUser: !!sampleUser,
      sampleUserPhone: sampleUser?.phone,
      sampleUserName: sampleUser?.name,
      cardsDbUserCount: cardsDbUserCount
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
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

    // Escape special regex characters in the phone prefix
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedPrefix = escapeRegex(phonePrefix);
    
    // Create search patterns for both with and without +91 prefix
    // If user types "88", search for both "88" and "+9188"
    const searchPatterns = [escapedPrefix];
    if (!phonePrefix.startsWith('+')) {
      searchPatterns.push(`\\+91${escapedPrefix}`);
    }
    const searchRegex = searchPatterns.map(p => `^${p}`).join('|');
    
    console.log('🔍 Search regex pattern:', searchRegex);

    // 1. Search Channel Partner users (current database)
    const User = require('../models/User');
    const channelPartnerUsers = await User.find({
      phone: { $regex: searchRegex, $options: 'i' }
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
      console.log('🔗 Current connection:', mongoose.connection.name);
      console.log('🔗 Connection state:', mongoose.connection.readyState); // 1 = connected
      
      const instantllyDB = mongoose.connection.useDb('instantlly');
      console.log('✅ Switched to instantlly database');
      
      // First, check if users collection exists
      const collections = await instantllyDB.db.listCollections().toArray();
      console.log('📚 Collections in instantlly:', collections.map(c => c.name).join(', '));
      
      // Count total users
      const totalUsers = await instantllyDB.db.collection('users').countDocuments();
      console.log('👥 Total users in instantlly database:', totalUsers);
      
      // Use direct MongoDB queries instead of Mongoose models to avoid model name conflicts
      console.log('🔍 Searching app users with regex:', searchRegex);
      console.log('🔍 Search patterns:', searchPatterns);

      const appUsers = await instantllyDB.db.collection('users')
        .find({
          phone: { $regex: searchRegex, $options: 'i' }
        })
        .project({
          name: 1,
          phone: 1,
          email: 1,
          profilePicture: 1,
          credits: 1,
          referralCode: 1
        })
        .limit(20)
        .toArray();

      console.log(`📱 Found ${appUsers.length} Instantlly Cards App users`);
      if (appUsers.length > 0) {
        console.log('📱 Sample app user:', JSON.stringify(appUsers[0], null, 2));
      }

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
      console.error('  Full error:', JSON.stringify(appError, null, 2));
      // Continue with just channel partner users if app DB fails
    }

    console.log(`✅ Total found: ${allUsers.length} users (${channelPartnerUsers.length} CP + ${allUsers.length - channelPartnerUsers.length} App)`);
    console.log(`📊 Returning users:`, allUsers.map(u => ({ name: u.name, phone: u.phone, type: u.userType })));

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
      
      // Use direct MongoDB query to avoid model name conflicts
      const ObjectId = mongoose.Types.ObjectId;
      receiver = await instantllyDB.db.collection('users').findOne({ _id: new ObjectId(toUserId) });
      
      if (!receiver) {
        return res.status(404).json({ error: 'App user not found' });
      }

      // Add credits to app user
      const newCredits = (receiver.credits || 0) + transferAmount;
      
      // Extend credits expiry if needed (1 month from now)
      const newExpiryDate = !receiver.creditsExpiryDate || new Date(receiver.creditsExpiryDate) < new Date()
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        : receiver.creditsExpiryDate;

      // Update using direct MongoDB query
      await instantllyDB.db.collection('users').updateOne(
        { _id: new ObjectId(toUserId) },
        { 
          $set: { 
            credits: newCredits,
            creditsExpiryDate: newExpiryDate
          } 
        }
      );
      
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
    let { newPositionId } = req.body;

    console.log(`🔄 Transferring application ${id} to position:`, newPositionId);

    // Validate inputs
    if (!newPositionId) {
      console.error('❌ newPositionId is missing');
      return res.status(400).json({ message: "newPositionId is required" });
    }

    // Normalize position ID - ensure it HAS pos_ prefix (channel partner backend expects it)
    if (!newPositionId.startsWith('pos_')) {
      newPositionId = `pos_${newPositionId}`;
      console.log(`🔧 Added pos_ prefix: ${newPositionId}`);
    }

    // Find the application
    const application = await Application.findById(id);
    
    if (!application) {
      console.error(`❌ Application not found: ${id}`);
      return res.status(404).json({ message: "Application not found" });
    }

    // Normalize old position ID
    let oldPositionId = application.positionId;
    
    console.log(`📍 Old position: ${oldPositionId}`);
    console.log(`📍 New position: ${newPositionId}`);

    // Check if new position already has an applicant
    // Check with the normalized format (with pos_ prefix)
    const existingApplication = await Application.findOne({
      positionId: newPositionId,
      status: { $in: ['pending', 'approved'] },
      _id: { $ne: id } // Exclude current application
    });

    if (existingApplication) {
      console.error(`❌ Position already occupied by: ${existingApplication.applicantInfo.name}`);
      return res.status(400).json({ 
        message: "This position is already occupied",
        occupiedBy: existingApplication.applicantInfo.name
      });
    }

    // Parse position ID to extract location hierarchy
    // Format: pos_village-head_india_west-zone_maharashtra_konkan_thane_thane_401107_ghodbander-b.o
    // Format: pos_pincode-head_india_west-zone_maharashtra_konkan_thane_thane_401107
    const parseLocationFromPositionId = (positionId) => {
      const location = {};
      
      // Remove pos_ prefix and split by underscore
      const cleaned = positionId.replace(/^pos_/, '');
      const parts = cleaned.split('_');
      
      console.log(`🔍 Parsing position ID parts:`, parts);
      console.log(`   Total parts: ${parts.length}`);
      
      // First part is the position type (e.g., pincode-head, village-head), skip it
      // Remaining parts are the location hierarchy
      if (parts.length > 1) {
        const locationParts = parts.slice(1); // Skip position type
        
        // Map parts to hierarchy levels
        // Order: country, zone, state, division, district, tehsil, pincode, village
        if (locationParts[0]) {
          location.country = locationParts[0].replace(/-/g, ' ');
          console.log(`   Country: ${location.country}`);
        }
        if (locationParts[1]) {
          location.zone = locationParts[1].replace(/-/g, ' ');
          console.log(`   Zone: ${location.zone}`);
        }
        if (locationParts[2]) {
          location.state = locationParts[2].replace(/-/g, ' ');
          console.log(`   State: ${location.state}`);
        }
        if (locationParts[3]) {
          location.division = locationParts[3].replace(/-/g, ' ');
          console.log(`   Division: ${location.division}`);
        }
        if (locationParts[4]) {
          location.district = locationParts[4].replace(/-/g, ' ');
          console.log(`   District: ${location.district}`);
        }
        if (locationParts[5]) {
          location.tehsil = locationParts[5].replace(/-/g, ' ');
          console.log(`   Tehsil: ${location.tehsil}`);
        }
        if (locationParts[6]) {
          location.pincode = locationParts[6].replace(/-/g, ' ');
          console.log(`   Pincode: ${location.pincode}`);
        }
        if (locationParts[7]) {
          location.village = locationParts[7].replace(/-/g, ' ');
          console.log(`   Village: ${location.village}`);
        }
      }
      
      console.log(`📍 Parsed location:`, JSON.stringify(location));
      return location;
    };

    // Parse new location from position ID
    const newLocation = parseLocationFromPositionId(newPositionId);

    // Update application's position AND location (store WITH pos_ prefix)
    application.positionId = newPositionId;
    application.location = newLocation;
    await application.save();
    console.log(`✅ Application position and location updated`);

    // If application is approved, also update the User record
    if (application.status === 'approved' && application.userId) {
      const User = require('../models/User');
      const user = await User.findById(application.userId);
      
      if (user) {
        user.positionId = newPositionId;
        user.location = newLocation; // Also update location for ID card hierarchy
        await user.save();
        console.log(`✅ Updated user position and location: ${user.name} -> ${newPositionId}`);
        console.log(`   User location:`, JSON.stringify(user.location));
      } else {
        console.warn(`⚠️ User not found for ID: ${application.userId}`);
      }
    }

    console.log(`✅ Transferred ${application.applicantInfo.name} from ${oldPositionId} to ${newPositionId}`);
    console.log(`   New location:`, newLocation);

    res.json({
      success: true,
      message: "Position transferred successfully",
      application,
      oldPosition: oldPositionId,
      newPosition: newPositionId
    });
  } catch (error) {
    console.error('❌ Transfer position error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      message: "Server error", 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /admin/ads
 * Proxy endpoint to fetch ads from Instantlly Cards backend
 * This avoids CORS issues by making server-to-server requests
 */
router.get('/ads', async (req, res) => {
  try {
    const fetch = require('node-fetch');
    const { approvalStatus } = req.query;
    
    console.log('🔄 Proxying ads request - approvalStatus:', approvalStatus);
    
    const APP_BACKEND_URL = process.env.APP_BACKEND_URL || process.env.MAIN_BACKEND_URL || 'https://api.instantllycards.com';
    const url = `${APP_BACKEND_URL}/api/ads${approvalStatus ? `?approvalStatus=${approvalStatus}` : ''}`;
    
    console.log('🌐 Fetching from:', url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Fetched ${data.ads?.length || 0} ads`);
      res.json(data);
    } else {
      console.error('❌ Failed to fetch ads:', response.status, data);
      res.status(response.status).json(data);
    }
  } catch (error) {
    console.error('❌ Ads proxy error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch ads',
      error: error.message 
    });
  }
});

/**
 * PUT /admin/ads/:id
 * Proxy endpoint to update ad status (approve/reject)
 */
router.put('/ads/:id', async (req, res) => {
  try {
    const fetch = require('node-fetch');
    const { id } = req.params;
    const { approvalStatus, adminComments } = req.body;
    
    console.log(`🔄 Proxying ad update - ID: ${id}, Status: ${approvalStatus}`);
    
    const APP_BACKEND_URL = process.env.APP_BACKEND_URL || process.env.MAIN_BACKEND_URL || 'https://api.instantllycards.com';
    const url = `${APP_BACKEND_URL}/api/ads/${id}`;

    // Use a server-side admin token when configured, otherwise forward caller Authorization
    const forwardAuth = process.env.APP_BACKEND_ADMIN_TOKEN ? `Bearer ${process.env.APP_BACKEND_ADMIN_TOKEN}` : req.headers.authorization;

    const headers = { 'Content-Type': 'application/json' };
    if (forwardAuth) headers['Authorization'] = forwardAuth;

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ approvalStatus, adminComments })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Updated ad ${id} to ${approvalStatus}`);
      res.json(data);
    } else {
      console.error('❌ Failed to update ad:', response.status, data);
      res.status(response.status).json(data);
    }
  } catch (error) {
    console.error('❌ Ad update proxy error:', error);
    res.status(500).json({ 
      message: 'Failed to update ad',
      error: error.message 
    });
  }
});

/**
 * DELETE /admin/ads/:id
 * Proxy endpoint to delete an ad
 */
router.delete('/ads/:id', async (req, res) => {
  try {
    const fetch = require('node-fetch');
    const { id } = req.params;
    
    console.log(`🔄 Proxying ad deletion - ID: ${id}`);
    
    const APP_BACKEND_URL = process.env.APP_BACKEND_URL || process.env.MAIN_BACKEND_URL || 'https://api.instantllycards.com';
    const url = `${APP_BACKEND_URL}/api/ads/${id}`;

    const forwardAuth = process.env.APP_BACKEND_ADMIN_TOKEN ? `Bearer ${process.env.APP_BACKEND_ADMIN_TOKEN}` : req.headers.authorization;
    const headers = {};
    if (forwardAuth) headers['Authorization'] = forwardAuth;

    const response = await fetch(url, { method: 'DELETE', headers });
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Deleted ad ${id}`);
      res.json(data);
    } else {
      console.error('❌ Failed to delete ad:', response.status, data);
      res.status(response.status).json(data);
    }
  } catch (error) {
    console.error('❌ Ad deletion proxy error:', error);
    res.status(500).json({ 
      message: 'Failed to delete ad',
      error: error.message 
    });
  }
});

/**
 * POST /admin/ads/:id/approve
 * Proxy endpoint to approve an ad
 */
router.post('/ads/:id/approve', async (req, res) => {
  try {
    const fetch = require('node-fetch');
    const { id } = req.params;
    const { priority } = req.body;
    const authHeader = req.headers.authorization;

    console.log(`🔄 Proxying ad approval - ID: ${id}, Priority: ${priority}`);

    // Prefer a server-side admin token if configured, otherwise forward caller token.
    const forwardAuth = process.env.APP_BACKEND_ADMIN_TOKEN ? `Bearer ${process.env.APP_BACKEND_ADMIN_TOKEN}` : authHeader;
    console.log('🔐 Forwarding Authorization:', forwardAuth ? 'YES' : 'NO');

    if (!forwardAuth) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token missing'
      });
    }

    const APP_BACKEND_URL = process.env.APP_BACKEND_URL || process.env.MAIN_BACKEND_URL || 'https://api.instantllycards.com';
    const url = `${APP_BACKEND_URL}/api/ads/${id}/approve`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': forwardAuth },
      body: JSON.stringify({ priority })
    });
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('❌ Non-JSON response from main backend:', text);
      return res.status(500).json({
        message: 'Main backend did not return JSON',
        raw: text
      });
    }
    
    if (response.ok) {
      console.log(`✅ Approved ad ${id}`);
      res.json(data);
    } else {
      console.error('❌ Failed to approve ad:', response.status, data);
      res.status(response.status).json(data);
    }
  } catch (error) {
    console.error('❌ Ad approval proxy error:', error);
    res.status(500).json({ 
      message: 'Failed to approve ad',
      error: error.message 
    });
  }
});

/**
 * POST /admin/ads/:id/reject
 * Proxy endpoint to reject an ad
 */
router.post('/ads/:id/reject', async (req, res) => {
  try {
    const fetch = require('node-fetch');
    const { id } = req.params;
    const { reason } = req.body;
    
    console.log(`🔄 Proxying ad rejection - ID: ${id}`);
    
    const APP_BACKEND_URL = process.env.APP_BACKEND_URL || process.env.MAIN_BACKEND_URL || 'https://api.instantllycards.com';
    const url = `${APP_BACKEND_URL}/api/ads/${id}/reject`;

    const forwardAuth = process.env.APP_BACKEND_ADMIN_TOKEN ? `Bearer ${process.env.APP_BACKEND_ADMIN_TOKEN}` : req.headers.authorization;
    const headers = { 'Content-Type': 'application/json' };
    if (forwardAuth) headers['Authorization'] = forwardAuth;

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Rejected ad ${id}`);
      res.json(data);
    } else {
      console.error('❌ Failed to reject ad:', response.status, data);
      res.status(response.status).json(data);
    }
  } catch (error) {
    console.error('❌ Ad rejection proxy error:', error);
    res.status(500).json({ 
      message: 'Failed to reject ad',
      error: error.message 
    });
  }
});

/**
 * GET /admin/ads/:id
 * Proxy endpoint to get a single ad details
 */
router.get('/ads/:id', async (req, res) => {
  try {
    const fetch = require('node-fetch');
    const { id } = req.params;
    
    console.log(`🔄 Proxying get ad details - ID: ${id}`);
    
    const APP_BACKEND_URL = process.env.APP_BACKEND_URL || process.env.MAIN_BACKEND_URL || 'https://api.instantllycards.com';
    const url = `${APP_BACKEND_URL}/api/ads/${id}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Fetched ad ${id} details`);
      res.json(data);
    } else {
      console.error('❌ Failed to fetch ad details:', response.status, data);
      res.status(response.status).json(data);
    }
  } catch (error) {
    console.error('❌ Get ad details proxy error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch ad details',
      error: error.message 
    });
  }
});

/**
 * GET /admin/ads/image/:id/:type
 * Proxy endpoint to fetch ad images from Instantlly Cards backend
 * This avoids CORS and serves images directly
 */
router.get('/ads/image/:id/:type', async (req, res) => {
  try {
    const fetch = require('node-fetch');
    const { id, type } = req.params;
    
    console.log(`🖼️  Proxying image request - Ad: ${id}, Type: ${type}`);
    
    const APP_BACKEND_URL = process.env.APP_BACKEND_URL || process.env.MAIN_BACKEND_URL || 'https://api.instantllycards.com';
    const url = `${APP_BACKEND_URL}/api/ads/image/${id}/${type}`;
    
    console.log('🌐 Fetching image from:', url);
    
    const response = await fetch(url);
    
    if (response.ok) {
      // Get the content type from the response
      const contentType = response.headers.get('content-type');
      
      // Set appropriate headers
      res.setHeader('Content-Type', contentType || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
      
      // Pipe the image data directly to the response
      response.body.pipe(res);
      
      console.log(`✅ Served image ${id}/${type}`);
    } else {
      console.error('❌ Failed to fetch image:', response.status);
      res.status(response.status).json({ 
        message: 'Image not found',
        adId: id,
        type: type
      });
    }
  } catch (error) {
    console.error('❌ Image proxy error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch image',
      error: error.message 
    });
  }
});

// ====================================
// ADMIN PASSWORD MANAGEMENT
// ====================================

// Get all users with their login credentials (for admin password management)
router.get('/users-with-credentials', async (req, res) => {
  try {
    const User = require('../models/User');
    
    // Get all users with selected fields including login details
    const users = await User.find({})
      .select('name phone email loginId personCode credits isVerified createdAt')
      .lean()
      .sort({ createdAt: -1 });
    
    // Note: We don't send actual passwords for security
    // Admin will update passwords which will be hashed automatically
    
    res.json({
      success: true,
      users: users
    });
  } catch (error) {
    console.error('[ADMIN] Error fetching users:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Update user password by admin
router.put('/users/:userId/update-password', async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;
    
    console.log(`[ADMIN] Password update request for user: ${userId}`);
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ 
        success: false,
        error: 'Password must be at least 6 characters long' 
      });
    }
    
    const User = require('../models/User');
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();
    
    console.log(`[ADMIN] ✅ Password updated for user: ${user.name} (${user.phone})`);
    
    res.json({ 
      success: true,
      message: `Password updated successfully for ${user.name}`,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        loginId: user.loginId
      }
    });
  } catch (error) {
    console.error('[ADMIN] Error updating password:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Get user details including login info (for password reset modal)
router.get('/users/:userId/details', async (req, res) => {
  try {
    const { userId } = req.params;
    const User = require('../models/User');
    
    const user = await User.findById(userId)
      .select('name phone email loginId personCode credits isVerified createdAt')
      .lean();
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    console.error('[ADMIN] Error fetching user details:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Admin route to manually give credits to a user (NEW SYSTEM: Cash + Extra Credits)
router.post('/users/:userId/give-credits', async (req, res) => {
  try {
    const { userId } = req.params;
    const { amountPaid, creditsToGive, description } = req.body;

    console.log('💰 Give Credits Request:', { userId, amountPaid, creditsToGive, description });

    // Validate inputs
    if (!creditsToGive || creditsToGive <= 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Credits to give must be greater than 0.' 
      });
    }

    if (!amountPaid || amountPaid < 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Amount paid must be 0 or greater.' 
      });
    }

    // Find user
    const User = require('../models/User');
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    // Calculate credit split
    // Cash credits = amount paid (e.g., 25,000)
    // Extra credits = remaining credits (e.g., 2,00,000 - 25,000 = 1,75,000)
    const cashCreditsToAdd = parseInt(amountPaid);
    const extraCreditsToAdd = parseInt(creditsToGive) - cashCreditsToAdd;

    console.log('📊 Credit Split:', {
      totalCredits: creditsToGive,
      cashCredits: cashCreditsToAdd,
      extraCredits: extraCreditsToAdd
    });

    if (extraCreditsToAdd < 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Credits to give must be greater than or equal to amount paid' 
      });
    }

    // Update user credits
    const oldTotalCredits = user.credits || 0;
    const oldCashCredits = user.cashCredits || 0;
    const oldExtraCredits = user.extraCredits || 0;

    // Add cash credits
    user.cashCredits = oldCashCredits + cashCreditsToAdd;
    
    // Add extra credits
    user.extraCredits = oldExtraCredits + extraCreditsToAdd;
    
    // Update total
    user.credits = user.cashCredits + user.extraCredits;

    // Initialize arrays if they don't exist
    if (!user.cashHistory) user.cashHistory = [];
    if (!user.extraHistory) user.extraHistory = [];
    if (!user.creditsHistory) user.creditsHistory = [];

    // Add to cash history if cash credits were added
    if (cashCreditsToAdd > 0) {
      user.cashHistory.push({
        type: 'credit',
        amount: cashCreditsToAdd,
        balance: user.cashCredits,
        description: description || `Admin added ₹${amountPaid.toLocaleString('en-IN')} (${cashCreditsToAdd.toLocaleString('en-IN')} cash credits)`,
        date: new Date()
      });
    }

    // Add to extra history if extra credits were added
    if (extraCreditsToAdd > 0) {
      user.extraHistory.push({
        type: 'credit',
        amount: extraCreditsToAdd,
        balance: user.extraCredits,
        description: description || `Admin added ${extraCreditsToAdd.toLocaleString('en-IN')} bonus credits`,
        date: new Date()
      });
    }

    // Add to legacy credits history (for backward compatibility)
    user.creditsHistory.push({
      type: 'bonus',
      amount: parseInt(creditsToGive),
      description: description || `Admin granted ${creditsToGive.toLocaleString('en-IN')} credits (₹${amountPaid.toLocaleString('en-IN')} paid + ${extraCreditsToAdd.toLocaleString('en-IN')} bonus)`,
      date: new Date()
    });
    
    await user.save();
    
    // Also update the application document to show in the table
    const Application = require('../models/Application');
    const application = await Application.findOne({ 'applicantInfo.phone': user.phone, status: 'approved' });
    
    if (application) {
      application.cashCreditsGiven = cashCreditsToAdd;
      application.extraCreditsGiven = extraCreditsToAdd;
      await application.save();
      console.log(`✅ Application updated with credit details for ${user.name}`);
    } else {
      console.log(`⚠️ No approved application found for ${user.name} (${user.phone})`);
    }
    
    // =============================================================================
    // COMMISSION DISTRIBUTION ON CASH CREDITS GIVEN
    // =============================================================================
    // NEW SYSTEM: Commission distributes when CASH CREDITS are given to account
    // Commission is calculated based on cashCreditsToAdd amount (not total credits)
    // =============================================================================
    if (cashCreditsToAdd > 0 && application) {
      console.log(`\n💰 [COMMISSION] Distributing commission on ₹${cashCreditsToAdd} cash credits given to ${user.name}\n`);
      
      try {
          const recipient = user;
          const CREDIT_AMOUNT = cashCreditsToAdd; // Commission based on cash credits given
          const User = require('../models/User');
          const CommissionDistribution = require('../models/CommissionDistribution');

          // Commission percentages by position level
          const levelShares = [
            { levelName: 'pincode', percent: 20, label: 'Pincode' },
            { levelName: 'tehsil', percent: 10, label: 'Tehsil' },
            { levelName: 'district', percent: 5, label: 'District' },
            { levelName: 'division', percent: 2.5, label: 'Division' },
            { levelName: 'state', percent: 1.25, label: 'State' },
            { levelName: 'zone', percent: 0.6, label: 'Zone' },
            { levelName: 'country', percent: 0.3, label: 'India' }
          ];
          
          // Parent commission percentages (sequential - based on fill order, not position)
          // Parent 1 gets 10%, Parent 2 gets 5%, Parent 3 gets 2.5%, etc.
          // Empty positions are skipped, next filled position gets next percentage
          const parentPercentages = [10, 5, 2.5, 1.25, 0.6, 0.3];

          // Credit recipient with 'self' commission (20%) - ONLY if they didn't receive bonus credits
          const selfShare = levelShares[0];
          const selfAmt = Number((CREDIT_AMOUNT * (selfShare.percent / 100)).toFixed(2));
          
          const recipientLocation = application.applicantInfo?.pincode || 'N/A';
          const recipientPosition = application.position?.level || 'Pincode';
          
          // RULE: If recipient got bonus advertisement credits, they don't get commission (they already got bonus)
          recipient.commissionHistory = recipient.commissionHistory || [];
          recipient.cashCreditsHistory = recipient.cashCreditsHistory || [];
          
          if (extraCreditsToAdd === 0) {
            // Give SELF commission (20%) - Convert to CASH CREDITS (not withdrawable)
            // Self commission is added to cashCredits to be used for creating ads, NOT for withdrawal
            const oldCashCredits = recipient.cashCredits || 0;
            recipient.cashCredits = oldCashCredits + selfAmt;
            recipient.credits = (recipient.cashCredits || 0) + (recipient.extraCredits || 0);
            
            // Track in cash credits history
            recipient.cashCreditsHistory.push({
              type: 'credit',
              amount: selfAmt,
              balance: recipient.cashCredits,
              description: `Self Commission (20%) converted to Cash Credits\\nFrom: Credits received\\nLevel: ${selfShare.label}\\nLocation: ${recipientLocation}`,
              date: new Date()
            });
            
            // Also track in commission history for summary display (but NOT in commissionBalance)
            recipient.commissionHistory.push({
              type: 'credit',
              subType: 'self', // Mark as self commission
              amount: selfAmt,
              balance: 0, // Not added to withdrawable balance
              description: `Commission (Self) - Converted to Cash Credits\\nLevel: ${selfShare.label}\\nLocation: ${recipientLocation}`,
              level: selfShare.label,
              positionLevel: recipientPosition,
              positionLocation: recipientLocation,
              percent: selfShare.percent,
              date: new Date()
            });
            
            await recipient.save();
            console.log(`✅ [COMMISSION] Self: ₹${selfAmt} (${selfShare.percent}%) converted to CASH CREDITS for ${recipient.name} (no bonus, not withdrawable)`);
          } else {
            // No commission - but add history entry showing 0% with bonus note
            recipient.commissionHistory.push({
              type: 'credit',
              amount: 0,
              balance: recipient.commissionBalance || 0,
              description: `No commission (received ${extraCreditsToAdd.toLocaleString('en-IN')} bonus credits)\\nLevel: ${selfShare.label}\\nLocation: ${recipientLocation}`,
              level: selfShare.label,
              positionLevel: recipientPosition,
              positionLocation: recipientLocation,
              percent: 0,
              date: new Date()
            });
            
            await recipient.save();
            console.log(`⚠️  [COMMISSION] Self: ₹${selfAmt} (${selfShare.percent}%) NOT given to ${recipient.name} (already received ${extraCreditsToAdd} bonus credits) - added 0% entry to history`);
          }

          // Extract location hierarchy FROM POSITIONID (not applicantInfo which is often empty)
          // positionId format: pos_pincode-head_india_west-zone_maharashtra_konkan_thane_thane_401107
          const posIdParts = application.positionId.split('_');
          // [0]=pos, [1]=level-head, [2]=country, [3]=zone, [4]=state, [5]=division, [6]=district, [7]=tehsil, [8]=pincode
          
          const hierarchy = {
            country: posIdParts[2] || 'india',
            zone: posIdParts[3] || null,
            state: posIdParts[4] || null,
            division: posIdParts[5] || null,
            district: posIdParts[6] || null,
            tehsil: posIdParts[7] || null,
            pincode: posIdParts[8] || null
          };

          console.log('📍 [COMMISSION] Recipient hierarchy (from positionId):', hierarchy);
          console.log('📍 [COMMISSION] Full positionId:', application.positionId);

          // Find position holders in the SAME geographic hierarchy
          const findLevelHolder = async (levelName, excludePhone = null) => {
            let query = { status: 'approved' };
            if (excludePhone) {
              query['applicantInfo.phone'] = { $ne: excludePhone };
            }
            
            const token = hierarchy[levelName];
            
            // Build positionId pattern based on recipient's hierarchy
            if (levelName === 'country') {
              // Country head or president
              query.positionId = { $regex: /pos_president_india|pos_country-head_india/i };
            } else if (levelName === 'zone' && hierarchy.zone) {
              // Zone head in same zone: pos_zone-head_india_west-zone
              const zonePattern = `pos_zone-head_india_${hierarchy.zone}`;
              query.positionId = { $regex: new RegExp(zonePattern.replace(/-/g, '[-_]'), 'i') };
            } else if (levelName === 'state' && hierarchy.state) {
              // State head in same state: pos_state-head_india_west-zone_maharashtra
              const statePattern = `pos_state-head_india_${hierarchy.zone}_${hierarchy.state}`;
              query.positionId = { $regex: new RegExp(statePattern.replace(/-/g, '[-_]'), 'i') };
            } else if (levelName === 'division' && hierarchy.division) {
              // Division head in same division: pos_division-head_india_west-zone_maharashtra_konkan
              const divPattern = `pos_division-head_india_${hierarchy.zone}_${hierarchy.state}_${hierarchy.division}`;
              query.positionId = { $regex: new RegExp(divPattern.replace(/-/g, '[-_]'), 'i') };
            } else if (levelName === 'district' && hierarchy.district) {
              // District head: pos_district-head_india_west-zone_maharashtra_konkan_thane
              const distPattern = `pos_district-head_india_${hierarchy.zone}_${hierarchy.state}_${hierarchy.division}_${hierarchy.district}`;
              query.positionId = { $regex: new RegExp(distPattern.replace(/-/g, '[-_]'), 'i') };
            } else if (levelName === 'tehsil' && hierarchy.tehsil) {
              // Tehsil head: pos_tehsil-head_india_west-zone_maharashtra_konkan_thane_thane
              const tehsilPattern = `pos_tehsil-head_india_${hierarchy.zone}_${hierarchy.state}_${hierarchy.division}_${hierarchy.district}_${hierarchy.tehsil}`;
              query.positionId = { $regex: new RegExp(tehsilPattern.replace(/-/g, '[-_]'), 'i') };
            } else {
              console.log(`ℹ️ [COMMISSION] No token for ${levelName} - position empty or not in hierarchy`);
              return null;
            }

            console.log(`🔎 [COMMISSION] Searching ${levelName}:`, query.positionId);
            let app = await Application.findOne(query).lean();
            if (app) {
              console.log(`✅ [COMMISSION] Found ${levelName}: ${app.applicantInfo.name} (${app.applicantInfo.phone})`);
              return { app, paidLevel: levelName };
            }

            console.log(`ℹ️ [COMMISSION] Position ${levelName} is empty - will be skipped`);
            return null;
          };

          // Find all filled parent positions
          const filledParents = [];
          
          for (let i = 1; i < levelShares.length; i++) {
            const level = levelShares[i];
            try {
              const result = await findLevelHolder(level.levelName, recipient.phone);
              if (result && result.app) {
                const parentUser = await User.findById(result.app.userId);
                if (parentUser) {
                  filledParents.push({
                    level: level,
                    recipient: parentUser,
                    originalLevel: level.label,
                    application: result.app  // Store parent's application for position info
                  });
                  console.log(`✅ [COMMISSION] Found filled position #${filledParents.length}: ${level.label} - ${parentUser.name || parentUser.phone}`);
                }
              } else {
                console.log(`ℹ️ [COMMISSION] Empty position: ${level.label}`);
              }
            } catch (innerErr) {
              console.error(`❌ [COMMISSION] Failed for ${level.label}:`, innerErr.message);
            }
          }
          
          // Distribute commission to filled parents with sequential percentages
          console.log(`\n💰 [COMMISSION] Distributing to ${filledParents.length} filled parent position(s):\n`);
          
          for (let i = 0; i < filledParents.length; i++) {
            try {
              const parent = filledParents[i];
              const percent = parentPercentages[i] || 0;  // Sequential: 1st parent=10%, 2nd=5%, 3rd=2.5%
              const amt = Number((CREDIT_AMOUNT * (percent / 100)).toFixed(2));
              
              if (amt > 0) {
                // Track PARENT commission in commissionBalance (WITHDRAWABLE)
                parent.recipient.commissionBalance = (parent.recipient.commissionBalance || 0) + amt;
                parent.recipient.commissionHistory = parent.recipient.commissionHistory || [];
                
                // Get parent's own position info (not recipient's)
                const parentPosition = parent.application?.position?.level || parent.originalLevel;
                const parentLocation = parent.application?.applicantInfo?.pincode || 
                                      parent.application?.applicantInfo?.district || 
                                      parent.application?.applicantInfo?.state ||
                                      parent.application?.applicantInfo?.zone ||
                                      parent.application?.applicantInfo?.country || 
                                      parent.originalLevel;
                
                parent.recipient.commissionHistory.push({
                  type: 'credit',
                  subType: 'parent', // Mark as parent commission (withdrawable)
                  amount: amt,
                  balance: parent.recipient.commissionBalance,
                  description: `Commission from credits given to ${recipient.name} (${recipientPosition})\\nYour Position: ${parentPosition}\\nYour Location: ${parentLocation}`,
                  level: `Parent ${i + 1}`,
                  positionLevel: parentPosition,  // Parent's own position
                  positionLocation: parentLocation,  // Parent's own location
                  uploaderName: recipient.name || recipient.phone,
                  percent: percent,
                  date: new Date()
                });
                
                await parent.recipient.save();
                
                console.log(`✅ [COMMISSION] Parent #${i + 1}: ${parent.recipient.name || parent.recipient.phone} (${parent.originalLevel}) → ${percent}% = ₹${amt} added to COMMISSION BALANCE (not cash credits)`);
              }
            } catch (saveErr) {
              console.error(`❌ [COMMISSION] Failed to save commission:`, saveErr.message);
            }
          }
          
          console.log('💸 [COMMISSION] Distribution completed on cash credits given\n');
          
          // =============================================================================
          // CREATE COMMISSION DISTRIBUTION RECORD (for Distribution Paths table)
          // =============================================================================
          try {
            const hierarchyPathArray = [];
            let totalDistributed = 0;
            let filledCount = 0;
            let emptyCount = 0;
            
            // Add self to path - check if they get commission based on bonus credits rule
            const selfAmt = Number((CREDIT_AMOUNT * 0.2).toFixed(2));
            const selfGetsCommission = (extraCreditsToAdd === 0);
            const actualSelfCommission = selfGetsCommission ? selfAmt : 0;
            const actualSelfPercent = selfGetsCommission ? 20 : 0;
            
            totalDistributed += actualSelfCommission;
            filledCount++;
            
            hierarchyPathArray.push({
              level: 'pincode',
              location: hierarchy.pincode || recipientLocation,
              holder: recipient.name,
              holderPhone: recipient.phone,
              holderId: recipient._id,
              status: 'self',
              commission: actualSelfCommission,
              percent: actualSelfPercent,
              sequentialPosition: null
            });
            
            // Build complete path array showing filled and empty positions
            // Use same levelShares as defined earlier (line 2738) for consistency
            const levelShares = [
              { levelName: 'pincode', percent: 20, label: 'Pincode' },
              { levelName: 'tehsil', percent: 10, label: 'Tehsil' },
              { levelName: 'district', percent: 5, label: 'District' },
              { levelName: 'division', percent: 2.5, label: 'Division' },
              { levelName: 'state', percent: 1.25, label: 'State' },
              { levelName: 'zone', percent: 0.6, label: 'Zone' },
              { levelName: 'country', percent: 0.3, label: 'India' }
            ];
            
            let parentIndex = 0;
            for (let i = 1; i < levelShares.length; i++) {
              const level = levelShares[i];
              const location = hierarchy[level.levelName] || level.label;
              
              // Check if this position was filled (in filledParents array)
              const filledParent = filledParents.find(p => p.level.levelName === level.levelName);
              
              if (filledParent) {
                const percent = parentPercentages[parentIndex] || 0;  // Sequential percentage based on fill order
                const amt = Number((CREDIT_AMOUNT * (percent / 100)).toFixed(2));
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
                // Position is empty
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
              adId: null, // No ad, this is from credits given
              creatorId: recipient._id,
              creatorPhone: recipient.phone,
              creatorName: recipient.name,
              adAmount: CREDIT_AMOUNT,
              distributionDate: new Date(),
              selfCommission: {
                paid: selfGetsCommission,
                amount: actualSelfCommission,
                percent: actualSelfPercent
              },
              hierarchyPath: hierarchyPathArray,
              totalDistributed: totalDistributed,
              filledPositions: filledCount,
              emptyPositions: emptyCount,
              creditBreakdown: {
                cash: cashCreditsToAdd,  // Amount paid (e.g., 1000)
                extra: extraCreditsToAdd  // Bonus credits (e.g., 200)
              }
            });
            
            await distributionRecord.save();
            console.log(`✅ [COMMISSION PATH] Saved distribution record with ${filledCount} filled and ${emptyCount} empty positions`);
            
          } catch (pathErr) {
            console.error('❌ [COMMISSION PATH] Failed to save distribution record:', pathErr.message);
          }
          
        } catch (commErr) {
          console.error('❌ [COMMISSION] Distribution error:', commErr);
        }
      } else {
        console.log(`ℹ️ [COMMISSION] Skipped - no cash credits added or no application found`);
      }
      // =============================================================================
    
    console.log(`✅ Credits given to ${user.name}:`, {
      total: user.credits,
      cash: user.cashCredits,
      extra: user.extraCredits,
      oldTotal: oldTotalCredits
    });
    
    res.json({ 
      success: true,
      message: `Successfully gave ${creditsToGive.toLocaleString('en-IN')} credits to ${user.name}`,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        credits: user.credits,
        cashCredits: user.cashCredits,
        extraCredits: user.extraCredits
      },
      breakdown: {
        amountPaid: amountPaid,
        cashCredits: cashCreditsToAdd,
        extraCredits: extraCreditsToAdd,
        totalCredits: creditsToGive
      }
    });
  } catch (error) {
    console.error('[ADMIN] Error giving credits:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Get user credit details with cash and extra breakdown
router.get('/users/:userId/credit-details', async (req, res) => {
  try {
    const { userId } = req.params;
    const User = require('../models/User');
    
    const user = await User.findById(userId)
      .select('name phone credits cashCredits extraCredits cashHistory extraHistory')
      .lean();
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        totalCredits: user.credits || 0,
        cashCredits: user.cashCredits || 0,
        extraCredits: user.extraCredits || 0,
        cashHistory: user.cashHistory || [],
        extraHistory: user.extraHistory || []
      }
    });
  } catch (error) {
    console.error('[ADMIN] Error fetching credit details:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Distribute commission to position hierarchy
router.post('/applications/:id/distribute-commission', async (req, res) => {
  try {
    const { id } = req.params;
    const { positionId, totalAmount, distributions } = req.body;

    console.log('💰 [COMMISSION] Distribution request:', { 
      applicationId: id, 
      positionId, 
      totalAmount,
      distributions 
    });

    // Get the application to find the position hierarchy
    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Parse position hierarchy from positionId
    const hierarchy = parsePositionId(positionId);
    console.log('📍 [COMMISSION] Position hierarchy:', hierarchy);

    // Find approved applications for each level in the hierarchy
    const commissionRecipients = [];
    let totalDistributed = 0;
    let successfulDistributions = 0;

    for (const distribution of distributions) {
      try {
        // Find the position holder for this level
        let recipientPosition = await findPositionHolder(hierarchy, distribution.level);
        let actualPaidLevel = distribution.level;

        // If no recipient found at this exact level, try to reallocate to next available upper level
        const levelsOrder = ['pincode','tehsil','district','division','state','zone','country'];
        if (!recipientPosition || !recipientPosition.application) {
          console.log(`⚠️ [COMMISSION] No approved holder found for ${distribution.level} level — attempting fallback allocation`);
          const startIdx = Math.max(0, levelsOrder.indexOf(distribution.level));
          for (let i = startIdx + 1; i < levelsOrder.length; i++) {
            const upperLevel = levelsOrder[i];
            const upperPos = await findPositionHolder(hierarchy, upperLevel);
            if (upperPos && upperPos.application) {
              recipientPosition = upperPos;
              actualPaidLevel = upperLevel;
              console.log(`ℹ️ [COMMISSION] Reallocated ${distribution.level} -> ${upperLevel}`);
              break;
            }
          }
        }

        // If still not found, try fallback search by applicantInfo fields (state/zone/etc.)
        if ((!recipientPosition || !recipientPosition.application) && distribution.level !== 'country') {
          console.log(`ℹ️ [COMMISSION] Trying fallback search by location fields for ${distribution.level}`);
          // build fallbackQuery based on level
          const fallbackQuery = { status: 'approved' };
          const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          switch (distribution.level.toLowerCase()) {
            case 'state':
              if (hierarchy.state) fallbackQuery['applicantInfo.state'] = new RegExp(esc(hierarchy.state), 'i');
              break;
            case 'division':
              if (hierarchy.division) fallbackQuery['applicantInfo.division'] = new RegExp(esc(hierarchy.division), 'i');
              break;
            case 'district':
              if (hierarchy.district) fallbackQuery['applicantInfo.district'] = new RegExp(esc(hierarchy.district), 'i');
              break;
            case 'tehsil':
              if (hierarchy.tehsil) fallbackQuery['applicantInfo.tehsil'] = new RegExp(esc(hierarchy.tehsil), 'i');
              break;
            case 'pincode':
              if (hierarchy.pincode) fallbackQuery['applicantInfo.pincode'] = new RegExp(esc(hierarchy.pincode), 'i');
              break;
            case 'zone':
              if (hierarchy.zone) fallbackQuery['applicantInfo.zone'] = new RegExp(esc(hierarchy.zone), 'i');
              break;
            default:
              break;
          }
          if (Object.keys(fallbackQuery).length > 1) {
            const fallbackApp = await Application.findOne(fallbackQuery).sort({ approvedDate: -1 });
            if (fallbackApp) {
              recipientPosition = { application: fallbackApp };
              actualPaidLevel = distribution.level + ' (fallback by applicantInfo)';
              console.log(`✅ [COMMISSION] Found fallback holder by applicantInfo for level ${distribution.level}`);
            }
          }
        }

        if (recipientPosition && recipientPosition.application) {
          const recipient = await User.findById(recipientPosition.application.userId);
          if (recipient) {
            // Add credits to recipient
            const creditsToAdd = Math.floor(distribution.amount);
            recipient.credits = (recipient.credits || 0) + creditsToAdd;

            // Add commission transaction
            recipient.creditsHistory = recipient.creditsHistory || [];
            recipient.creditsHistory.push({
              amount: creditsToAdd,
              type: 'commission',
              description: `Commission from ${hierarchy.level} position (${distribution.percentage}% of ₹${totalAmount}) allocated to ${actualPaidLevel}`,
              date: new Date()
            });

            await recipient.save();

            commissionRecipients.push({
              requestedLevel: distribution.level,
              paidLevel: actualPaidLevel,
              name: recipient.name,
              phone: recipient.phone,
              amount: creditsToAdd,
              percentage: distribution.percentage
            });

            totalDistributed += creditsToAdd;
            successfulDistributions++;

            console.log(`✅ [COMMISSION] Distributed ₹${creditsToAdd} to ${recipient.name} (requested: ${distribution.level} -> paid: ${actualPaidLevel})`);
          }
        } else {
          console.log(`⚠️ [COMMISSION] No approved holder found for ${distribution.level} (and no upper-level/fallback holder)`);
        }
      } catch (distError) {
        console.error(`❌ [COMMISSION] Error distributing to ${distribution.level}:`, distError);
      }
    }

    res.json({
      success: true,
      message: `Commission distributed to ${successfulDistributions} recipients`,
      totalAmount: totalAmount,
      totalDistributed: totalDistributed,
      distributedTo: successfulDistributions,
      recipients: commissionRecipients
    });

  } catch (error) {
    console.error('❌ [COMMISSION] Error distributing commission:', error);
    res.status(500).json({ 
      error: 'Failed to distribute commission',
      details: error.message 
    });
  }
});

// Helper function to parse positionId into hierarchy
function parsePositionId(positionId) {
  const parts = positionId.replace('pos_', '').split('_');
  
  return {
    level: parts[0].replace(/-/g, ' '),
    country: parts.length > 1 ? parts[1] : null,
    zone: parts.length > 2 && parts[2].includes('zone') ? parts[2] : null,
    state: parts.length > 2 && !parts[2].includes('zone') ? parts[2] : parts.length > 3 ? parts[3] : null,
    division: parts.length > 4 ? parts[4] : null,
    district: parts.length > 5 ? parts[5] : null,
    tehsil: parts.length > 6 ? parts[6] : null,
    pincode: parts.length > 7 ? parts[7] : null,
    village: parts.length > 8 ? parts[8] : null
  };
}

// Helper function to find position holder for a specific level
async function findPositionHolder(hierarchy, level) {
  try {
    let query = { status: 'approved' };

    // helper to create flexible regex from a token (handles spaces, underscores, hyphens)
    const makeFlexible = (str) => {
      if (!str) return null;
      const token = String(str).trim().toLowerCase().replace(/[^a-z0-9]+/g, '[-_\\s]*');
      // match either "<level>...<token>" or "<token>...<level>"
      return new RegExp(`(${level.replace(/\s+/g, '[-_\\s]*')}[-_\\s]*head.*${token}|${token}.*${level.replace(/\s+/g, '[-_\\s]*')}[-_\\s]*head)`, 'i');
    };

    let regex = null;

    switch (level.toLowerCase()) {
      case 'country':
        // president or country-level holder
        regex = /president|india[-_\s]*head/i;
        break;
      case 'zone':
        regex = makeFlexible(hierarchy.zone || hierarchy.state || hierarchy.division);
        break;
      case 'state':
        regex = makeFlexible(hierarchy.state || hierarchy.zone);
        break;
      case 'division':
        regex = makeFlexible(hierarchy.division || hierarchy.state);
        break;
      case 'district':
        regex = makeFlexible(hierarchy.district || hierarchy.division);
        break;
      case 'tehsil':
        regex = makeFlexible(hierarchy.tehsil || hierarchy.district);
        break;
      case 'pincode':
        if (hierarchy.pincode) {
          regex = new RegExp(`${hierarchy.pincode}`, 'i');
        }
        break;
      case 'village':
        regex = makeFlexible(hierarchy.village || hierarchy.tehsil);
        break;
    }

    if (regex) {
      query.positionId = { $regex: regex };
    }

    console.log(`🔍 [COMMISSION] Searching for ${level} holder with query:`, query, 'regex:', regex);

    const application = await Application.findOne(query);

    return application ? { application } : null;
  } catch (error) {
    console.error(`Error finding ${level} position holder:`, error);
    return null;
  }
}

// Sync Position IDs to match Application positionIds
router.post('/sync-position-ids', async (req, res) => {
  try {
    console.log('🔄 Starting position ID synchronization...');
    
    // Get all approved applications
    const approvedApplications = await Application.find({ status: 'approved' });
    console.log(`📊 Found ${approvedApplications.length} approved applications`);
    
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    const updates = [];
    
    for (const app of approvedApplications) {
      try {
        const { positionId, country, zone, state, division, district, tehsil, pincode, village } = app;
        
        // Build query to find matching position by location hierarchy
        const query = {};
        
        // Add all available location fields
        if (country) query.country = country;
        if (zone) query.zone = zone;
        if (state) query.state = state;
        if (division) query.division = division;
        if (district) query.district = district;
        if (tehsil) query.tehsil = tehsil;
        if (pincode) query.pincode = pincode;
        if (village) query.village = village;
        
        // Find position by location match
        const position = await Position.findOne(query);
        
        if (position) {
          if (position.positionId !== positionId) {
            // Update position to use the application's positionId
            position.positionId = positionId;
            await position.save();
            
            updated++;
            updates.push({
              oldId: position.positionId,
              newId: positionId,
              location: `${district || tehsil || pincode || village}`.trim()
            });
            
            console.log(`✅ Updated: ${district || tehsil || pincode || village} -> ${positionId}`);
          } else {
            skipped++;
          }
        } else {
          console.log(`⚠️ No position found for: ${district || tehsil || pincode || village}`);
        }
      } catch (err) {
        errors++;
        console.error(`❌ Error processing application ${app._id}:`, err.message);
      }
    }
    
    console.log(`✅ Sync complete! Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`);
    
    res.json({
      success: true,
      message: 'Position IDs synchronized successfully',
      stats: {
        totalApplications: approvedApplications.length,
        updated,
        skipped,
        errors
      },
      updates: updates.slice(0, 20) // Return first 20 updates as sample
    });
    
  } catch (error) {
    console.error('❌ Error syncing position IDs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Fix introducedCount for all users (admin maintenance endpoint)
router.post('/fix-introduced-counts', async (req, res) => {
  try {
    const User = require('../models/User');
    
    console.log('🔧 Starting introducedCount fix...');
    
    // Get all users with phone numbers
    const users = await User.find({ phone: { $exists: true, $ne: null } }).select('phone name introducedCount');
    console.log(`📋 Found ${users.length} users with phone numbers`);

    let updatedCount = 0;
    let unchangedCount = 0;
    const updates = [];

    for (const user of users) {
      // Count how many APPROVED applications have this user's phone as introducedBy
      const referralCount = await Application.countDocuments({
        introducedBy: user.phone,
        status: 'approved'
      });

      const currentCount = user.introducedCount || 0;

      if (referralCount !== currentCount) {
        user.introducedCount = referralCount;
        await user.save();
        
        updates.push({
          name: user.name,
          phone: user.phone,
          oldCount: currentCount,
          newCount: referralCount
        });
        
        console.log(`✅ Updated ${user.name} (${user.phone}): ${currentCount} → ${referralCount}`);
        updatedCount++;
      } else {
        unchangedCount++;
      }
    }

    // Get top referrers
    const topReferrers = await User.find({ introducedCount: { $gt: 0 } })
      .select('name phone introducedCount')
      .sort({ introducedCount: -1 })
      .limit(10)
      .lean();

    res.json({
      success: true,
      message: 'introducedCount fixed successfully',
      summary: {
        totalUsers: users.length,
        updated: updatedCount,
        unchanged: unchangedCount
      },
      updates: updates,
      topReferrers: topReferrers
    });
  } catch (error) {
    console.error('❌ Error fixing introducedCount:', error);
    res.status(500).json({ error: error.message });
  }
});

// Migrate pincode from applications to users
router.get('/migrate-pincodes', async (req, res) => {
  try {
    const User = require('../models/User');
    
    // Find all users without pincode
    const users = await User.find({ pincode: { $exists: false } });
    
    console.log(`📍 Found ${users.length} users without pincode`);
    
    const updated = [];
    const notFound = [];
    
    for (const user of users) {
      // Find their application
      const application = await Application.findOne({ 
        'applicantInfo.phone': user.phone 
      });
      
      if (application && application.applicantInfo.pincode) {
        user.pincode = application.applicantInfo.pincode;
        await user.save();
        updated.push({
          name: user.name,
          phone: user.phone,
          pincode: application.applicantInfo.pincode
        });
        console.log(`✅ Updated ${user.name} (${user.phone}) with pincode: ${application.applicantInfo.pincode}`);
      } else {
        notFound.push({
          name: user.name,
          phone: user.phone,
          reason: application ? 'No pincode in application' : 'Application not found'
        });
        console.log(`⚠️ Could not find pincode for ${user.name} (${user.phone})`);
      }
    }
    
    res.json({
      message: 'Pincode migration completed',
      totalUsers: users.length,
      updated: updated.length,
      notFound: notFound.length,
      updatedList: updated,
      notFoundList: notFound
    });
  } catch (error) {
    console.error('❌ Error migrating pincodes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug user login issue
router.post('/debug-user-login', async (req, res) => {
  try {
    const User = require('../models/User');
    const bcrypt = require('bcryptjs');
    const { phone, password } = req.body;
    
    console.log(`🔍 DEBUG: Checking login for phone: ${phone}, password: ${password}`);
    
    // Find user by phone
    const user = await User.findOne({ phone: phone });
    
    if (!user) {
      return res.json({
        success: false,
        issue: 'USER_NOT_FOUND',
        message: `No user found with phone ${phone}`,
        suggestion: 'User account may not have been created. Check applications table.'
      });
    }
    
    console.log(`✅ User found:`, {
      id: user._id,
      name: user.name,
      phone: user.phone,
      loginId: user.loginId,
      hasPassword: !!user.password,
      passwordLength: user.password ? user.password.length : 0,
      isHashed: user.password ? user.password.startsWith('$2') : false
    });
    
    // Check if password is hashed
    const isHashed = user.password.startsWith('$2');
    
    let passwordMatch = false;
    if (isHashed) {
      // Compare with bcrypt
      passwordMatch = await bcrypt.compare(password, user.password);
    } else {
      // Direct comparison
      passwordMatch = user.password === password;
    }
    
    console.log(`🔐 Password check:`, {
      provided: password,
      stored: user.password.substring(0, 20) + '...',
      isHashed: isHashed,
      match: passwordMatch
    });
    
    if (!passwordMatch) {
      // Try to regenerate correct password
      const nameForPassword = user.name.replace(/\s+/g, '');
      const correctPassword = nameForPassword.substring(0, 4).toUpperCase().padEnd(4, 'X');
      
      return res.json({
        success: false,
        issue: 'PASSWORD_MISMATCH',
        message: 'Password does not match',
        userDetails: {
          name: user.name,
          phone: user.phone,
          storedPassword: isHashed ? 'HASHED' : user.password,
          isHashed: isHashed,
          shouldBePassword: correctPassword
        },
        suggestion: `Expected password should be: ${correctPassword}. Use /admin/fix-user-password endpoint to reset.`
      });
    }
    
    res.json({
      success: true,
      message: 'User and password are correct',
      userDetails: {
        name: user.name,
        phone: user.phone,
        email: user.email,
        pincode: user.pincode,
        credits: user.credits
      }
    });
    
  } catch (error) {
    console.error('❌ Error debugging user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fix user password
router.post('/fix-user-password', async (req, res) => {
  try {
    const User = require('../models/User');
    const { phone } = req.body;
    
    const user = await User.findOne({ phone: phone });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Generate correct password
    const nameForPassword = user.name.replace(/\s+/g, '');
    const correctPassword = nameForPassword.substring(0, 4).toUpperCase().padEnd(4, 'X');
    
    // Store as plain text (not hashed)
    user.password = correctPassword;
    await user.save();
    
    console.log(`✅ Password reset for ${user.name} (${user.phone}) to: ${correctPassword}`);
    
    res.json({
      success: true,
      message: 'Password reset successfully',
      userDetails: {
        name: user.name,
        phone: user.phone,
        newPassword: correctPassword
      }
    });
    
  } catch (error) {
    console.error('❌ Error fixing password:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create missing user accounts for approved applications
router.post('/create-missing-users', async (req, res) => {
  try {
    const User = require('../models/User');
    
    // Find all approved applications (status is lowercase)
    const approvedApps = await Application.find({ 
      status: 'approved'
    });
    
    console.log(`🔍 Found ${approvedApps.length} approved applications`);
    
    const created = [];
    const alreadyExists = [];
    const errors = [];
    
    for (const application of approvedApps) {
      try {
        const phone = application.applicantInfo.phone;
        
        // Check if user already exists
        const existingUser = await User.findOne({ phone: phone });
        
        if (existingUser) {
          alreadyExists.push({
            name: application.applicantInfo.name,
            phone: phone,
            userId: existingUser._id
          });
          console.log(`✓ User already exists: ${application.applicantInfo.name} (${phone})`);
          continue;
        }
        
        // Generate person code
        const personCode = `CP${Date.now()}${Math.floor(Math.random() * 1000)}`;
        
        // Generate password: First 4 letters of name in CAPITAL
        const nameForPassword = application.applicantInfo.name.replace(/\s+/g, '');
        const defaultPassword = nameForPassword.substring(0, 4).toUpperCase().padEnd(4, 'X');
        
        // Create user account
        const newUser = new User({
          name: application.applicantInfo.name,
          phone: application.applicantInfo.phone,
          email: application.applicantInfo.email || '',
          pincode: application.applicantInfo.pincode,
          personCode: personCode,
          loginId: application.applicantInfo.phone,
          password: defaultPassword,
          photo: application.applicantInfo.photo,
          introducedBy: application.introducedBy,
          positionId: application.positionId,
          appliedDate: application.appliedDate,
          approvedDate: application.approvedDate || new Date(),
          credits: 0,
          hasReceivedInitialCredits: false,
          introducedCount: 0,
          isVerified: false,
          isFirstLogin: true
        });
        
        await newUser.save();
        
        // Update application with userId
        application.userId = newUser._id;
        await application.save();
        
        created.push({
          name: application.applicantInfo.name,
          phone: phone,
          userId: newUser._id,
          personCode: personCode,
          password: defaultPassword
        });
        
        console.log(`✅ Created user: ${application.applicantInfo.name} (${phone}) - Password: ${defaultPassword}`);
        
      } catch (error) {
        errors.push({
          name: application.applicantInfo.name,
          phone: application.applicantInfo.phone,
          error: error.message
        });
        console.error(`❌ Error creating user for ${application.applicantInfo.name}:`, error.message);
      }
    }
    
    res.json({
      success: true,
      message: 'User account creation completed',
      totalApproved: approvedApps.length,
      created: created.length,
      alreadyExists: alreadyExists.length,
      errors: errors.length,
      createdList: created,
      alreadyExistsList: alreadyExists,
      errorsList: errors
    });
    
  } catch (error) {
    console.error('❌ Error creating missing users:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🔍 Detect duplicate phone numbers across all applications
router.get('/duplicate-phones', async (req, res) => {
  try {
    console.log('🔍 Checking for duplicate phone numbers...');
    
    // Aggregate to find phone numbers used more than once
    const duplicates = await Application.aggregate([
      {
        $match: {
          status: { $in: ['approved', 'pending'] },
          'applicantInfo.phone': { $exists: true, $ne: null, $ne: '' }
        }
      },
      {
        $group: {
          _id: '$applicantInfo.phone',
          count: { $sum: 1 },
          applications: {
            $push: {
              id: '$_id',
              name: '$applicantInfo.name',
              position: '$positionId',
              status: '$status',
              appliedAt: '$appliedAt'
            }
          }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    console.log(`✅ Found ${duplicates.length} duplicate phone numbers`);
    duplicates.forEach(dup => {
      console.log(`   📞 ${dup._id}: ${dup.count} applications`);
      dup.applications.forEach(app => {
        console.log(`      - ${app.name} (${app.position})`);
      });
    });
    
    res.json({
      success: true,
      duplicateCount: duplicates.length,
      duplicates: duplicates
    });
    
  } catch (error) {
    console.error('❌ Error checking duplicate phones:', error);
    res.status(500).json({ error: error.message });
  }
});

// 📝 Update phone number for an application (admin only)
router.put('/applications/:applicationId/phone', async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { newPhone, adminNote } = req.body;
    
    console.log(`📝 Admin updating phone number for application: ${applicationId}`);
    console.log(`   New phone: ${newPhone}`);
    
    if (!newPhone || !/^\d{10}$/.test(newPhone)) {
      return res.status(400).json({ error: 'Invalid phone number. Must be 10 digits.' });
    }
    
    // Find the application
    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    const oldPhone = application.applicantInfo.phone;
    console.log(`   Old phone: ${oldPhone}`);
    
    // Check if new phone is already in use
    const existingWithNewPhone = await Application.findOne({
      'applicantInfo.phone': newPhone,
      _id: { $ne: applicationId },
      status: { $in: ['approved', 'pending'] }
    });
    
    if (existingWithNewPhone) {
      return res.status(400).json({
        error: `Phone number ${newPhone} is already used by ${existingWithNewPhone.applicantInfo.name} (${existingWithNewPhone.positionId})`
      });
    }
    
    const User = require('../models/User');
    const existingUser = await User.findOne({ phone: newPhone });
    if (existingUser) {
      return res.status(400).json({
        error: `Phone number ${newPhone} is already registered as a user`
      });
    }
    
    // Update application phone
    application.applicantInfo.phone = newPhone;
    if (adminNote) {
      if (!application.adminNotes) application.adminNotes = [];
      application.adminNotes.push({
        timestamp: new Date(),
        note: `Phone changed from ${oldPhone} to ${newPhone}. Reason: ${adminNote}`
      });
    }
    await application.save();
    
    console.log(`✅ Application phone updated: ${oldPhone} → ${newPhone}`);
    
    // Update associated User record if exists (for login)
    const user = await User.findOne({ phone: oldPhone });
    if (user) {
      console.log(`   Updating user login ID: ${oldPhone} → ${newPhone}`);
      user.phone = newPhone;
      user.loginId = newPhone; // Login ID is phone number
      await user.save();
      console.log(`   ✅ User record updated`);
    } else {
      console.log(`   ℹ️ No user record found for old phone ${oldPhone}`);
    }
    
    res.json({
      success: true,
      message: `Phone number updated from ${oldPhone} to ${newPhone}`,
      application: {
        id: application._id,
        name: application.applicantInfo.name,
        oldPhone,
        newPhone,
        position: application.positionId
      },
      userUpdated: !!user
    });
    
  } catch (error) {
    console.error('❌ Error updating phone:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

