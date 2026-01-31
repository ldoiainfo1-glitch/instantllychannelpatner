/**
 * Fix Pankaj's Application Hierarchy Fields
 * Phone: 7559213601
 * Position: pos_state-head_india_west-zone_maharashtra
 * 
 * This script will:
 * 1. Parse the positionId to extract hierarchy components
 * 2. Update applicantInfo fields with proper values
 * 3. Enable commission system to find him as Maharashtra state head
 */

const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner';

const applicationSchema = new mongoose.Schema({}, { collection: 'applications', strict: false });
const Application = mongoose.model('Application', applicationSchema);

async function fixPankajHierarchy() {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔧 FIX PANKAJ\'S HIERARCHY FIELDS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find Pankaj's application
    const application = await Application.findOne({
      'applicantInfo.phone': '7559213601',
      status: 'approved'
    });

    if (!application) {
      console.log('❌ No approved application found for Pankaj (7559213601)\n');
      process.exit(1);
    }

    console.log('📋 BEFORE FIX:');
    console.log('   Position ID:', application.positionId);
    console.log('   State:', application.applicantInfo?.state || 'Not set');
    console.log('   Zone:', application.applicantInfo?.zone || 'Not set');
    console.log('   Country:', application.applicantInfo?.country || 'Not set');
    console.log('');

    // Parse positionId: pos_state-head_india_west-zone_maharashtra
    const positionId = application.positionId;
    
    // Format: pos_state-head_country_zone_state
    // parts[0] = state-head
    // parts[1] = india
    // parts[2] = west-zone
    // parts[3] = maharashtra

    const parts = positionId.replace('pos_', '').split('_');

    const hierarchy = {
      country: parts[1] || 'India', // india
      zone: parts[2]?.replace(/-/g, ' ') || 'West Zone', // west-zone -> West Zone
      state: parts[3] || 'Maharashtra' // maharashtra
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
    console.log('');

    // Update application with hierarchy fields
    application.applicantInfo.country = hierarchy.country;
    application.applicantInfo.zone = hierarchy.zone;
    application.applicantInfo.state = hierarchy.state;

    await application.save();

    console.log('✅ APPLICATION UPDATED SUCCESSFULLY!\n');

    console.log('📋 AFTER FIX:');
    console.log('   Position ID:', application.positionId);
    console.log('   State:', application.applicantInfo.state);
    console.log('   Zone:', application.applicantInfo.zone);
    console.log('   Country:', application.applicantInfo.country);
    console.log('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ FIX COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('ℹ️  WHAT THIS MEANS:');
    console.log('   - Pankaj is now properly identified as Maharashtra State Head');
    console.log('   - Commission system can now find him by state = "Maharashtra"');
    console.log('   - He will receive 1.25% commission on ads created by pincode/tehsil/district heads in Maharashtra');
    console.log('   - The fix for Urmila + this fix = complete commission hierarchy');
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
  fixPankajHierarchy();
}, 2000);
