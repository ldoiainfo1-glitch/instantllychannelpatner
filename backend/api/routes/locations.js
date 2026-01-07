const express = require('express');
const router = express.Router();
const Location = require('../models/Location');
const { memoryCacheMiddleware, setCacheHeaders, CACHE_DURATIONS } = require('../../middleware/cache');

// Get ALL location data in one optimized request (for performance)
router.get('/all', memoryCacheMiddleware(300000), setCacheHeaders(CACHE_DURATIONS.SHORT), async (req, res) => {
  try {
    // Check if requesting distinct values for dropdowns
    if (req.query.format === 'distinct') {
      // Use Promise.all to fetch all distinct values in parallel
      const [zones, states, divisions, districts, tehsils, pincodes, villages] = await Promise.all([
        Location.distinct('zone', { zone: { $ne: null, $ne: '' } }),
        Location.distinct('state', { state: { $ne: null, $ne: '' } }),
        Location.distinct('division', { division: { $ne: null, $ne: '' } }),
        Location.distinct('district', { district: { $ne: null, $ne: '' } }),
        Location.distinct('tehsil', { tehsil: { $ne: null, $ne: '' } }),
        Location.distinct('pincode', { pincode: { $ne: null, $ne: '' } }),
        Location.distinct('village', { village: { $ne: null, $ne: '' } })
      ]);
      
      // Return all data in one response (sorted for better UX)
      return res.json({
        zones: zones.sort(),
        states: states.sort(),
        divisions: divisions.sort(),
        districts: districts.sort(),
        tehsils: tehsils.sort(),
        pincodes: pincodes.sort(),
        villages: villages.sort()
      });
    }
    
    // OPTIMIZED: Return only distinct counts for statistics (prevents memory overflow)
    // This endpoint was causing crashes by loading 158K+ records into memory
    console.log('📊 Fetching location statistics (distinct counts only)...');
    
    const [zones, states, divisions, districts, tehsils, pincodes, villages] = await Promise.all([
      Location.distinct('zone', { zone: { $ne: null, $ne: '' } }),
      Location.distinct('state', { state: { $ne: null, $ne: '' } }),
      Location.distinct('division', { division: { $ne: null, $ne: '' } }),
      Location.distinct('district', { district: { $ne: null, $ne: '' } }),
      Location.distinct('tehsil', { tehsil: { $ne: null, $ne: '' } }),
      Location.distinct('pincode', { pincode: { $ne: null, $ne: '' } }),
      Location.distinct('village', { village: { $ne: null, $ne: '' } })
    ]);
    
    console.log(`✅ Location counts: Zones=${zones.length}, States=${states.length}, Divisions=${divisions.length}, Districts=${districts.length}, Tehsils=${tehsils.length}, Pincodes=${pincodes.length}, Villages=${villages.length}`);
    
    // Return statistics in a format compatible with frontend expectations
    res.json({
      success: true,
      locationCounts: {
        country: 1, // India
        zone: zones.length,
        state: states.length,
        division: divisions.length,
        district: districts.length,
        tehsil: tehsils.length,
        pincode: pincodes.length,
        village: villages.length
      }
    });
  } catch (error) {
    console.error('❌ Error fetching location statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get zones
router.get('/zones', async (req, res) => {
  try {
    const zones = await Location.distinct('zone', { zone: { $ne: null, $ne: '' } });
    res.json(zones.sort());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get states by zone
router.get('/states', async (req, res) => {
  try {
    const { zone } = req.query;
    let filter = { state: { $ne: null, $ne: '' } };
    
    if (zone) {
      filter.zone = zone;
    }
    
    const states = await Location.distinct('state', filter);
    res.json(states.sort());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get divisions
router.get('/divisions', async (req, res) => {
  try {
    const { zone, state } = req.query;
    let filter = { division: { $ne: null, $ne: '' } };
    
    if (zone) filter.zone = zone;
    if (state) filter.state = state;
    
    const divisions = await Location.distinct('division', filter);
    res.json(divisions.sort());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get districts
router.get('/districts', async (req, res) => {
  try {
    const { zone, state, division } = req.query;
    let filter = { district: { $ne: null, $ne: '' } };
    
    if (zone) filter.zone = zone;
    if (state) filter.state = state;
    if (division) filter.division = division;
    
    const districts = await Location.distinct('district', filter);
    res.json(districts.sort());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get tehsils
router.get('/tehsils', async (req, res) => {
  try {
    const { zone, state, division, district } = req.query;
    let filter = { tehsil: { $ne: null, $ne: '' } };
    
    if (zone) filter.zone = zone;
    if (state) filter.state = state;
    if (division) filter.division = division;
    if (district) filter.district = district;
    
    const tehsils = await Location.distinct('tehsil', filter);
    res.json(tehsils.sort());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pincodes
router.get('/pincodes', async (req, res) => {
  try {
    const { zone, state, division, district, tehsil } = req.query;
    let filter = { pincode: { $ne: null, $ne: '' } };
    
    if (zone) filter.zone = zone;
    if (state) filter.state = state;
    if (division) filter.division = division;
    if (district) filter.district = district;
    if (tehsil) filter.tehsil = tehsil;
    
    const pincodes = await Location.distinct('pincode', filter);
    res.json(pincodes.sort());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get villages
router.get('/villages', async (req, res) => {
  try {
    const { zone, state, division, district, tehsil, pincode } = req.query;
    let filter = { village: { $ne: null, $ne: '' } };
    
    if (zone) filter.zone = zone;
    if (state) filter.state = state;
    if (division) filter.division = division;
    if (district) filter.district = district;
    if (tehsil) filter.tehsil = tehsil;
    if (pincode) filter.pincode = pincode;
    
    const villages = await Location.distinct('village', filter);
    res.json(villages.sort());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get location details for reverse mapping
router.get('/reverse-lookup/:value', async (req, res) => {
  try {
    const { value } = req.params;
    
    // Try to find location by any field
    const location = await Location.findOne({
      $or: [
        { zone: value },
        { state: value },
        { division: value },
        { district: value },
        { tehsil: value },
        { pincode: value },
        { village: value }
      ]
    });
    
    if (location) {
      res.json({
        country: location.country,
        zone: location.zone,
        state: location.state,
        division: location.division,
        district: location.district,
        tehsil: location.tehsil,
        pincode: location.pincode,
        village: location.village
      });
    } else {
      res.status(404).json({ error: 'Location not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ====================================
// ADMIN LOCATION MANAGEMENT ENDPOINTS
// ====================================

// Get all locations with pagination and search
router.get('/manage', async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const skip = (page - 1) * limit;
    
    let filter = {};
    if (search) {
      filter = {
        $or: [
          { zone: new RegExp(search, 'i') },
          { state: new RegExp(search, 'i') },
          { division: new RegExp(search, 'i') },
          { district: new RegExp(search, 'i') },
          { tehsil: new RegExp(search, 'i') },
          { pincode: new RegExp(search, 'i') },
          { village: new RegExp(search, 'i') }
        ]
      };
    }
    
    const [locations, total] = await Promise.all([
      Location.find(filter)
        .sort({ zone: 1, state: 1, division: 1, district: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Location.countDocuments(filter)
    ]);
    
    res.json({
      success: true,
      locations,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[LOCATIONS-MANAGE] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new location
router.post('/manage', async (req, res) => {
  try {
    const { country, zone, state, division, district, tehsil, pincode, village } = req.body;
    
    console.log('[LOCATION-CREATE] Creating new location:', { zone, state, division, district, tehsil, pincode, village });
    
    // Validate required fields (tehsil, pincode, village are optional)
    if (!zone || !state || !division || !district) {
      return res.status(400).json({ 
        success: false, 
        error: 'Zone, state, division, and district are required' 
      });
    }
    
    // Build query object for duplicate check (only include fields that are provided)
    const existingQuery = {
      zone, state, division, district
    };
    if (tehsil) existingQuery.tehsil = tehsil;
    if (pincode) existingQuery.pincode = pincode;
    if (village) existingQuery.village = village;
    
    // Check if location already exists
    const existing = await Location.findOne(existingQuery);
    
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        error: 'This location already exists in the database' 
      });
    }
    
    // Create new location (only include fields that are provided)
    const locationData = {
      country: country || 'India',
      zone: zone.trim(),
      state: state.trim(),
      division: division.trim(),
      district: district.trim()
    };
    
    if (tehsil) locationData.tehsil = tehsil.trim();
    if (pincode) locationData.pincode = pincode.trim();
    if (village) locationData.village = village.trim();
    
    const location = new Location(locationData);
    
    await location.save();
    
    console.log('[LOCATION-CREATE] ✅ Location created successfully:', location._id);
    
    res.json({ 
      success: true, 
      message: 'Location created successfully', 
      location 
    });
  } catch (error) {
    console.error('[LOCATION-CREATE] ❌ Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update location
router.put('/manage/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { country, zone, state, division, district, tehsil, pincode, village } = req.body;
    
    console.log('[LOCATION-UPDATE] Updating location:', id);
    
    // Validate required fields (tehsil, pincode, village are optional)
    if (!zone || !state || !division || !district) {
      return res.status(400).json({ 
        success: false, 
        error: 'Zone, state, division, and district are required' 
      });
    }
    
    const location = await Location.findById(id);
    if (!location) {
      return res.status(404).json({ 
        success: false, 
        error: 'Location not found' 
      });
    }
    
    // Update fields (only set optional fields if provided)
    location.country = country || 'India';
    location.zone = zone.trim();
    location.state = state.trim();
    location.division = division.trim();
    location.district = district.trim();
    
    if (tehsil !== undefined) location.tehsil = tehsil ? tehsil.trim() : undefined;
    if (pincode !== undefined) location.pincode = pincode ? pincode.trim() : undefined;
    if (village !== undefined) location.village = village ? village.trim() : undefined;
    
    await location.save();
    
    console.log('[LOCATION-UPDATE] ✅ Location updated successfully');
    
    res.json({ 
      success: true, 
      message: 'Location updated successfully', 
      location 
    });
  } catch (error) {
    console.error('[LOCATION-UPDATE] ❌ Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete location
router.delete('/manage/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('[LOCATION-DELETE] Deleting location:', id);
    
    const location = await Location.findByIdAndDelete(id);
    if (!location) {
      return res.status(404).json({ 
        success: false, 
        error: 'Location not found' 
      });
    }
    
    console.log('[LOCATION-DELETE] ✅ Location deleted successfully');
    
    res.json({ 
      success: true, 
      message: 'Location deleted successfully' 
    });
  } catch (error) {
    console.error('[LOCATION-DELETE] ❌ Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bulk import locations from CSV data
router.post('/manage/bulk-import', async (req, res) => {
  try {
    const { locations } = req.body;
    
    if (!Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid locations data' 
      });
    }
    
    console.log('[LOCATION-BULK] Importing', locations.length, 'locations');
    
    const results = {
      created: 0,
      skipped: 0,
      errors: []
    };
    
    for (const loc of locations) {
      try {
        // Check if exists
        const existing = await Location.findOne({
          zone: loc.zone,
          state: loc.state,
          division: loc.division,
          district: loc.district,
          tehsil: loc.tehsil,
          pincode: loc.pincode,
          village: loc.village
        });
        
        if (existing) {
          results.skipped++;
          continue;
        }
        
        // Create new
        await Location.create({
          country: loc.country || 'India',
          zone: loc.zone.trim(),
          state: loc.state.trim(),
          division: loc.division.trim(),
          district: loc.district.trim(),
          tehsil: loc.tehsil.trim(),
          pincode: loc.pincode.trim(),
          village: loc.village.trim()
        });
        
        results.created++;
      } catch (err) {
        results.errors.push({ location: loc, error: err.message });
      }
    }
    
    console.log('[LOCATION-BULK] ✅ Import complete:', results);
    
    res.json({ 
      success: true, 
      message: `Imported ${results.created} locations (${results.skipped} skipped)`,
      results 
    });
  } catch (error) {
    console.error('[LOCATION-BULK] ❌ Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get aggregated statistics by level for a filtered location
router.get('/aggregated-stats', async (req, res) => {
  try {
    const { country, zone, state, division, district, tehsil, pincode } = req.query;
    const Application = require('../models/Application');
    
    console.log('📊 Fetching aggregated statistics with filters:', { country, zone, state, division, district, tehsil, pincode });
    
    // Define the hierarchy in correct order
    const hierarchy = [
      { level: 'country', posIdKey: 'president', display: 'Country' },
      { level: 'zone', posIdKey: 'zone-head', display: 'Zone' },
      { level: 'state', posIdKey: 'state-head', display: 'State' },
      { level: 'division', posIdKey: 'division-head', display: 'Division' },
      { level: 'district', posIdKey: 'district-head', display: 'District' },
      { level: 'tehsil', posIdKey: 'tehsil-head', display: 'Tehsil' },
      { level: 'pincode', posIdKey: 'pincode-head', display: 'Pincode' },
      { level: 'village', posIdKey: 'village-head', display: 'Village' }
    ];
    
    // Find which level is selected
    let selectedLevelIndex = -1;
    let selectedLevelName = '';
    let selectedLevelValue = '';
    
    if (pincode) {
      selectedLevelIndex = 6;
      selectedLevelName = 'Pincode';
      selectedLevelValue = pincode;
    } else if (tehsil) {
      selectedLevelIndex = 5;
      selectedLevelName = 'Tehsil';
      selectedLevelValue = tehsil;
    } else if (district) {
      selectedLevelIndex = 4;
      selectedLevelName = 'District';
      selectedLevelValue = district;
    } else if (division) {
      selectedLevelIndex = 3;
      selectedLevelName = 'Division';
      selectedLevelValue = division;
    } else if (state) {
      selectedLevelIndex = 2;
      selectedLevelName = 'State';
      selectedLevelValue = state;
    } else if (zone) {
      selectedLevelIndex = 1;
      selectedLevelName = 'Zone';
      selectedLevelValue = zone;
    } else {
      selectedLevelIndex = 0;
      selectedLevelName = 'Country';
      selectedLevelValue = country || 'India';
    }
    
    // Build location filter for approved applications
    let locationFilter = {};
    if (country) locationFilter['location.country'] = country;
    if (zone) locationFilter['location.zone'] = zone;
    if (state) locationFilter['location.state'] = state;
    if (division) locationFilter['location.division'] = division;
    if (district) locationFilter['location.district'] = district;
    if (tehsil) locationFilter['location.tehsil'] = tehsil;
    if (pincode) locationFilter['location.pincode'] = pincode;
    
    // Get all approved applications within the filtered location
    const approvedApplications = await Application.find({ 
      status: 'approved',
      ...locationFilter
    }).select('positionId location').lean();
    
    console.log(`✅ Found ${approvedApplications.length} approved applications in filtered location`);
    
    const stats = [];
    
    // Add the selected level itself (always 1 position total)
    const selectedPosIdKey = hierarchy[selectedLevelIndex].posIdKey;
    const selectedLevelGiven = approvedApplications.filter(app => 
      app.positionId && app.positionId.includes(selectedPosIdKey)
    ).length;
    
    stats.push({
      level: `${selectedLevelName} (${selectedLevelValue})`,
      total: 1,
      given: selectedLevelGiven > 0 ? 1 : 0
    });
    
    // Aggregate counts for all child levels
    for (let i = selectedLevelIndex + 1; i < hierarchy.length; i++) {
      const childLevel = hierarchy[i];
      
      // Get distinct locations at this level from Location model
      const childFilter = { country: country || 'India' };
      if (zone) childFilter.zone = zone;
      if (state) childFilter.state = state;
      if (division) childFilter.division = division;
      if (district) childFilter.district = district;
      if (tehsil) childFilter.tehsil = tehsil;
      if (pincode) childFilter.pincode = pincode;
      
      // Add filter for non-null/non-empty child field
      childFilter[childLevel.level] = { $ne: null, $ne: '' };
      
      // Count distinct child locations
      const distinctChildren = await Location.distinct(childLevel.level, childFilter);
      const totalCount = distinctChildren.length;
      
      // Count approved applications at this level by checking positionId
      const givenCount = approvedApplications.filter(app => 
        app.positionId && app.positionId.includes(childLevel.posIdKey)
      ).length;
      
      console.log(`   ${childLevel.display}: ${givenCount}/${totalCount} given`);
      
      stats.push({
        level: childLevel.display,
        total: totalCount,
        given: givenCount
      });
    }
    
    console.log('📈 Aggregated statistics calculated:', stats);
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('❌ Error fetching aggregated statistics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get child locations for filtered statistics
router.get('/children', async (req, res) => {
  try {
    const { country, zone, state, division, district, tehsil, pincode } = req.query;
    const Application = require('../models/Application');
    
    // Build filter for parent level
    let parentFilter = { country: country || 'India' };
    if (zone) parentFilter.zone = zone;
    if (state) parentFilter.state = state;
    if (division) parentFilter.division = division;
    if (district) parentFilter.district = district;
    if (tehsil) parentFilter.tehsil = tehsil;
    if (pincode) parentFilter.pincode = pincode;
    
    // Determine what child level to fetch
    let childLevel, childField;
    if (pincode) {
      childLevel = 'village';
      childField = 'village';
    } else if (tehsil) {
      childLevel = 'pincode';
      childField = 'pincode';
    } else if (district) {
      childLevel = 'tehsil';
      childField = 'tehsil';
    } else if (division) {
      childLevel = 'district';
      childField = 'district';
    } else if (state) {
      childLevel = 'division';
      childField = 'division';
    } else if (zone) {
      childLevel = 'state';
      childField = 'state';
    } else {
      childLevel = 'zone';
      childField = 'zone';
    }
    
    // Get distinct children
    const childFilter = { ...parentFilter, [childField]: { $ne: null, $ne: '' } };
    const childNames = await Location.distinct(childField, childFilter);
    
    // Count given positions for each child
    const children = await Promise.all(childNames.map(async (name) => {
      const locationFilter = { ...parentFilter, [childField]: name };
      
      // Count total locations at this level
      const totalCount = await Location.countDocuments(locationFilter);
      
      // Count approved applications for this location
      const givenCount = await Application.countDocuments({
        [`position.location.${childField}`]: name,
        status: 'approved'
      });
      
      return {
        name,
        total: totalCount,
        given: givenCount
      };
    }));
    
    // Sort by name
    children.sort((a, b) => a.name.localeCompare(b.name));
    
    // Get parent stats
    const parentTotal = await Location.countDocuments(parentFilter);
    const parentGiven = await Application.countDocuments({
      status: 'approved',
      ...Object.keys(parentFilter).reduce((acc, key) => {
        if (key !== 'country') {
          acc[`position.location.${key}`] = parentFilter[key];
        }
        return acc;
      }, {})
    });
    
    res.json({
      success: true,
      children,
      parentTotal,
      parentGiven,
      childLevel
    });
    
  } catch (error) {
    console.error('❌ Error fetching child locations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export all locations (for CSV generation)
router.get('/export-all', async (req, res) => {
  try {
    console.log('📤 Exporting all locations...');
    
    const locations = await Location.find({})
      .select('country zone state division district tehsil pincode village -_id')
      .sort({ state: 1, district: 1, tehsil: 1, village: 1 })
      .lean();
    
    console.log(`✅ Exported ${locations.length} locations`);
    
    res.json({
      success: true,
      locations,
      count: locations.length
    });
    
  } catch (error) {
    console.error('❌ Error exporting locations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
