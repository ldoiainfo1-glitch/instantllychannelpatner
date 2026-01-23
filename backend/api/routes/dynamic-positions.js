const express = require('express');
const router = express.Router();
const Location = require('../models/Location');
const Application = require('../models/Application');

// NEW: Get position statistics - counts approved applications at each level
router.get('/statistics', async (req, res) => {
  try {
    console.log('📊 Fetching position statistics from approved applications...');
    
    // Get all approved applications
    const approvedApplications = await Application.find({ 
      status: 'approved' 
    }).select('positionId').lean();
    
    console.log(`✅ Found ${approvedApplications.length} approved applications`);
    
    // Count positions at each level by parsing positionId
    const stats = {
      country: 0,
      zone: 0,
      state: 0,
      division: 0,
      district: 0,
      tehsil: 0,
      pincode: 0,
      village: 0
    };
    
    approvedApplications.forEach(app => {
      const posId = app.positionId || '';
      console.log(`Parsing positionId: ${posId}`);
      
      // Format: pos_level-head_india_zone_state_...
      // Extract level from position ID
      if (posId.includes('president')) {
        stats.country++;
      } else if (posId.includes('zone-head')) {
        stats.zone++;
      } else if (posId.includes('state-head')) {
        stats.state++;
      } else if (posId.includes('division-head')) {
        stats.division++;
      } else if (posId.includes('district-head')) {
        stats.district++;
      } else if (posId.includes('tehsil-head')) {
        stats.tehsil++;
      } else if (posId.includes('pincode-head')) {
        stats.pincode++;
      } else if (posId.includes('village-head')) {
        stats.village++;
      }
    });
    
    console.log('📈 Statistics calculated:', stats);
    
    res.json({
      success: true,
      givenPositions: stats
    });
  } catch (error) {
    console.error('❌ Error fetching position statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

// NEW: Global search endpoint - searches across all approved applications by name or phone
router.get('/search', async (req, res) => {
  try {
    const { name, phone } = req.query;
    
    console.log('🔍 GLOBAL SEARCH REQUEST:', { name, phone });
    
    if (!name && !phone) {
      return res.status(400).json({ error: 'Please provide name or phone to search' });
    }
    
    // Build search query
    const searchQuery = {
      status: 'approved'
    };
    
    // Add name search (case-insensitive, partial match)
    if (name) {
      searchQuery['applicantInfo.name'] = { $regex: name, $options: 'i' };
    }
    
    // Add phone search (exact or partial match)
    if (phone) {
      searchQuery['applicantInfo.phone'] = { $regex: phone };
    }
    
    console.log('🔎 Searching applications with query:', JSON.stringify(searchQuery));
    
    // Find matching applications
    const applications = await Application.find(searchQuery)
      .limit(50) // Limit to prevent huge results
      .lean();
    
    console.log(`✅ Found ${applications.length} matching applications`);
    
    // Get user data for photos and referral counts
    const User = require('../models/User');
    const phoneNumbers = applications.map(app => app.applicantInfo?.phone).filter(Boolean);
    const users = await User.find({ phone: { $in: phoneNumbers } }).select('phone photo introducedCount').lean();
    
    const userMap = {};
    users.forEach(user => {
      userMap[user.phone] = user;
    });
    
    // Build positions from applications
    const positions = [];
    let sNo = 1;
    
    for (const app of applications) {
      // Parse location from positionId
      const location = parseLocationFromPositionId(app.positionId);
      
      const user = userMap[app.applicantInfo.phone];
      const userPhoto = user?.photo || app.applicantInfo.photo;
      const introducedCount = user?.introducedCount || 0;
      
      const position = {
        _id: app.positionId,
        sNo: sNo++,
        post: 'Committee',
        designation: `Head of ${location.area}`,
        location: location,
        status: 'Approved',
        applicantDetails: {
          name: app.applicantInfo.name,
          phone: app.applicantInfo.phone,
          email: app.applicantInfo.email,
          photo: userPhoto,
          address: app.applicantInfo.address,
          introducedCount: introducedCount,
          days: app.appliedDate ? Math.floor((Date.now() - new Date(app.appliedDate).getTime()) / (1000 * 60 * 60 * 24)) : 0
        }
      };
      
      positions.push(position);
    }
    
    console.log(`✅ Returning ${positions.length} positions from search`);
    
    res.json({
      success: true,
      positions: positions,
      total: positions.length
    });
    
  } catch (error) {
    console.error('❌ Error in global search:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to parse location from positionId
function parseLocationFromPositionId(positionId) {
  // Format: pos_level-head_country_zone_state_division_district_tehsil_pincode_village
  const parts = positionId.split('_');
  
  const location = { country: 'India' };
  let area = '';
  
  // Skip first part (pos) and second part (level-head)
  for (let i = 2; i < parts.length; i++) {
    const part = parts[i];
    
    // Determine which level this is based on position
    if (i === 2) location.country = part;
    else if (i === 3 && part.toLowerCase().includes('zone')) {
      location.zone = part.replace(/-/g, ' ');
      area = location.zone;
    }
    else if (i === 4) {
      location.state = part.replace(/-/g, ' ');
      area = location.state;
    }
    else if (i === 5 && part.toLowerCase().includes('division')) {
      location.division = part.replace(/-/g, ' ');
      area = location.division;
    }
    else if (i === 6) {
      location.district = part.replace(/-/g, ' ');
      area = location.district;
    }
    else if (i === 7) {
      location.tehsil = part.replace(/-/g, ' ');
      area = location.tehsil;
    }
    else if (i === 8) {
      location.pincode = part;
      area = location.pincode;
    }
    else if (i === 9) {
      location.village = part.replace(/-/g, ' ');
      area = location.village;
    }
  }
  
  location.area = area || location.country;
  return location;
}

// Get available positions dynamically based on location filters.
router.get('/', async (req, res) => {
  try {
    let { 
      country = 'India', 
      zone, 
      state, 
      division, 
      district, 
      tehsil, 
      pincode, 
      village 
    } = req.query;
    
    console.log('\n========================================');
    console.log('🎯 NEW REQUEST - Generating dynamic positions');
    console.log('========================================');
    console.log('📥 Query Parameters Received:');
    console.log('   country:', country);
    console.log('   zone:', zone);
    console.log('   state:', state);
    console.log('   division:', division);
    console.log('   district:', district);
    console.log('   tehsil:', tehsil);
    console.log('   pincode:', pincode);
    console.log('   village:', village);
    console.log('========================================\n');
    
    // 🔍 AUTO-COMPLETE LOCATION HIERARCHY: If lower-level location is provided without parents,
    // look up the complete hierarchy from the Location collection
    if ((division || district || tehsil || pincode || village) && (!zone || !state || (division && !division))) {
      console.log('🔍 INCOMPLETE HIERARCHY DETECTED - Looking up parent locations...');
      const query = {};
      if (village) query.village = village;
      else if (pincode) query.pincode = pincode;
      else if (tehsil) query.tehsil = tehsil;
      else if (district) query.district = district;
      else if (division) query.division = division;
      
      const locationDoc = await Location.findOne(query).lean();
      if (locationDoc) {
        console.log('✅ Found complete location hierarchy in database:');
        console.log(`   Zone: ${locationDoc.zone}`);
        console.log(`   State: ${locationDoc.state}`);
        console.log(`   Division: ${locationDoc.division}`);
        console.log(`   District: ${locationDoc.district || '-'}`);
        
        // Auto-fill ONLY missing PARENT levels (not child levels!)
        // This prevents accidentally jumping to a child location
        if (!zone && locationDoc.zone) {
          zone = locationDoc.zone;
          console.log(`   ✓ Auto-filled zone: ${zone}`);
        }
        if (!state && locationDoc.state) {
          state = locationDoc.state;
          console.log(`   ✓ Auto-filled state: ${state}`);
        }
        // Only auto-fill division if we're at district/tehsil/pincode/village level
        if (!division && locationDoc.division && (district || tehsil || pincode || village)) {
          division = locationDoc.division;
          console.log(`   ✓ Auto-filled division: ${division}`);
        }
        // Only auto-fill district if we're at tehsil/pincode/village level  
        if (!district && locationDoc.district && (tehsil || pincode || village)) {
          district = locationDoc.district;
          console.log(`   ✓ Auto-filled district: ${district}`);
        }
        // Only auto-fill tehsil if we're at pincode/village level
        if (!tehsil && locationDoc.tehsil && (pincode || village)) {
          tehsil = locationDoc.tehsil;
          console.log(`   ✓ Auto-filled tehsil: ${tehsil}`);
        }
        // Only auto-fill pincode if we're at village level
        if (!pincode && locationDoc.pincode && village) {
          pincode = locationDoc.pincode;
          console.log(`   ✓ Auto-filled pincode: ${pincode}`);
        }
      } else {
        console.log('⚠️ Location not found in database - using provided parameters only');
      }
    }
    
    let positions = [];
    let sNo = 1;
    
    // PERFORMANCE OPTIMIZATION: Collect all position IDs first, then batch fetch applications
    const positionsToGenerate = [];
    
    // Generate positions based on location hierarchy
    if (village) {
      // Village level - show this specific village position
      positionsToGenerate.push({ sNo: sNo++, post: 'Committee', designation: `Head of ${village}`, location: { country, zone, state, division, district, tehsil, pincode, village } });
    } else if (pincode) {
      // Pincode level - show villages under this pincode + pincode head
      positionsToGenerate.push({ sNo: sNo++, post: 'Committee', designation: `Head of ${pincode}`, location: { country, zone, state, division, district, tehsil, pincode } });
      
      // Get real villages from database for this pincode
      const realVillages = await Location.find({ pincode }).distinct('village');
      console.log(`   Found ${realVillages.length} real villages for pincode ${pincode}:`, realVillages);
      for (const village of realVillages) {
        if (village) {
          positionsToGenerate.push({ sNo: sNo++, post: 'Committee', designation: `Head of ${village}`, location: { country, zone, state, division, district, tehsil, pincode, village } });
        }
      }
    } else if (tehsil) {
      // Tehsil level - show tehsil head + real pincodes from database
      console.log('\n🔍 TEHSIL LEVEL - Building positions');
      console.log('   Creating tehsil head with location:', { country, zone, state, division, district, tehsil });
      
      positionsToGenerate.push({ sNo: sNo++, post: 'Committee', designation: `Head of ${tehsil}`, location: { country, zone, state, division, district, tehsil } });
      
      // Get real pincodes from database for this tehsil
      const realPincodes = await Location.find({ tehsil }).distinct('pincode');
      console.log(`   Found ${realPincodes.length} real pincodes for tehsil ${tehsil}:`, realPincodes.slice(0, 10));
      
      for (const pincode of realPincodes) {
        if (pincode) {
          const pincodeLocation = { country, zone, state, division, district, tehsil, pincode };
          positionsToGenerate.push({ sNo: sNo++, post: 'Committee', designation: `Head of ${pincode}`, location: pincodeLocation });
        }
      }
    } else if (district) {
      // District level - show district head + real tehsils from database
      positionsToGenerate.push({ sNo: sNo++, post: 'Committee', designation: `Head of ${district}`, location: { country, zone, state, division, district } });
      
      // Get real tehsils from database for this district
      const realTehsils = await Location.find({ district }).distinct('tehsil');
      console.log(`   Found ${realTehsils.length} real tehsils for district ${district}:`, realTehsils);
      for (const tehsil of realTehsils) {
        if (tehsil) {
          positionsToGenerate.push({ sNo: sNo++, post: 'Committee', designation: `Head of ${tehsil}`, location: { country, zone, state, division, district, tehsil } });
        }
      }
    } else if (division) {
      // Division level - show division head + real districts from database
      positionsToGenerate.push({ sNo: sNo++, post: 'Committee', designation: `Head of ${division}`, location: { country, zone, state, division } });
      
      // Get real districts from database for this division
      const realDistricts = await Location.find({ division }).distinct('district');
      console.log(`   Found ${realDistricts.length} real districts for division ${division}:`, realDistricts);
      for (const district of realDistricts) {
        if (district) {
          positionsToGenerate.push({ sNo: sNo++, post: 'Committee', designation: `Head of ${district}`, location: { country, zone, state, division, district } });
        }
      }
    } else if (state) {
      // State level - show state head + real divisions from database
      positionsToGenerate.push({ sNo: sNo++, post: 'Committee', designation: `Head of ${state}`, location: { country, zone, state } });
      
      // Get real divisions from database for this state
      const realDivisions = await Location.find({ state }).distinct('division');
      console.log(`   Found ${realDivisions.length} real divisions for state ${state}:`, realDivisions);
      for (const division of realDivisions) {
        if (division) {
          positionsToGenerate.push({ sNo: sNo++, post: 'Committee', designation: `Head of ${division}`, location: { country, zone, state, division } });
        }
      }
    } else if (zone) {
      // Zone level - show zone head + states from location data
      positionsToGenerate.push({ sNo: sNo++, post: 'Committee', designation: `Head of ${zone}`, location: { country, zone } });
      
      try {
        // Get actual states for this zone from location data
        const states = await Location.distinct('state', { zone, state: { $ne: null, $ne: '' } });
        console.log(`📍 Found ${states.length} states for zone ${zone}:`, states.slice(0, 5));
        
        // Show first few states
        for (const state of states.slice(0, 10)) {
          positionsToGenerate.push({ sNo: sNo++, post: 'Committee', designation: `Head of ${state}`, location: { country, zone, state } });
        }
      } catch (error) {
        console.log('⚠️ Could not load states from Location model, using sample data');
        const sampleStates = zone === 'South' ? ['Goa', 'Karnataka', 'Tamil Nadu', 'Kerala', 'Andhra Pradesh'] :
                           zone === 'North' ? ['Delhi', 'Punjab', 'Haryana', 'Uttar Pradesh', 'Rajasthan'] :
                           zone === 'East' ? ['West Bengal', 'Odisha', 'Jharkhand', 'Bihar', 'Assam'] :
                           zone === 'Western' ? ['Maharashtra', 'Gujarat', 'Madhya Pradesh', 'Rajasthan'] :
                           zone === 'Central' ? ['Madhya Pradesh', 'Chhattisgarh', 'Uttar Pradesh'] :
                           zone === 'North East' ? ['Assam', 'Meghalaya', 'Manipur', 'Tripura', 'Nagaland'] :
                           ['Sample State 1', 'Sample State 2', 'Sample State 3'];
        
        for (const state of sampleStates) {
          positionsToGenerate.push({ sNo: sNo++, post: 'Committee', designation: `Head of ${state}`, location: { country, zone, state } });
        }
      }
    } else {
      // Country level - show President + all zones
      positionsToGenerate.push({ sNo: sNo++, post: 'Committee', designation: `President of ${country}`, location: { country } });
      
      try {
        // Get actual zones from location data
        const zonesFromDB = await Location.distinct('zone', { zone: { $ne: null, $ne: '' } });
        console.log(`📍 Found ${zonesFromDB.length} zones from database:`, zonesFromDB);
        
        for (const zone of zonesFromDB.sort()) {
          positionsToGenerate.push({ sNo: sNo++, post: 'Committee', designation: `Head of ${zone}`, location: { country, zone } });
        }
      } catch (error) {
        console.log('⚠️ Could not load zones from Location model, using fallback');
        const zones = ['North', 'South', 'East', 'Western', 'Central', 'North East'];
        for (const zone of zones) {
          positionsToGenerate.push({ sNo: sNo++, post: 'Committee', designation: `Head of ${zone}`, location: { country, zone } });
        }
      }
    }
    
    // 🚀 BATCH OPTIMIZATION: Generate all position IDs ONCE and store them
    console.log('\n📋 POSITION ID GENERATION:');
    positionsToGenerate.forEach((p, index) => {
      p.positionId = generatePositionId(p.location, p.designation);
      if (index < 3) { // Log first 3 for debugging
        console.log(`   [${index + 1}] ${p.designation}`);
        console.log(`       Location: ${JSON.stringify(p.location)}`);
        console.log(`       Generated ID: ${p.positionId}`);
      }
    });
    console.log(`   Total positions to generate: ${positionsToGenerate.length}\n`);
    
    const positionIds = positionsToGenerate.map(p => p.positionId);
    console.log(`⚡ Batch fetching applications for ${positionIds.length} positions...`);
    
    // Fetch all applications at once
    const applications = await Application.find({ 
      positionId: { $in: positionIds } 
    }).lean();
    
    console.log(`\n📊 APPLICATION RESULTS:`);
    console.log(`   Found ${applications.length} approved applications`);
    if (applications.length > 0) {
      applications.forEach((app, index) => {
        console.log(`   [${index + 1}] ${app.applicantInfo?.name || 'Unknown'} - ${app.positionId}`);
      });
    }
    console.log('');
    
    // Create a map for O(1) lookup
    const applicationMap = {};
    applications.forEach(app => {
      applicationMap[app.positionId] = app;
    });
    
    // Get all unique phone numbers to batch fetch users
    const phoneNumbers = applications.map(app => app.applicantInfo?.phone).filter(Boolean);
    const User = require('../models/User');
    const users = await User.find({ phone: { $in: phoneNumbers } }).select('phone photo introducedCount').lean();
    
    // Create user map for O(1) lookup
    const userMap = {};
    users.forEach(user => {
      userMap[user.phone] = user;
    });
    
    console.log(`✅ Batch fetched ${applications.length} applications and ${users.length} users`);
    
    // Now create positions with pre-fetched data (NO additional DB queries, NO re-generating IDs)
    for (const posData of positionsToGenerate) {
      const positionId = posData.positionId; // Use pre-generated ID
      const application = applicationMap[positionId];
      
      const position = {
        _id: positionId,
        sNo: posData.sNo,
        post: posData.post,
        designation: posData.designation,
        location: posData.location,
        contribution: 10000,
        credits: 60000,
        isTemplate: true,
        status: 'Available'
      };
      
      if (application) {
        position.status = application.status === 'pending' ? 'Pending' : 
                         application.status === 'approved' ? 'Approved' : 'Verified';
        
        // Get user data from pre-fetched map
        const user = userMap[application.applicantInfo.phone];
        const userPhoto = user?.photo || application.applicantInfo.photo;
        const introducedCount = user?.introducedCount || 0;
        
        position.applicantDetails = {
          name: application.applicantInfo.name,
          phone: application.applicantInfo.phone,
          email: application.applicantInfo.email,
          photo: userPhoto,
          address: application.applicantInfo.address,
          companyName: application.applicantInfo.companyName,
          businessName: application.applicantInfo.businessName,
          appliedDate: application.appliedDate,
          introducedBy: application.introducedBy || 'Self',
          introducedCount: introducedCount,
          days: Math.floor((new Date() - new Date(application.appliedDate)) / (1000 * 60 * 60 * 24)),
          applicationId: application._id,
          isVerified: application.isVerified || false
        };
      } else {
        position.applicantDetails = null;
      }
      
      positions.push(position);
    }
    
    // Re-number sNo
    positions.forEach((p, index) => {
      p.sNo = index + 1;
    });
    
    console.log(`📊 Generated ${positions.length} dynamic positions in optimized batch mode`);
    
    // Send response with proper headers and format expected by frontend
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
      success: true,
      positions: positions
    });
  } catch (error) {
    console.error('❌ Error generating dynamic positions:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Send error response
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to generate positions',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
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
    
    const applications = await Application.find({}).select('positionId applicantInfo status appliedDate').lean().limit(1000).sort({ appliedDate: -1 });
    
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
    { location: { country: 'India', zone: 'South' }, designation: 'Head of South' },
    { location: { country: 'India', zone: 'South', state: 'Goa' }, designation: 'Head of Goa' },
    { location: { country: 'India', zone: 'Western', state: 'Maharashtra', pincode: '400011' }, designation: 'Head of 400011' }
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
    
    // DISABLED legacy matching - it causes wrong people to show in positions
    // For example, zone-head would appear in district-head positions
    if (false && !existingApplication) {
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
      
      // CRITICAL FIX: Get updated photo from User model if available
      let userPhoto = existingApplication.applicantInfo.photo; // Default from application
      
      console.log(`\n📸 PHOTO FIX for ${existingApplication.applicantInfo.name} (${existingApplication.applicantInfo.phone}):`);
      console.log(`   Application photo: ${userPhoto ? userPhoto.length : 0} chars`);
      
      if (existingApplication.userId) {
        try {
          console.log(`   🔄 Fetching User by userId: ${existingApplication.userId}`);
          const linkedUser = await User.findById(existingApplication.userId);
          if (linkedUser && linkedUser.photo) {
            userPhoto = linkedUser.photo;
            console.log(`   ✅ Using User.photo: ${linkedUser.photo.length} chars (UPDATED)`);
          }
        } catch (error) {
          console.error(`   ❌ Error fetching user by ID:`, error.message);
        }
      } else if (applicantUser && applicantUser.photo) {
        // Fallback: use the user found by phone
        userPhoto = applicantUser.photo;
        console.log(`   ✅ Using User.photo (via phone): ${applicantUser.photo.length} chars (UPDATED)`);
      }
      
      console.log(`   🎯 FINAL photo length: ${userPhoto ? userPhoto.length : 0} chars\n`);
      
      position.applicantDetails = {
        name: existingApplication.applicantInfo.name,
        phone: existingApplication.applicantInfo.phone,
        email: existingApplication.applicantInfo.email,
        photo: userPhoto, // Use updated photo from User model
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

// NEW: Get position hierarchy for ID card - returns all upper-level channel partners
router.get('/hierarchy/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    console.log(`📇 Fetching ID card hierarchy for phone: ${phone}`);
    
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
    const User = require('../models/User');
    
    for (let i = 0; i < hierarchyLevels.length; i++) {
      const level = hierarchyLevels[i];
      const levelName = level.charAt(0).toUpperCase() + level.slice(1);
      
      // IMPORTANT: Only show area values for levels up to and including the user's position level
      // This prevents showing personal location data for positions the user doesn't hold
      let areaValue = '';
      if (i <= userLevelIndex) {
        // Only populate area if this level is at or above the user's position
        if (level === 'country') areaValue = 'India';
        else if (level === 'zone' && userApp.location.zone) areaValue = userApp.location.zone;
        else if (level === 'state' && userApp.location.state) areaValue = userApp.location.state;
        else if (level === 'division' && userApp.location.division) areaValue = userApp.location.division;
        else if (level === 'district' && userApp.location.district) areaValue = userApp.location.district;
        else if (level === 'tehsil' && userApp.location.tehsil) areaValue = userApp.location.tehsil;
        else if (level === 'pincode' && (userApp.location.pincode || userApp.applicantInfo.pincode)) {
          // Show pincode for pincode heads and all levels below (including village heads)
          // Try location.pincode first, fallback to applicantInfo.pincode
          areaValue = userApp.location.pincode || userApp.applicantInfo.pincode;
          console.log(`   🔍 Setting pincode area: ${areaValue}, i=${i}, userLevelIndex=${userLevelIndex}`);
        }
        else if (level === 'village' && userApp.location.village) {
          // For village level, only show if user is actually village head
          if (userLevel === 'village') {
            areaValue = userApp.location.village;
          }
        }
      }
      console.log(`   Row ${i} (${levelName}): areaValue="${areaValue}", i <= userLevelIndex: ${i <= userLevelIndex}`);
      
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
        } else if (level === 'pincode' && (userApp.location.pincode || userApp.applicantInfo.pincode)) {
          const pincode = userApp.location.pincode || userApp.applicantInfo.pincode;
          query.positionId = { $regex: new RegExp(`pincode-head.*${pincode.replace(/\s/g, '-').toLowerCase()}`, 'i') };
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
