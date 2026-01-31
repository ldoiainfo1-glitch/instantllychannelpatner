/**
 * Fix Urmila's Application Hierarchy Fields
 * Phone: 7410169609
 * Position: pos_pincode-head_india_west-zone_maharashtra_konkan_thane_thane_401107
 * 
 * This script will:
 * 1. Parse the positionId to extract hierarchy components
 * 2. Update applicantInfo fields with proper values
 * 3. Enable commission distribution to parent positions
 */

const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner';

const applicationSchema = new mongoose.Schema({}, { collection: 'applications', strict: false });
const Application = mongoose.model('Application', applicationSchema);

async function fixUrmilaHierarchy() {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔧 FIX URMILA\'S HIERARCHY FIELDS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find Urmila's application
    const application = await Application.findOne({
      'applicantInfo.phone': '7410169609',
      status: 'approved'
    });

    if (!application) {
      console.log('❌ No approved application found for Urmila (7410169609)\n');
      process.exit(1);
    }

    console.log('📋 BEFORE FIX:');
    console.log('   Position ID:', application.positionId);
    console.log('   Pincode:', application.applicantInfo?.pincode || 'Not set');
    console.log('   Tehsil:', application.applicantInfo?.tehsil || 'Not set');
    console.log('   District:', application.applicantInfo?.district || 'Not set');
    console.log('   Division:', application.applicantInfo?.division || 'Not set');
    console.log('   State:', application.applicantInfo?.state || 'Not set');
    console.log('   Zone:', application.applicantInfo?.zone || 'Not set');
    console.log('   Country:', application.applicantInfo?.country || 'Not set');
    console.log('');

    // Parse positionId: pos_pincode-head_india_west-zone_maharashtra_konkan_thane_thane_401107
    const positionId = application.positionId;
    
    // Extract hierarchy from positionId
    // Format: pos_level_country_zone_state_division_district_tehsil_pincode
    const parts = positionId.replace('pos_', '').split('_');
    
    // Based on the format: pincode-head_india_west-zone_maharashtra_konkan_thane_thane_401107
    // parts[0] = pincode-head
    // parts[1] = india
    // parts[2] = west-zone
    // parts[3] = maharashtra
    // parts[4] = konkan
    // parts[5] = thane
    // parts[6] = thane
    // parts[7] = 401107

    const hierarchy = {
      country: parts[1] || 'India', // india
      zone: parts[2]?.replace(/-/g, ' ') || 'West Zone', // west-zone -> West Zone
      state: parts[3] || 'Maharashtra', // maharashtra
      division: parts[4] || 'Konkan', // konkan
      district: parts[5] || 'Thane', // thane
      tehsil: parts[6] || 'Thane', // thane
      pincode: parts[7] || application.applicantInfo?.pincode // 401107
    };

    // Capitalize first letter
    Object.keys(hierarchy).forEach(key => {
      if (hierarchy[key] && typeof hierarchy[key] === 'string') {
        hierarchy[key] = hierarchy[key]
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      }
    });

    console.log('📝 EXTRACTED HIERARCHY:');
    console.log('   Country:', hierarchy.country);
    console.log('   Zone:', hierarchy.zone);
    console.log('   State:', hierarchy.state);
    console.log('   Division:', hierarchy.division);
    console.log('   District:', hierarchy.district);
    console.log('   Tehsil:', hierarchy.tehsil);
    console.log('   Pincode:', hierarchy.pincode);
    console.log('');

    // Update application with hierarchy fields
    application.applicantInfo.country = hierarchy.country;
    application.applicantInfo.zone = hierarchy.zone;
    application.applicantInfo.state = hierarchy.state;
    application.applicantInfo.division = hierarchy.division;
    application.applicantInfo.district = hierarchy.district;
    application.applicantInfo.tehsil = hierarchy.tehsil;
    
    // Make sure pincode is set
    if (!application.applicantInfo.pincode) {
      application.applicantInfo.pincode = hierarchy.pincode;
    }

    await application.save();

    console.log('✅ APPLICATION UPDATED SUCCESSFULLY!\n');

    console.log('📋 AFTER FIX:');
    console.log('   Position ID:', application.positionId);
    console.log('   Pincode:', application.applicantInfo.pincode);
    console.log('   Tehsil:', application.applicantInfo.tehsil);
    console.log('   District:', application.applicantInfo.district);
    console.log('   Division:', application.applicantInfo.division);
    console.log('   State:', application.applicantInfo.state);
    console.log('   Zone:', application.applicantInfo.zone);
    console.log('   Country:', application.applicantInfo.country);
    console.log('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ FIX COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('ℹ️  WHAT THIS MEANS:');
    console.log('   - Urmila\'s application now has proper hierarchy fields');
    console.log('   - Future ads created by Urmila will distribute commission correctly');
    console.log('   - Pankaj Rathod (State Head - Maharashtra) will receive 1.25% commission');
    console.log('   - Other parent positions (Zone, District, etc.) will also receive their shares');
    console.log('   - The commission system can now properly trace the hierarchy');
    console.log('');

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

console.log('\n🚀 Starting fix in 2 seconds...\n');
setTimeout(() => {
  fixUrmilaHierarchy();
}, 2000);
