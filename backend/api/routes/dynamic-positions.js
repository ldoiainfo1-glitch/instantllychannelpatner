const express = require('express');
const router = express.Router();
const Location = require('../models/Location');
const Application = require('../models/Application');

// Get available positions dynamically based on location filters
router.get('/', async (req, res) => {
  try {
    const { 
      country = 'India', 
      zone, 
      state, 
      division, 
      district, 
      tehsil, 
      pincode, 
      village 
    } = req.query;
    
    console.log('🎯 Generating dynamic positions for:', { country, zone, state, division, district, tehsil, pincode, village });
    
    let positions = [];
    let sNo = 1;
    
    // Generate positions based on location hierarchy
    if (village) {
      // Village level - show this specific village position
      positions.push(await createPositionWithApplicationStatus(sNo++, 'Committee', `Head of ${village}`, { country, zone, state, division, district, tehsil, pincode, village }));
    } else if (pincode) {
      // Pincode level - show villages under this pincode + pincode head
      positions.push(await createPositionWithApplicationStatus(sNo++, 'Committee', `Head of ${pincode}`, { country, zone, state, division, district, tehsil, pincode }));
      
      // Add some sample villages for this pincode
      const sampleVillages = [`${pincode} Village A`, `${pincode} Village B`, `${pincode} Village C`];
      for (const village of sampleVillages) {
        positions.push(await createPositionWithApplicationStatus(sNo++, 'Committee', `Head of ${village}`, { country, zone, state, division, district, tehsil, pincode, village }));
      }
    } else if (tehsil) {
      // Tehsil level - show tehsil head + sample pincodes
      positions.push(await createPositionWithApplicationStatus(sNo++, 'Committee', `Head of ${tehsil}`, { country, zone, state, division, district, tehsil }));
      
      // Add sample pincodes for this tehsil
      const basePincode = Math.floor(Math.random() * 900000) + 100000; // Generate base pincode
      for (let i = 0; i < 5; i++) {
        const pincode = (basePincode + i).toString();
        positions.push(await createPositionWithApplicationStatus(sNo++, 'Committee', `Head of ${pincode}`, { country, zone, state, division, district, tehsil, pincode }));
      }
    } else if (district) {
      // District level - show district head + sample tehsils
      positions.push(await createPositionWithApplicationStatus(sNo++, 'Committee', `Head of ${district}`, { country, zone, state, division, district }));
      
      // Add sample tehsils for this district
      const sampleTehsils = [`${district} East`, `${district} West`, `${district} North`, `${district} South`, `${district} Central`];
      for (const tehsil of sampleTehsils) {
        positions.push(await createPositionWithApplicationStatus(sNo++, 'Committee', `Head of ${tehsil}`, { country, zone, state, division, district, tehsil }));
      }
    } else if (division) {
      // Division level - show division head + sample districts
      positions.push(await createPositionWithApplicationStatus(sNo++, 'Committee', `Head of ${division}`, { country, zone, state, division }));
      
      // Add sample districts for this division
      const sampleDistricts = [`${division} District 1`, `${division} District 2`, `${division} District 3`];
      for (const district of sampleDistricts) {
        positions.push(await createPositionWithApplicationStatus(sNo++, 'Committee', `Head of ${district}`, { country, zone, state, division, district }));
      }
    } else if (state) {
      // State level - show state head + sample divisions
      positions.push(await createPositionWithApplicationStatus(sNo++, 'Committee', `Head of ${state}`, { country, zone, state }));
      
      // Add sample divisions for this state
      const sampleDivisions = [`${state} North Division`, `${state} South Division`, `${state} East Division`, `${state} West Division`];
      for (const division of sampleDivisions) {
        positions.push(await createPositionWithApplicationStatus(sNo++, 'Committee', `Head of ${division}`, { country, zone, state, division }));
      }
    } else if (zone) {
      // Zone level - show zone head + states from location data
      positions.push(await createPositionWithApplicationStatus(sNo++, 'Committee', `Head of ${zone}`, { country, zone }));
      
      try {
        // Get actual states for this zone from location data
        const states = await Location.distinct('state', { zone, state: { $ne: null, $ne: '' } });
        console.log(`📍 Found ${states.length} states for zone ${zone}:`, states.slice(0, 5));
        
        // Show first few states
        for (const state of states.slice(0, 10)) {
          positions.push(await createPositionWithApplicationStatus(sNo++, 'Committee', `Head of ${state}`, { country, zone, state }));
        }
      } catch (error) {
        console.log('⚠️ Could not load states from Location model, using sample data');
        // Fallback to sample states
        const sampleStates = zone === 'South India' ? ['Goa', 'Karnataka', 'Tamil Nadu', 'Kerala', 'Andhra Pradesh'] :
                           zone === 'North India' ? ['Delhi', 'Punjab', 'Haryana', 'Uttar Pradesh', 'Rajasthan'] :
                           zone === 'East India' ? ['West Bengal', 'Odisha', 'Jharkhand', 'Bihar', 'Assam'] :
                           zone === 'West India' ? ['Maharashtra', 'Gujarat', 'Madhya Pradesh', 'Rajasthan'] :
                           zone === 'Central India' ? ['Madhya Pradesh', 'Chhattisgarh', 'Uttar Pradesh'] :
                           ['Sample State 1', 'Sample State 2', 'Sample State 3'];
        
        for (const state of sampleStates) {
          positions.push(await createPositionWithApplicationStatus(sNo++, 'Committee', `Head of ${state}`, { country, zone, state }));
        }
      }
    } else {
      // Country level - show President + all zones
      positions.push(await createPositionWithApplicationStatus(sNo++, 'Committee', `President of ${country}`, { country }));
      
      const zones = ['North India', 'South India', 'East India', 'West India', 'Central India', 'Northeast India'];
      for (const zone of zones) {
        positions.push(await createPositionWithApplicationStatus(sNo++, 'Committee', `Head of ${zone}`, { country, zone }));
      }
    }
    
    // Re-number sNo
    positions.forEach((p, index) => {
      p.sNo = index + 1;
    });
    
    console.log(`📊 Generated ${positions.length} dynamic positions`);
    res.json(positions);
  } catch (error) {
    console.error('❌ Error generating dynamic positions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific position status by position ID (real-time)
router.get('/status/:positionId', async (req, res) => {
  try {
    const { positionId } = req.params;
    console.log('🔍 Checking real-time status for position:', positionId);
    
    // Find application for this position ID
    const application = await Application.findOne({ positionId: positionId });
    
    if (application) {
      res.json({
        positionId: positionId,
        status: 'occupied',
        applicationStatus: application.status,
        applicant: {
          name: application.applicantInfo.name,
          phone: application.applicantInfo.phone,
          appliedDate: application.appliedDate,
          days: Math.floor((new Date() - new Date(application.appliedDate)) / (1000 * 60 * 60 * 24))
        }
      });
    } else {
      res.json({
        positionId: positionId,
        status: 'available',
        applicationStatus: null,
        applicant: null
      });
    }
  } catch (error) {
    console.error('❌ Error checking position status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all applications grouped by position ID
router.get('/applications-by-position', async (req, res) => {
  try {
    console.log('📊 Getting all applications grouped by position ID');
    
    const applications = await Application.find({}).sort({ appliedDate: -1 });
    
    const groupedByPosition = {};
    applications.forEach(app => {
      const posId = app.positionId || 'no-position-id';
      if (!groupedByPosition[posId]) {
        groupedByPosition[posId] = [];
      }
      groupedByPosition[posId].push({
        applicationId: app._id,
        applicantName: app.applicantInfo.name,
        phone: app.applicantInfo.phone,
        status: app.status,
        appliedDate: app.appliedDate,
        location: app.location
      });
    });
    
    res.json({
      totalApplications: applications.length,
      positionsWithApplications: Object.keys(groupedByPosition).length,
      applicationsByPosition: groupedByPosition
    });
  } catch (error) {
    console.error('❌ Error grouping applications by position:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test position ID generation
router.get('/test-position-id', (req, res) => {
  const testCases = [
    { location: { country: 'India' }, designation: 'President of India' },
    { location: { country: 'India', zone: 'South India' }, designation: 'Head of South India' },
    { location: { country: 'India', zone: 'South India', state: 'Goa' }, designation: 'Head of Goa' },
    { location: { country: 'India', zone: 'West India', state: 'Maharashtra', pincode: '400011' }, designation: 'Head of 400011' }
  ];
  
  const results = testCases.map(test => ({
    location: test.location,
    designation: test.designation,
    generatedId: generatePositionId(test.location, test.designation)
  }));
  
  res.json({ testResults: results });
});

// Helper function to create position with application status check
async function createPositionWithApplicationStatus(sNo, post, designation, location) {
  try {
    // Create a unique, consistent position ID based on location hierarchy
    const positionId = generatePositionId(location, designation);
    
    console.log('🔍 Generated position ID for', designation, ':', positionId);
    console.log('🔍 Location used:', JSON.stringify(location));
    
    // Validate that we got a proper position ID
    if (!positionId || positionId.includes('_1761') || positionId.startsWith('pos_1_')) {
      console.error('❌ Invalid position ID generated:', positionId);
      console.error('❌ This indicates the generatePositionId function is not working properly');
    }
    
    // Check if someone has already applied for this exact position using position ID
    let existingApplication = await Application.findOne({ 
      positionId: positionId 
    });
    
    // If no application found with position ID, try legacy location-based matching (for old applications)
    if (!existingApplication) {
      let matchQuery = {
        'location.country': location.country || 'India'
      };
      
      // Only add location filters if they have values (not empty/null/undefined)
      if (location.zone) matchQuery['location.zone'] = location.zone;
      if (location.state) matchQuery['location.state'] = location.state;
      if (location.division) matchQuery['location.division'] = location.division;
      if (location.district) matchQuery['location.district'] = location.district;
      if (location.tehsil) matchQuery['location.tehsil'] = location.tehsil;
      if (location.pincode) matchQuery['location.pincode'] = location.pincode;
      if (location.village) matchQuery['location.village'] = location.village;
      
      // For positions without specific location requirements, match applications with undefined/null values
      if (!location.zone && !location.state && !location.division && !location.district && !location.tehsil && !location.pincode && !location.village) {
        // This is a country-level position (like President), match apps with only country set
        matchQuery = {
          'location.country': 'India',
          $or: [
            { 'location.zone': { $in: [null, undefined] } },
            { 'location.zone': { $exists: false } }
          ]
        };
      }
      
      existingApplication = await Application.findOne(matchQuery);
      
      // If found through legacy matching, update it with the correct position ID
      if (existingApplication) {
        console.log('� Updating legacy application with position ID:', positionId);
        existingApplication.positionId = positionId;
        await existingApplication.save();
      }
    }
    
    console.log('🔍 Position ID:', positionId, 'Application:', existingApplication ? existingApplication.applicantInfo.name : 'None');
    
    // If no exact match and this is a more specific position, try broader matches
    if (!existingApplication && (location.zone || location.state || location.district)) {
      console.log('🔍 No exact match found, trying broader search...');
      // For specific location positions, we already have the exact matching above
      // This section can be used for future enhancements
    }
    
    const position = {
      _id: positionId, // Use the generated position ID as the main ID
      sNo,
      post,
      designation,
      location,
      contribution: 10000,
      credits: 60000,
      isTemplate: true, // Mark as dynamically generated
      status: 'Available'
      // Don't duplicate positionId field - use _id as the position identifier
    };
    
    if (existingApplication) {
      // Position has been applied for - show applicant details
      console.log(`✅ Found application for ${designation}: ${existingApplication.applicantInfo.name}`);
      
      position.status = existingApplication.status === 'pending' ? 'Pending' : 
                       existingApplication.status === 'approved' ? 'Approved' : 'Verified';
      
      // Get THIS applicant's introduced count (how many people they referred)
      let applicantIntroducedCount = 0;
      const User = require('../models/User');
      
      // Try to find the applicant in Users collection (if approved)
      console.log(`🔍 Checking introducedCount for ${existingApplication.applicantInfo.name}`);
      const applicantUser = await User.findOne({ phone: existingApplication.applicantInfo.phone });
      if (applicantUser) {
        applicantIntroducedCount = applicantUser.introducedCount || 0;
      } else {
        // If not in Users (pending), check their person code in Application
        if (existingApplication.personCode) {
          // Count how many people used THIS applicant's referral code
          const referralCount = await Application.countDocuments({ 
            introducedBy: existingApplication.personCode 
          });
          applicantIntroducedCount = referralCount;
        }
      }
      
      position.applicantDetails = {
        name: existingApplication.applicantInfo.name,
        phone: existingApplication.applicantInfo.phone,
        email: existingApplication.applicantInfo.email,
        photo: existingApplication.applicantInfo.photo,
        address: existingApplication.applicantInfo.address,
        companyName: existingApplication.applicantInfo.companyName,
        businessName: existingApplication.applicantInfo.businessName,
        appliedDate: existingApplication.appliedDate,
        introducedBy: existingApplication.introducedBy || 'Self',
        introducedCount: applicantIntroducedCount, // How many people THIS person referred
        days: Math.floor((new Date() - new Date(existingApplication.appliedDate)) / (1000 * 60 * 60 * 24)),
        applicationId: existingApplication._id,
        isVerified: existingApplication.isVerified || false
      };
    } else {
      // Position is available for application
      console.log(`💼 Position available: ${designation}`);
      position.applicantDetails = null;
    }
    
    return position;
  } catch (error) {
    console.error('Error checking application status for position:', error);
    
    // Return basic available position if error (still use proper position ID)
    const fallbackPositionId = generatePositionId(location, designation);
    return {
      _id: fallbackPositionId,
      sNo,
      post,
      designation,
      location,
      contribution: 10000,
      credits: 60000,
      status: 'Available',
      isTemplate: true,
      applicantDetails: null
    };
  }
}

// Generate consistent position ID based on location hierarchy
function generatePositionId(location, designation) {
  const parts = [];
  
  // Build hierarchical position ID
  if (location.country) parts.push(location.country.toLowerCase().replace(/\s+/g, '-'));
  if (location.zone) parts.push(location.zone.toLowerCase().replace(/\s+/g, '-'));
  if (location.state) parts.push(location.state.toLowerCase().replace(/\s+/g, '-'));
  if (location.division) parts.push(location.division.toLowerCase().replace(/\s+/g, '-'));
  if (location.district) parts.push(location.district.toLowerCase().replace(/\s+/g, '-'));
  if (location.tehsil) parts.push(location.tehsil.toLowerCase().replace(/\s+/g, '-'));
  if (location.pincode) parts.push(location.pincode.toLowerCase().replace(/\s+/g, '-'));
  if (location.village) parts.push(location.village.toLowerCase().replace(/\s+/g, '-'));
  
  // Determine position type
  let positionType = 'president';
  if (location.village) positionType = 'village-head';
  else if (location.pincode) positionType = 'pincode-head';
  else if (location.tehsil) positionType = 'tehsil-head';
  else if (location.district) positionType = 'district-head';
  else if (location.division) positionType = 'division-head';
  else if (location.state) positionType = 'state-head';
  else if (location.zone) positionType = 'zone-head';
  
  // Create unique position ID: pos_type_location-hierarchy
  const locationPath = parts.join('_');
  return `pos_${positionType}_${locationPath}`;
}

module.exports = router;
