const express = require('express');
const router = express.Router();
const Position = require('../models/Position');

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
    
    // Get applications for these positions from applications collection
    const Application = require('../models/Application');
    const User = require('../models/User');
    
    const enrichedPositions = await Promise.all(positions.map(async (position) => {
      const positionObj = position.toObject();
      
      // Find application for this position
      const application = await Application.findOne({ 
        positionId: position._id,
        status: { $in: ['pending', 'approved'] }
      });
      
      if (application) {
        // Position has an application
        positionObj.status = application.status === 'pending' ? 'Pending' : 'Approved';
        positionObj.applicantDetails = {
          name: application.applicantInfo.name,
          phone: application.applicantInfo.phone,
          email: application.applicantInfo.email,
          photo: application.applicantInfo.photo,
          address: application.applicantInfo.address,
          companyName: application.applicantInfo.companyName,
          businessName: application.applicantInfo.businessName,
          appliedDate: application.appliedDate,
          introducedBy: application.introducedBy,
          days: Math.floor((new Date() - new Date(application.appliedDate)) / (1000 * 60 * 60 * 24))
        };
        
        // If approved, get user details
        if (application.status === 'approved') {
          const user = await User.findOne({ phone: application.applicantInfo.phone });
          if (user) {
            positionObj.applicantDetails.userId = user._id;
            positionObj.applicantDetails.personCode = user.personCode;
            positionObj.applicantDetails.introducedCount = user.introducedCount || 0;
            positionObj.isVerified = user.isVerified;
          }
        }
      } else {
        // Position is available
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
