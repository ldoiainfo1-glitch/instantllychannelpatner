const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://instantllycards:instantllycards@cluster0.5ftkh.mongodb.net/channelpartner?retryWrites=true&w=majority';

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ Connected to MongoDB');
  fixRupaPosition();
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Application Model
const Application = mongoose.model('Application', new mongoose.Schema({
  positionId: String,
  personCode: String,
  applicantInfo: {
    name: String,
    phone: String,
    email: String,
    photo: String,
    address: String,
    companyName: String,
    businessName: String
  },
  location: {
    country: String,
    zone: String,
    state: String,
    division: String,
    district: String,
    tehsil: String,
    pincode: String,
    village: String
  },
  userId: mongoose.Schema.Types.ObjectId,
  introducedBy: String,
  status: String,
  appliedDate: Date,
  approvedDate: Date,
  adminNotes: String,
  isVerified: Boolean
}));

async function fixRupaPosition() {
  try {
    console.log('\n🔍 Finding Rupa Shedgulkar\'s application...');
    
    // Find Rupa's application
    const application = await Application.findOne({ 
      'applicantInfo.phone': '9623885504' 
    });
    
    if (!application) {
      console.log('❌ Application not found for phone: 9623885504');
      process.exit(1);
    }
    
    console.log('✅ Found application:');
    console.log('   Name:', application.applicantInfo.name);
    console.log('   Current Position ID:', application.positionId);
    console.log('   Location:', application.location);
    
    // Determine the correct position ID based on location
    // Rupa should be District Head of Mumbai
    const correctPositionId = 'pos_district-head_india_western_maharashtra_south-mumbai_mumbai';
    
    console.log('\n🔧 Updating position ID to:', correctPositionId);
    
    // Update the application
    application.positionId = correctPositionId;
    await application.save();
    
    console.log('✅ Successfully updated Rupa\'s position ID!');
    console.log('\n✨ Verification:');
    console.log('   Old ID: pos_village-head_india_western_maharashtra_south-mumbai_mumbai_mumbai_400001_stock-exchange-so');
    console.log('   New ID:', application.positionId);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing position:', error);
    process.exit(1);
  }
}
