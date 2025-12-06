const express = require('express');
const router = express.Router();
const Location = require('../models/Location');

// Get ALL location data in one optimized request (for performance)
router.get('/all', async (req, res) => {
  try {
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
    res.json({
      zones: zones.sort(),
      states: states.sort(),
      divisions: divisions.sort(),
      districts: districts.sort(),
      tehsils: tehsils.sort(),
      pincodes: pincodes.sort(),
      villages: villages.sort()
    });
  } catch (error) {
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
    
    // Validate required fields
    if (!zone || !state || !division || !district || !tehsil || !pincode || !village) {
      return res.status(400).json({ 
        success: false, 
        error: 'All location fields are required' 
      });
    }
    
    // Check if location already exists
    const existing = await Location.findOne({
      zone, state, division, district, tehsil, pincode, village
    });
    
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        error: 'This location already exists in the database' 
      });
    }
    
    // Create new location
    const location = new Location({
      country: country || 'India',
      zone: zone.trim(),
      state: state.trim(),
      division: division.trim(),
      district: district.trim(),
      tehsil: tehsil.trim(),
      pincode: pincode.trim(),
      village: village.trim()
    });
    
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
    
    // Validate required fields
    if (!zone || !state || !division || !district || !tehsil || !pincode || !village) {
      return res.status(400).json({ 
        success: false, 
        error: 'All location fields are required' 
      });
    }
    
    const location = await Location.findById(id);
    if (!location) {
      return res.status(404).json({ 
        success: false, 
        error: 'Location not found' 
      });
    }
    
    // Update fields
    location.country = country || 'India';
    location.zone = zone.trim();
    location.state = state.trim();
    location.division = division.trim();
    location.district = district.trim();
    location.tehsil = tehsil.trim();
    location.pincode = pincode.trim();
    location.village = village.trim();
    
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

module.exports = router;
