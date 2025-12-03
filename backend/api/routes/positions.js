const express = require('express');
const router = express.Router();
const Position = require('../models/Position');

// Version endpoint to verify deployment
router.get('/version', (req, res) => {
  res.json({ 
    version: '1.1.0-photo-fix', 
    deployed: new Date().toISOString(),
    message: 'Manual User.findById() photo fetch active'
  });
});

// Get all positions with filters and application status
router.get('/', async (req, res) => {
  try {
    const { country, zone, state, division, district, tehsil, pincode, village, status, limit, skip } = req.query;
    
    let filter = {};
    
    // Always filter by country
    filter['location.country'] = country || 'India';
    
    // Add specific location filters if provided
    if (village) {
      filter['location.village'] = village;
    }
    if (pincode) {
      filter['location.pincode'] = pincode;
    }
    if (tehsil) {
      filter['location.tehsil'] = tehsil;
    }
    if (district) {
      filter['location.district'] = district;
    }
    if (division) {
      filter['location.division'] = division;
    }
    if (state) {
      filter['location.state'] = state;
    }
    if (zone) {
      filter['location.zone'] = zone;
    }

    // Apply pagination if provided
    let query = Position.find(filter).sort({ sNo: 1 });
    
    if (skip) query = query.skip(parseInt(skip));
    if (limit) query = query.limit(parseInt(limit));
    
    const positions = await query;
    
    // Get applications for these positions from channelpartner.applications collection
    const Application = require('../models/Application');
    const User = require('../models/User');
    
    console.log(`🔍 Checking applications for ${positions.length} positions...`);
    
    const enrichedPositions = await Promise.all(positions.map(async (position) => {
      const positionObj = position.toObject();
      
      // Find application for this specific position in channelpartner.applications
      let application = await Application.findOne({ 
        positionId: position._id
      });
      
      if (application) {
        // Position has an application - show applicant data instead of Apply button
        console.log(`✅ Found application for position ${position.sNo} (${position.designation}): ${application.applicantInfo.name} - Status: ${application.status}`);
        
        // Set status based on application workflow
        let displayStatus = 'Pending';
        if (application.status === 'approved' && application.isVerified) {
          displayStatus = 'Verified';
        } else if (application.status === 'approved') {
          displayStatus = 'Approved';
        } else if (application.status === 'pending') {
          displayStatus = 'Pending';
        } else if (application.status === 'rejected') {
          displayStatus = 'Rejected';
        }
        
        // Get photo from User model if available (user may have updated it), otherwise from application
        let userPhoto = application.applicantInfo.photo; // Default from application
        
        // CRITICAL FIX: Manually fetch the User document to get updated photo
        if (application.userId) {
          try {
            const linkedUser = await User.findById(application.userId);
            if (linkedUser && linkedUser.photo) {
              userPhoto = linkedUser.photo; // Use updated photo from User model
              console.log(`📸 Using updated photo from User model for ${application.applicantInfo.name}`);
            } else {
              console.log(`⚠️  User ${application.userId} not found or has no photo, using application photo`);
            }
          } catch (error) {
            console.error(`❌ Error fetching user photo for ${application.userId}:`, error.message);
          }
        } else {
          console.log(`⚠️  No userId linked for ${application.applicantInfo.name}, using application photo`);
        }
        
        positionObj.status = displayStatus;
        positionObj.applicantDetails = {
          name: application.applicantInfo.name,
          phone: application.applicantInfo.phone,
          email: application.applicantInfo.email,
          photo: userPhoto, // Use photo from User model if available
          address: application.applicantInfo.address,
          companyName: application.applicantInfo.companyName,
          businessName: application.applicantInfo.businessName,
          appliedDate: application.appliedDate,
          introducedBy: application.introducedBy || 'Self',
          introducedCount: 0,
          days: Math.floor((new Date() - new Date(application.appliedDate)) / (1000 * 60 * 60 * 24)),
          applicationId: application._id,
          paymentStatus: application.paymentStatus || 'pending',
          isVerified: application.isVerified || false
        };
        
        // Get additional user details if user exists
        if (application.userId) {
          const user = application.userId;
          positionObj.applicantDetails.userId = user._id;
          positionObj.applicantDetails.personCode = user.personCode;
          positionObj.applicantDetails.introducedCount = user.introducedCount || 0;
          positionObj.isVerified = user.isVerified || application.isVerified;
        }
      } else {
        // Position is available - show Apply Now button
        console.log(`❓ No application found for position ${position.sNo} (${position.designation}) - Available`);
        positionObj.status = 'Available';
        positionObj.applicantDetails = null;
      }
      
      return positionObj;
    }));
    
    // Apply status filter after enrichment
    let finalPositions = enrichedPositions;
    if (status) {
      finalPositions = enrichedPositions.filter(pos => pos.status === status);
    }
    
    console.log(`📊 Returning ${finalPositions.length} positions with application status`);
    res.json(finalPositions);
  } catch (error) {
    console.error('❌ Error fetching positions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get position by ID
router.get('/:id', async (req, res) => {
  try {
    const position = await Position.findById(req.params.id);
    if (!position) {
      return res.status(404).json({ error: 'Position not found' });
    }
    res.json(position);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new position (Admin only)
router.post('/', async (req, res) => {
  try {
    const position = new Position(req.body);
    await position.save();
    res.status(201).json(position);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update position
router.put('/:id', async (req, res) => {
  try {
    const position = await Position.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!position) {
      return res.status(404).json({ error: 'Position not found' });
    }
    res.json(position);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete position
router.delete('/:id', async (req, res) => {
  try {
    const position = await Position.findByIdAndDelete(req.params.id);
    if (!position) {
      return res.status(404).json({ error: 'Position not found' });
    }
    res.json({ message: 'Position deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get positions count by location level
router.get('/stats/count', async (req, res) => {
  try {
    const stats = {
      country: 1,
      zones: 6,
      states: 36,
      divisions: 120,
      districts: 650,
      tehsils: 5000,
      pincodes: 20000,
      villages: 120000
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
