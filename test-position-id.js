// Test position ID generation
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

// Test cases
console.log('🧪 Testing Position ID Generation:');

// President of India
const presidentLocation = { country: 'India' };
console.log('President:', generatePositionId(presidentLocation, 'President of India'));

// Zone Head
const zoneLocation = { country: 'India', zone: 'South India' };
console.log('Zone Head:', generatePositionId(zoneLocation, 'Head of South India'));

// State Head  
const stateLocation = { country: 'India', zone: 'South India', state: 'Goa' };
console.log('State Head:', generatePositionId(stateLocation, 'Head of Goa'));

// Pincode Head
const pincodeLocation = { country: 'India', zone: 'West India', state: 'Maharashtra', district: 'Mumbai', pincode: '400011' };
console.log('Pincode Head:', generatePositionId(pincodeLocation, 'Head of 400011'));
