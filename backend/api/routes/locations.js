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

module.exports = router;
