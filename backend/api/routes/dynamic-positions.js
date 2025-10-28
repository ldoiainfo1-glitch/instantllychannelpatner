const express = require('express');
const router = express.Router();
const Location = require('../models/Location');
const Position = require('../models/Position');

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
    
    let positions = [];
    let sNo = 1;
    
    // Check for existing positions (applications) with these filters
    let existingFilter = { country };
    if (zone) existingFilter.zone = zone;
    if (state) existingFilter.state = state;
    if (division) existingFilter.division = division;
    if (district) existingFilter.district = district;
    if (tehsil) existingFilter.tehsil = tehsil;
    if (pincode) existingFilter.pincode = pincode;
    if (village) existingFilter.village = village;
    
    const existingPositions = await Position.find(existingFilter).sort({ sNo: 1 });
    
    // If there are existing positions (people who applied), show them
    if (existingPositions.length > 0) {
      return res.json(existingPositions);
    }
    
    // Otherwise, generate available positions dynamically based on location hierarchy
    let locationFilter = {};
    if (zone) locationFilter.zone = zone;
    if (state) locationFilter.state = state;
    if (division) locationFilter.division = division;
    if (district) locationFilter.district = district;
    if (tehsil) locationFilter.tehsil = tehsil;
    if (pincode) locationFilter.pincode = pincode;
    if (village) locationFilter.village = village;
    
    // Get unique locations at the current level
    if (village) {
      // Village level - show this specific village position
      positions.push(createPositionTemplate(sNo++, 'Village Head', `Head of ${village}`, { country, zone, state, division, district, tehsil, pincode, village }));
    } else if (pincode) {
      // Pincode level - show villages under this pincode
      const villages = await Location.distinct('village', { ...locationFilter, village: { $ne: null, $ne: '' } });
      villages.forEach(v => {
        positions.push(createPositionTemplate(sNo++, 'Village Head', `Head of ${v}`, { country, zone, state, division, district, tehsil, pincode, village: v }));
      });
      // Also show pincode head position
      positions.unshift(createPositionTemplate(0, 'Pincode Head', `Head of ${pincode}`, { country, zone, state, division, district, tehsil, pincode }));
    } else if (tehsil) {
      // Tehsil level - show pincodes under this tehsil
      const pincodes = await Location.distinct('pincode', { ...locationFilter, pincode: { $ne: null, $ne: '' } });
      pincodes.slice(0, 20).forEach(p => { // Limit to 20 for performance
        positions.push(createPositionTemplate(sNo++, 'Pincode Head', `Head of ${p}`, { country, zone, state, division, district, tehsil, pincode: p }));
      });
      // Also show tehsil head position
      positions.unshift(createPositionTemplate(0, 'Tehsil Head', `Head of ${tehsil}`, { country, zone, state, division, district, tehsil }));
    } else if (district) {
      // District level - show tehsils
      const tehsils = await Location.distinct('tehsil', { ...locationFilter, tehsil: { $ne: null, $ne: '' } });
      tehsils.slice(0, 20).forEach(t => {
        positions.push(createPositionTemplate(sNo++, 'Tehsil Head', `Head of ${t}`, { country, zone, state, division, district, tehsil: t }));
      });
      positions.unshift(createPositionTemplate(0, 'District Head', `Head of ${district}`, { country, zone, state, division, district }));
    } else if (division) {
      // Division level - show districts
      const districts = await Location.distinct('district', { ...locationFilter, district: { $ne: null, $ne: '' } });
      districts.slice(0, 20).forEach(d => {
        positions.push(createPositionTemplate(sNo++, 'District Head', `Head of ${d}`, { country, zone, state, division, district: d }));
      });
      positions.unshift(createPositionTemplate(0, 'Division Head', `Head of ${division}`, { country, zone, state, division }));
    } else if (state) {
      // State level - show divisions
      const divisions = await Location.distinct('division', { ...locationFilter, division: { $ne: null, $ne: '' } });
      divisions.slice(0, 20).forEach(d => {
        positions.push(createPositionTemplate(sNo++, 'Division Head', `Head of ${d}`, { country, zone, state, division: d }));
      });
      positions.unshift(createPositionTemplate(0, 'State Head', `Head of ${state}`, { country, zone, state }));
    } else if (zone) {
      // Zone level - show states
      const states = await Location.distinct('state', { zone, state: { $ne: null, $ne: '' } });
      states.forEach(s => {
        positions.push(createPositionTemplate(sNo++, 'State Head', `Head of ${s}`, { country, zone, state: s }));
      });
      positions.unshift(createPositionTemplate(0, 'Zone Head', `Head of ${zone}`, { country, zone }));
    } else {
      // Country level - show zones + president
      const zones = await Location.distinct('zone', { zone: { $ne: null, $ne: '' } });
      positions.push(createPositionTemplate(sNo++, 'President', 'President of India', { country }));
      zones.forEach(z => {
        positions.push(createPositionTemplate(sNo++, 'Zone Head', `Head of ${z}`, { country, zone: z }));
      });
    }
    
    // Re-number sNo
    positions.forEach((p, index) => {
      p.sNo = index + 1;
    });
    
    res.json(positions);
  } catch (error) {
    console.error('Error generating dynamic positions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to create position template
function createPositionTemplate(sNo, post, designation, location) {
  return {
    sNo,
    post,
    designation,
    location,
    contribution: 10000,
    credits: 60000,
    status: 'Available',
    isTemplate: true, // Mark as template (not saved to DB)
    _id: `temp_${sNo}_${Date.now()}` // Temporary ID for frontend
  };
}

module.exports = router;
