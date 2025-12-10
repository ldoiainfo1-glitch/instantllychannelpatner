const express = require('express');
const router = express.Router();
const Position = require('../models/Position');
const PricingOverride = require('../models/PricingOverride');
const PricingChangeLog = require('../models/PricingChangeLog');
const User = require('../models/User');

/**
 * DYNAMIC PRICING & CREDITS MANAGER API
 * Complete API for super admin to manage custom pricing overrides
 */

// ==================== POSITION FILTERING ====================

/**
 * GET /api/pricing-manager/positions/filter
 * Advanced filtering by location hierarchy
 * Query params: country, zone, state, division, district, tehsil, pincode, village, post
 */
router.get('/positions/filter', async (req, res) => {
  try {
    const { country, zone, state, division, district, tehsil, pincode, village, post, status } = req.query;
    
    const query = {};
    
    // Location filters
    if (country) query['location.country'] = country;
    if (zone) query['location.zone'] = new RegExp(zone, 'i');
    if (state) query['location.state'] = new RegExp(state, 'i');
    if (division) query['location.division'] = new RegExp(division, 'i');
    if (district) query['location.district'] = new RegExp(district, 'i');
    if (tehsil) query['location.tehsil'] = new RegExp(tehsil, 'i');
    if (pincode) query['location.pincode'] = new RegExp(pincode, 'i');
    if (village) query['location.village'] = new RegExp(village, 'i');
    
    // Position type filter
    if (post) query.post = post;
    
    // Status filter
    if (status) query.status = status;
    
    const positions = await Position.find(query)
      .select('_id post designation location pricingTiers customPricing status applicantDetails')
      .sort({ 'location.state': 1, post: 1 })
      .limit(500);
    
    // Check for overrides
    const positionIds = positions.map(p => p._id);
    const overrides = await PricingOverride.find({
      positionId: { $in: positionIds },
      isActive: true
    });
    
    const overrideMap = {};
    overrides.forEach(o => {
      overrideMap[o.positionId.toString()] = o;
    });
    
    // Merge positions with override status
    const enrichedPositions = positions.map(pos => ({
      _id: pos._id,
      post: pos.post,
      designation: pos.designation,
      location: pos.location,
      status: pos.status,
      applicantDetails: pos.applicantDetails,
      defaultTiers: pos.pricingTiers || [],
      hasOverride: !!overrideMap[pos._id.toString()],
      overrideData: overrideMap[pos._id.toString()] || null
    }));
    
    res.json({
      count: enrichedPositions.length,
      positions: enrichedPositions
    });
    
  } catch (error) {
    console.error('Error filtering positions:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/pricing-manager/positions/search
 * Search by name or phone (searches applicant details)
 */
router.get('/positions/search', async (req, res) => {
  try {
    const { name, phone } = req.query;
    
    if (!name && !phone) {
      return res.status(400).json({ error: 'Name or phone parameter required' });
    }
    
    const query = { status: { $in: ['Pending', 'Approved', 'Occupied'] } };
    
    if (name) {
      query['applicantDetails.name'] = new RegExp(name, 'i');
    }
    
    if (phone) {
      query['applicantDetails.phone'] = new RegExp(phone.replace(/\D/g, ''), 'i');
    }
    
    const positions = await Position.find(query)
      .select('_id post designation location pricingTiers customPricing status applicantDetails')
      .sort({ 'applicantDetails.appliedDate': -1 })
      .limit(100);
    
    // Check for overrides
    const positionIds = positions.map(p => p._id);
    const overrides = await PricingOverride.find({
      positionId: { $in: positionIds },
      isActive: true
    });
    
    const overrideMap = {};
    overrides.forEach(o => {
      overrideMap[o.positionId.toString()] = o;
    });
    
    const enrichedPositions = positions.map(pos => ({
      _id: pos._id,
      post: pos.post,
      designation: pos.designation,
      location: pos.location,
      status: pos.status,
      applicantDetails: pos.applicantDetails,
      defaultTiers: pos.pricingTiers || [],
      hasOverride: !!overrideMap[pos._id.toString()],
      overrideData: overrideMap[pos._id.toString()] || null
    }));
    
    res.json({
      count: enrichedPositions.length,
      positions: enrichedPositions
    });
    
  } catch (error) {
    console.error('Error searching positions:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/pricing-manager/locations
 * Get unique location values for dropdowns
 */
router.get('/locations', async (req, res) => {
  try {
    const { type } = req.query; // zone, state, division, district, tehsil
    
    if (!type) {
      return res.status(400).json({ error: 'Type parameter required' });
    }
    
    const field = `location.${type}`;
    const values = await Position.distinct(field, { [field]: { $ne: null, $ne: '' } });
    
    res.json({
      type,
      values: values.sort()
    });
    
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== PRICING OVERRIDE MANAGEMENT ====================

/**
 * GET /api/pricing-manager/overrides/:positionId
 * Get override details for a specific position
 */
router.get('/overrides/:positionId', async (req, res) => {
  try {
    const { positionId } = req.params;
    
    const position = await Position.findById(positionId);
    if (!position) {
      return res.status(404).json({ error: 'Position not found' });
    }
    
    const override = await PricingOverride.findOne({ positionId, isActive: true });
    
    // Get change history
    const history = await PricingChangeLog.getPositionHistory(positionId, 20);
    
    res.json({
      position: {
        _id: position._id,
        post: position.post,
        designation: position.designation,
        location: position.location,
        status: position.status,
        applicantDetails: position.applicantDetails
      },
      defaultTiers: position.pricingTiers || [],
      hasOverride: !!override,
      override: override || null,
      changeHistory: history
    });
    
  } catch (error) {
    console.error('Error fetching override:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/pricing-manager/overrides
 * Create new pricing override
 */
router.post('/overrides', async (req, res) => {
  try {
    const { positionId, overrideTiers, adminInfo, notes } = req.body;
    
    // Validate
    if (!positionId || !overrideTiers || !Array.isArray(overrideTiers) || overrideTiers.length === 0) {
      return res.status(400).json({ error: 'Invalid request data' });
    }
    
    // Get position
    const position = await Position.findById(positionId);
    if (!position) {
      return res.status(404).json({ error: 'Position not found' });
    }
    
    // Deactivate existing override if any
    await PricingOverride.updateMany(
      { positionId, isActive: true },
      { $set: { isActive: false, updatedAt: new Date() } }
    );
    
    // Calculate default tier percentages
    const defaultTiers = (position.pricingTiers || []).map(tier => ({
      pay: tier.pay,
      profit: tier.profit,
      profitPercentage: tier.pay > 0 ? Math.round((tier.profit / tier.pay) * 100) : 85,
      credit: tier.credit,
      creditPercentage: tier.pay > 0 ? Math.round((tier.credit / tier.pay) * 100) : 100
    }));
    
    // Create new override
    const override = new PricingOverride({
      positionId,
      positionDetails: {
        post: position.post,
        designation: position.designation,
        location: position.location
      },
      isActive: true,
      defaultTiers,
      overrideTiers,
      updatedBy: adminInfo || {},
      notes
    });
    
    await override.save();
    
    // Log the change
    await PricingChangeLog.logChange({
      positionId,
      overrideId: override._id,
      positionDetails: {
        post: position.post,
        designation: position.designation,
        locationString: getLocationString(position.location)
      },
      action: 'CREATED',
      oldValues: { tiers: defaultTiers },
      newValues: { tiers: overrideTiers },
      changedBy: adminInfo || {},
      notes
    });
    
    console.log(`✅ Created pricing override for ${position.designation}`);
    
    res.json({
      success: true,
      message: 'Pricing override created successfully',
      override
    });
    
  } catch (error) {
    console.error('Error creating override:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/pricing-manager/overrides/:overrideId
 * Update existing pricing override
 */
router.put('/overrides/:overrideId', async (req, res) => {
  try {
    const { overrideId } = req.params;
    const { overrideTiers, adminInfo, notes } = req.body;
    
    const existingOverride = await PricingOverride.findById(overrideId);
    if (!existingOverride) {
      return res.status(404).json({ error: 'Override not found' });
    }
    
    const oldTiers = existingOverride.overrideTiers;
    
    // Update override
    existingOverride.overrideTiers = overrideTiers;
    existingOverride.updatedBy = adminInfo || existingOverride.updatedBy;
    existingOverride.notes = notes || existingOverride.notes;
    existingOverride.updatedAt = new Date();
    
    await existingOverride.save();
    
    // Log the change
    await PricingChangeLog.logChange({
      positionId: existingOverride.positionId,
      overrideId: existingOverride._id,
      positionDetails: {
        post: existingOverride.positionDetails.post,
        designation: existingOverride.positionDetails.designation,
        locationString: getLocationString(existingOverride.positionDetails.location)
      },
      action: 'UPDATED',
      oldValues: { tiers: oldTiers },
      newValues: { tiers: overrideTiers },
      changedBy: adminInfo || {},
      notes
    });
    
    console.log(`✅ Updated pricing override for position ${existingOverride.positionId}`);
    
    res.json({
      success: true,
      message: 'Pricing override updated successfully',
      override: existingOverride
    });
    
  } catch (error) {
    console.error('Error updating override:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/pricing-manager/overrides/:overrideId
 * Delete (deactivate) pricing override - restore to default
 */
router.delete('/overrides/:overrideId', async (req, res) => {
  try {
    const { overrideId } = req.params;
    const { adminInfo, notes } = req.body;
    
    const override = await PricingOverride.findById(overrideId);
    if (!override) {
      return res.status(404).json({ error: 'Override not found' });
    }
    
    const oldTiers = override.overrideTiers;
    
    // Deactivate
    await override.deactivate();
    
    // Log the change
    await PricingChangeLog.logChange({
      positionId: override.positionId,
      overrideId: override._id,
      positionDetails: {
        post: override.positionDetails.post,
        designation: override.positionDetails.designation,
        locationString: getLocationString(override.positionDetails.location)
      },
      action: 'RESTORED_DEFAULT',
      oldValues: { tiers: oldTiers },
      newValues: { tiers: override.defaultTiers },
      changedBy: adminInfo || {},
      notes: notes || 'Restored to default pricing'
    });
    
    console.log(`✅ Deleted pricing override for position ${override.positionId}`);
    
    res.json({
      success: true,
      message: 'Pricing override removed, restored to default'
    });
    
  } catch (error) {
    console.error('Error deleting override:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/pricing-manager/overrides
 * Get all active overrides (for overview)
 */
router.get('/overrides', async (req, res) => {
  try {
    const { limit = 100, skip = 0 } = req.query;
    
    const overrides = await PricingOverride.find({ isActive: true })
      .sort({ updatedAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .populate('positionId', 'designation location status');
    
    res.json({
      count: overrides.length,
      overrides
    });
    
  } catch (error) {
    console.error('Error fetching overrides:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== CHANGE HISTORY ====================

/**
 * GET /api/pricing-manager/history/:positionId
 * Get change history for a specific position
 */
router.get('/history/:positionId', async (req, res) => {
  try {
    const { positionId } = req.params;
    const { limit = 50 } = req.query;
    
    const history = await PricingChangeLog.getPositionHistory(positionId, parseInt(limit));
    
    res.json({
      count: history.length,
      history
    });
    
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/pricing-manager/history
 * Get recent changes across all positions
 */
router.get('/history', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    
    const history = await PricingChangeLog.getRecentChanges(parseInt(limit));
    
    res.json({
      count: history.length,
      history
    });
    
  } catch (error) {
    console.error('Error fetching recent history:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== UTILITY FUNCTIONS ====================

function getLocationString(location) {
  const parts = [];
  if (location.village) parts.push(location.village);
  if (location.pincode) parts.push(location.pincode);
  if (location.tehsil) parts.push(location.tehsil);
  if (location.district) parts.push(location.district);
  if (location.division) parts.push(location.division);
  if (location.state) parts.push(location.state);
  if (location.zone) parts.push(location.zone);
  if (location.country) parts.push(location.country);
  return parts.join(' > ');
}

module.exports = router;
