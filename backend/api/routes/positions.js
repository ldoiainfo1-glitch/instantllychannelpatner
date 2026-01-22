const express = require('express');
const router = express.Router();
const Position = require('../models/Position');
const PricingOverride = require('../models/PricingOverride');

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
    const { country, zone, state, division, district, tehsil, pincode, village, status, limit, skip, phone } = req.query;
    
    let filter = {};
    
    // Search by phone number (applicant details)
    if (phone) {
      filter['applicantDetails.phone'] = new RegExp(phone.replace(/\D/g, ''), 'i');
      filter['status'] = { $in: ['Pending', 'Approved', 'Occupied'] }; // Only positions with applications
    } else {
      // Always filter by country if not searching by phone
      filter['location.country'] = country || 'India';
    }
    
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
        
        console.log(`\n🔍 PHOTO DEBUG for ${application.applicantInfo.name} (Phone: ${application.applicantInfo.phone}):`);
        console.log(`   Application._id: ${application._id}`);
        console.log(`   Application.userId: ${application.userId || 'NOT SET'}`);
        console.log(`   Application photo length: ${application.applicantInfo.photo ? application.applicantInfo.photo.length : 0} chars`);
        console.log(`   Application photo preview: ${application.applicantInfo.photo ? application.applicantInfo.photo.substring(0, 50) : 'NO PHOTO'}...`);
        
        // CRITICAL FIX: Manually fetch the User document to get updated photo
        if (application.userId) {
          try {
            console.log(`   🔄 Fetching User document: ${application.userId}`);
            const linkedUser = await User.findById(application.userId);
            
            if (linkedUser) {
              console.log(`   ✅ User found: ${linkedUser._id}`);
              console.log(`   User.photo exists: ${!!linkedUser.photo}`);
              console.log(`   User.photo length: ${linkedUser.photo ? linkedUser.photo.length : 0} chars`);
              console.log(`   User.photo preview: ${linkedUser.photo ? linkedUser.photo.substring(0, 50) : 'NO PHOTO'}...`);
              
              if (linkedUser.photo) {
                userPhoto = linkedUser.photo; // Use updated photo from User model
                console.log(`   📸 USING User.photo (${linkedUser.photo.length} chars) instead of Application.photo (${application.applicantInfo.photo ? application.applicantInfo.photo.length : 0} chars)`);
                console.log(`   Photos match: ${userPhoto === application.applicantInfo.photo ? 'YES ✅' : 'NO ❌ (User photo is different/updated)'}`);
              } else {
                console.log(`   ⚠️  User.photo is empty/null - falling back to Application.photo`);
              }
            } else {
              console.log(`   ❌ User ${application.userId} NOT FOUND in database`);
            }
          } catch (error) {
            console.error(`   ❌ ERROR fetching user photo for ${application.userId}:`, error.message);
            console.error(`   Error stack:`, error.stack);
          }
        } else {
          console.log(`   ⚠️  No userId linked - using Application.photo only`);
        }
        
        console.log(`   🎯 FINAL PHOTO LENGTH: ${userPhoto ? userPhoto.length : 0} chars`);
        console.log(`   Photo starts with: ${userPhoto ? userPhoto.substring(0, 30) : 'NO PHOTO'}...\n`);
        
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
        
        console.log(`   📤 SENDING TO FRONTEND for ${application.applicantInfo.name}:`);
        console.log(`      - applicantDetails.photo length: ${positionObj.applicantDetails.photo ? positionObj.applicantDetails.photo.length : 0} chars`);
        console.log(`      - Photo is base64: ${positionObj.applicantDetails.photo ? positionObj.applicantDetails.photo.startsWith('data:') : false}`);
        console.log(`      - Status: ${positionObj.status}`);
        
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
    
    console.log(`\n📊 FINAL RESPONSE SUMMARY:`);
    console.log(`   Total positions: ${finalPositions.length}`);
    const withApplicants = finalPositions.filter(p => p.applicantDetails);
    console.log(`   Positions with applicants: ${withApplicants.length}`);
    
    // Log each applicant's photo info
    withApplicants.forEach(p => {
      console.log(`   - ${p.applicantDetails.name} (${p.applicantDetails.phone}): Photo ${p.applicantDetails.photo ? p.applicantDetails.photo.length : 0} chars`);
    });
    console.log(`\n✅ Sending response to frontend\n`);
    
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

// ===========================================
// CUSTOM PRICING MANAGEMENT ENDPOINTS
// ===========================================

// Get custom pricing for a specific position
router.get('/:positionId/custom-pricing', async (req, res) => {
  try {
    const { positionId } = req.params;
    
    const position = await Position.findById(positionId);
    if (!position) {
      return res.status(404).json({ error: 'Position not found' });
    }
    
    // PRIORITY 1: Check new PricingOverride system (from Dynamic Pricing Manager)
    const override = await PricingOverride.findOne({ positionId, isActive: true });
    
    if (override) {
      // Use override tiers from Dynamic Pricing Manager
      return res.json({
        positionId: position._id,
        designation: position.designation,
        location: position.location,
        hasCustomPricing: true,
        customPricing: {
          enabled: true,
          tiers: override.overrideTiers,
          source: 'pricing-manager'  // Indicate source
        },
        defaultPricing: position.pricingTiers || []
      });
    }
    
    // PRIORITY 2: Fallback to old customPricing field (backward compatibility)
    res.json({
      positionId: position._id,
      designation: position.designation,
      location: position.location,
      hasCustomPricing: position.customPricing?.enabled || false,
      customPricing: position.customPricing || { enabled: false, tiers: [], source: 'legacy' },
      defaultPricing: position.pricingTiers || []
    });
  } catch (error) {
    console.error('Error fetching custom pricing:', error);
    res.status(500).json({ error: error.message });
  }
});

// Set or update custom pricing for a specific position
router.put('/:positionId/custom-pricing', async (req, res) => {
  try {
    const { positionId } = req.params;
    const { enabled, tiers } = req.body;
    
    // Validate tiers structure
    if (enabled && (!tiers || !Array.isArray(tiers) || tiers.length === 0)) {
      return res.status(400).json({ error: 'Tiers array is required when enabling custom pricing' });
    }
    
    // Validate each tier has required fields
    if (enabled) {
      for (const tier of tiers) {
        if (!tier.pay || !tier.profit || !tier.credit) {
          return res.status(400).json({ error: 'Each tier must have pay, profit, and credit values' });
        }
      }
    }
    
    const position = await Position.findByIdAndUpdate(
      positionId,
      {
        $set: {
          'customPricing.enabled': enabled,
          'customPricing.tiers': tiers || [],
          updatedAt: new Date()
        }
      },
      { new: true }
    );
    
    if (!position) {
      return res.status(404).json({ error: 'Position not found' });
    }
    
    console.log(`✅ Custom pricing ${enabled ? 'enabled' : 'disabled'} for position ${position.designation} (${positionId})`);
    
    res.json({
      success: true,
      message: `Custom pricing ${enabled ? 'enabled' : 'disabled'} successfully`,
      position: {
        _id: position._id,
        designation: position.designation,
        location: position.location,
        customPricing: position.customPricing
      }
    });
  } catch (error) {
    console.error('Error updating custom pricing:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete custom pricing for a position (reset to default)
router.delete('/:positionId/custom-pricing', async (req, res) => {
  try {
    const { positionId } = req.params;
    
    const position = await Position.findByIdAndUpdate(
      positionId,
      {
        $set: {
          'customPricing.enabled': false,
          'customPricing.tiers': [],
          updatedAt: new Date()
        }
      },
      { new: true }
    );
    
    if (!position) {
      return res.status(404).json({ error: 'Position not found' });
    }
    
    console.log(`✅ Custom pricing removed for position ${position.designation} (${positionId})`);
    
    res.json({
      success: true,
      message: 'Custom pricing removed successfully',
      position: {
        _id: position._id,
        designation: position.designation,
        location: position.location
      }
    });
  } catch (error) {
    console.error('Error removing custom pricing:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all positions with custom pricing (for admin overview)
router.get('/custom-pricing/all', async (req, res) => {
  try {
    const positions = await Position.find({
      'customPricing.enabled': true
    }).select('_id designation location customPricing pricingTiers status');
    
    res.json({
      count: positions.length,
      positions: positions
    });
  } catch (error) {
    console.error('Error fetching positions with custom pricing:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user by phone number (for ID card pincode fetch)
router.get('/user-by-phone/:phone', async (req, res) => {
  try {
    const User = require('../models/User');
    const { phone } = req.params;
    
    console.log('📞 Fetching user by phone:', phone);
    
    const user = await User.findOne({ phone: phone }).select('name phone email pincode photo');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('✅ Found user:', user.name, 'Pincode:', user.pincode);
    
    res.json({
      user: {
        name: user.name,
        phone: user.phone,
        email: user.email,
        pincode: user.pincode,
        photo: user.photo
      }
    });
  } catch (error) {
    console.error('❌ Error fetching user by phone:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get position hierarchy for ID card - returns all upper-level channel partners
router.get('/hierarchy/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    console.log(`📇 Fetching ID card hierarchy for phone: ${phone}`);
    
    const Application = require('../models/Application');
    const User = require('../models/User');
    
    // Find the user's approved application
    const userApp = await Application.findOne({ 
      'applicantInfo.phone': phone,
      status: 'approved'
    }).lean();
    
    if (!userApp) {
      return res.status(404).json({ error: 'No approved application found for this phone' });
    }
    
    console.log(`✅ Found user application:`, userApp.applicantInfo.name);
    console.log(`   Position: ${userApp.positionId}`);
    console.log(`   Location:`, userApp.location);
    
    // Determine the user's position level
    let userLevel = null;
    const posId = userApp.positionId || '';
    if (posId.includes('president')) userLevel = 'country';
    else if (posId.includes('zone-head')) userLevel = 'zone';
    else if (posId.includes('state-head')) userLevel = 'state';
    else if (posId.includes('division-head')) userLevel = 'division';
    else if (posId.includes('district-head')) userLevel = 'district';
    else if (posId.includes('tehsil-head')) userLevel = 'tehsil';
    else if (posId.includes('pincode-head')) userLevel = 'pincode';
    else if (posId.includes('village-head')) userLevel = 'village';
    
    console.log(`   User Level: ${userLevel}`);
    
    // Define hierarchy from top to bottom
    const hierarchyLevels = [
      'country',
      'zone',
      'state',
      'division',
      'district',
      'tehsil',
      'pincode',
      'village'
    ];
    
    const userLevelIndex = hierarchyLevels.indexOf(userLevel);
    
    // Build the hierarchy data for ID card
    const hierarchy = [];
    
    for (let i = 0; i < hierarchyLevels.length; i++) {
      const level = hierarchyLevels[i];
      const levelName = level.charAt(0).toUpperCase() + level.slice(1);
      
      // IMPORTANT: Only show area values for levels up to and including the user's position level
      // This prevents showing personal location data for positions the user doesn't hold
      let areaValue = '';
      if (i <= userLevelIndex) {
        // Only fill area if this level is at or above the user's position
        if (level === 'country') areaValue = 'India';
        else if (level === 'zone' && userApp.location.zone) areaValue = userApp.location.zone;
        else if (level === 'state' && userApp.location.state) areaValue = userApp.location.state;
        else if (level === 'division' && userApp.location.division) areaValue = userApp.location.division;
        else if (level === 'district' && userApp.location.district) areaValue = userApp.location.district;
        else if (level === 'tehsil' && userApp.location.tehsil) areaValue = userApp.location.tehsil;
        else if (level === 'pincode' && userApp.location.pincode) areaValue = userApp.location.pincode;
        else if (level === 'village' && userApp.location.village) areaValue = userApp.location.village;
      }
      
      let cpName = '';
      let cpMob = '';
      
      // For levels up to and including the user's level, find the CP
      if (i <= userLevelIndex && areaValue) {
        // Build query to find the channel partner at this level
        const query = { status: 'approved' };
        
        if (level === 'country') {
          query.positionId = { $regex: /president/ };
        } else if (level === 'zone' && userApp.location.zone) {
          query.positionId = { $regex: new RegExp(`zone-head.*${userApp.location.zone.replace(/\s/g, '-').toLowerCase()}`, 'i') };
        } else if (level === 'state' && userApp.location.state) {
          query.positionId = { $regex: new RegExp(`state-head.*${userApp.location.state.replace(/\s/g, '-').toLowerCase()}`, 'i') };
        } else if (level === 'division' && userApp.location.division) {
          query.positionId = { $regex: new RegExp(`division-head.*${userApp.location.division.replace(/\s/g, '-').toLowerCase()}`, 'i') };
        } else if (level === 'district' && userApp.location.district) {
          query.positionId = { $regex: new RegExp(`district-head.*${userApp.location.district.replace(/\s/g, '-').toLowerCase()}`, 'i') };
        } else if (level === 'tehsil' && userApp.location.tehsil) {
          query.positionId = { $regex: new RegExp(`tehsil-head.*${userApp.location.tehsil.replace(/\s/g, '-').toLowerCase()}`, 'i') };
        } else if (level === 'pincode' && userApp.location.pincode) {
          query.positionId = { $regex: new RegExp(`pincode-head.*${userApp.location.pincode.replace(/\s/g, '-').toLowerCase()}`, 'i') };
        } else if (level === 'village' && userApp.location.village) {
          query.positionId = { $regex: new RegExp(`village-head.*${userApp.location.village.replace(/\s/g, '-').toLowerCase()}`, 'i') };
        }
        
        const cpApp = await Application.findOne(query).lean();
        
        if (cpApp) {
          cpName = cpApp.applicantInfo.name;
          cpMob = cpApp.applicantInfo.phone;
          console.log(`   ${levelName}: ${cpName} (${cpMob})`);
        }
      }
      
      hierarchy.push({
        position: levelName,
        area: areaValue,
        cpName: cpName,
        cpMob: cpMob,
        isCurrentUser: i === userLevelIndex
      });
    }
    
    console.log(`✅ Hierarchy built with ${hierarchy.length} levels`);
    
    res.json({
      success: true,
      user: {
        name: userApp.applicantInfo.name,
        phone: userApp.applicantInfo.phone,
        pincode: userApp.location.pincode || userApp.applicantInfo.pincode || 'N/A'
      },
      userLevel: userLevel,
      hierarchy: hierarchy
    });
    
  } catch (error) {
    console.error('❌ Error fetching position hierarchy:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
