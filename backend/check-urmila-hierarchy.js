/**
 * Check Urmila's Application Hierarchy
 * Phone: 7410169609
 * To understand why Pankaj isn't receiving commission
 */

const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner';

const userSchema = new mongoose.Schema({
  name: String,
  phone: String,
  commissionBalance: Number,
  commissionHistory: Array
}, { collection: 'users', strict: false });

const applicationSchema = new mongoose.Schema({}, { collection: 'applications', strict: false });

const User = mongoose.model('User', userSchema);
const Application = mongoose.model('Application', applicationSchema);

async function checkHierarchy() {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 CHECKING HIERARCHY AND COMMISSION ISSUE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find Urmila
    const urmila = await User.findOne({ phone: '7410169609' });
    console.log('👤 URMILA JAGVEER KAGDA (7410169609)');
    console.log('   Commission Balance:', urmila?.commissionBalance || 0);
    console.log('   Commission History:', (urmila?.commissionHistory || []).length, 'entries\n');

    if (urmila?.commissionHistory?.length > 0) {
      console.log('💰 Recent Commission:');
      urmila.commissionHistory.slice(-1).forEach(entry => {
        console.log('   -', entry.description);
        console.log('     Amount: ₹' + entry.amount);
        console.log('     Date:', entry.date);
      });
      console.log('');
    }

    // Find Urmila's application
    const urmilaApp = await Application.findOne({
      'applicantInfo.phone': '7410169609',
      status: 'approved'
    });

    if (!urmilaApp) {
      console.log('❌ No approved application found for Urmila\n');
    } else {
      console.log('📋 URMILA\'S APPLICATION:');
      console.log('   Position ID:', urmilaApp.positionId);
      console.log('   Status:', urmilaApp.status);
      console.log('\n   📍 HIERARCHY FROM APPLICATION:');
      console.log('   Pincode:', urmilaApp.applicantInfo?.pincode || 'Not set');
      console.log('   Tehsil:', urmilaApp.applicantInfo?.tehsil || 'Not set');
      console.log('   District:', urmilaApp.applicantInfo?.district || 'Not set');
      console.log('   Division:', urmilaApp.applicantInfo?.division || 'Not set');
      console.log('   State:', urmilaApp.applicantInfo?.state || 'Not set');
      console.log('   Zone:', urmilaApp.applicantInfo?.zone || 'Not set');
      console.log('   Country:', urmilaApp.applicantInfo?.country || 'Not set');
      console.log('');
    }

    // Find Pankaj
    const pankaj = await User.findOne({ phone: '7559213601' });
    console.log('👤 PANKAJ RATHOD (7559213601)');
    console.log('   Commission Balance:', pankaj?.commissionBalance || 0);
    console.log('   Commission History:', (pankaj?.commissionHistory || []).length, 'entries\n');

    // Find Pankaj's application
    const pankajApp = await Application.findOne({
      'applicantInfo.phone': '7559213601',
      status: 'approved'
    });

    if (!pankajApp) {
      console.log('❌ No approved application found for Pankaj\n');
    } else {
      console.log('📋 PANKAJ\'S APPLICATION:');
      console.log('   Position ID:', pankajApp.positionId);
      console.log('   Status:', pankajApp.status);
      console.log('\n   📍 HIERARCHY FROM APPLICATION:');
      console.log('   Pincode:', pankajApp.applicantInfo?.pincode || 'Not set');
      console.log('   Tehsil:', pankajApp.applicantInfo?.tehsil || 'Not set');
      console.log('   District:', pankajApp.applicantInfo?.district || 'Not set');
      console.log('   Division:', pankajApp.applicantInfo?.division || 'Not set');
      console.log('   State:', pankajApp.applicantInfo?.state || 'Not set');
      console.log('   Zone:', pankajApp.applicantInfo?.zone || 'Not set');
      console.log('   Country:', pankajApp.applicantInfo?.country || 'Not set');
      console.log('');
    }

    // Check if Pankaj is state head for Maharashtra
    console.log('🔍 SEARCHING FOR STATE HEAD OF MAHARASHTRA...\n');
    
    const maharashtraStateHeads = await Application.find({
      status: 'approved',
      $or: [
        { positionId: /state.*maharashtra/i },
        { 'applicantInfo.state': /maharashtra/i }
      ]
    }).lean();

    console.log('   Found', maharashtraStateHeads.length, 'state head(s) for Maharashtra:');
    for (const app of maharashtraStateHeads) {
      const holder = await User.findById(app.userId);
      console.log('   -', holder?.name, '(' + app.applicantInfo?.phone + ')');
      console.log('     Position:', app.positionId);
      console.log('     State field:', app.applicantInfo?.state);
    }
    console.log('');

    // Test the findLevelHolder logic
    if (urmilaApp) {
      console.log('🧪 TESTING COMMISSION DISTRIBUTION LOGIC...\n');
      
      const hierarchy = {
        pincode: urmilaApp.applicantInfo?.pincode,
        tehsil: urmilaApp.applicantInfo?.tehsil,
        district: urmilaApp.applicantInfo?.district,
        division: urmilaApp.applicantInfo?.division,
        state: urmilaApp.applicantInfo?.state,
        zone: urmilaApp.applicantInfo?.zone,
        country: urmilaApp.applicantInfo?.country || 'India'
      };

      console.log('   Using Hierarchy:', hierarchy);
      console.log('');

      // Test finding state head
      const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Method 1: positionId pattern
      const stateQuery1 = {
        status: 'approved',
        'applicantInfo.phone': { $ne: '7410169609' }
      };
      
      if (hierarchy.state) {
        const flexToken = String(hierarchy.state).trim().toLowerCase().replace(/[^a-z0-9]+/g, '[-_\\s]*');
        const levelFlex = 'state'.replace(/\s+/g, '[-_\\s]*');
        stateQuery1.positionId = { $regex: new RegExp(`(${levelFlex}[-_\\s]*head.*${flexToken}|${flexToken}.*${levelFlex}[-_\\s]*head)`, 'i') };
      }

      console.log('   Query 1 (positionId pattern):');
      console.log('   ', JSON.stringify(stateQuery1, null, 2));
      const stateApp1 = await Application.findOne(stateQuery1);
      if (stateApp1) {
        const holder = await User.findById(stateApp1.userId);
        console.log('   ✅ Found:', holder?.name, '(' + stateApp1.applicantInfo?.phone + ')');
      } else {
        console.log('   ❌ Not found');
      }
      console.log('');

      // Method 2: applicantInfo.state field
      const stateQuery2 = {
        status: 'approved',
        'applicantInfo.phone': { $ne: '7410169609' }
      };
      
      if (hierarchy.state) {
        stateQuery2['applicantInfo.state'] = new RegExp(esc(hierarchy.state), 'i');
      }

      console.log('   Query 2 (applicantInfo.state):');
      console.log('   ', JSON.stringify(stateQuery2, null, 2));
      const stateApp2 = await Application.findOne(stateQuery2).sort({ approvedDate: -1 });
      if (stateApp2) {
        const holder = await User.findById(stateApp2.userId);
        console.log('   ✅ Found:', holder?.name, '(' + stateApp2.applicantInfo?.phone + ')');
      } else {
        console.log('   ❌ Not found');
      }
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ANALYSIS COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

console.log('\n🚀 Starting hierarchy check in 2 seconds...\n');
setTimeout(() => {
  checkHierarchy();
}, 2000);
