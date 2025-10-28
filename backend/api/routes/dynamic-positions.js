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

// Helper function to create position with application status check
async function createPositionWithApplicationStatus(sNo, post, designation, location) {
  try {
    // Create a unique identifier for this position based on location
    const locationKey = Object.values(location).filter(v => v).join('_').toLowerCase().replace(/\s+/g, '_');
    const positionId = `pos_${locationKey}`;
    
    // Check if someone has already applied for this exact position
    const existingApplication = await Application.findOne({
      'location.country': location.country,
      'location.zone': location.zone || null,
      'location.state': location.state || null,
      'location.division': location.division || null,
      'location.district': location.district || null,
      'location.tehsil': location.tehsil || null,
      'location.pincode': location.pincode || null,
      'location.village': location.village || null
    });
    
    const position = {
      _id: positionId,
      sNo,
      post,
      designation,
      location,
      contribution: 10000,
      credits: 60000,
      isTemplate: true, // Mark as dynamically generated
      status: 'Available'
    };
    
    if (existingApplication) {
      // Position has been applied for - show applicant details
      console.log(`✅ Found application for ${designation}: ${existingApplication.applicantInfo.name}`);
      
      position.status = existingApplication.status === 'pending' ? 'Pending' : 
                       existingApplication.status === 'approved' ? 'Approved' : 'Verified';
      
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
        introducedCount: 0,
        days: Math.floor((new Date() - new Date(existingApplication.appliedDate)) / (1000 * 60 * 60 * 24)),
        applicationId: existingApplication._id,
        paymentStatus: existingApplication.paymentStatus || 'pending',
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
    
    // Return basic available position if error
    return {
      _id: `pos_${sNo}_${Date.now()}`,
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

module.exports = router;
