const mongoose = require('mongoose');
const Application = require('./api/models/Application');

const MONGODB_URI = 'mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner';

async function debugPankaj() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    const app = await Application.findOne({ 
      'applicantInfo.phone': '7559213601', 
      status: 'approved' 
    });

    if (!app) {
      console.log('❌ Not found');
      return;
    }

    console.log('📄 FULL DOCUMENT:\n');
    console.log(JSON.stringify(app.toJSON(), null, 2));

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

debugPankaj();
