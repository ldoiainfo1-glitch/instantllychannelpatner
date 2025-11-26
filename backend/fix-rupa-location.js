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
  fixRupaLocation();
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

async function fixRupaLocation() {
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
    console.log('   Current Location:', application.location);
    
    // Update with complete location hierarchy for District Head of Mumbai
    application.location = {
      country: 'India',
      zone: 'Western',
      state: 'Maharashtra',
      division: 'South Mumbai',
      district: 'Mumbai',
      tehsil: '',
      pincode: '',
      village: ''
    };
    
    console.log('\n🔧 Updating location to complete hierarchy...');
    console.log('   New Location:', application.location);
    
    await application.save();
    
    console.log('\n✅ Successfully updated Rupa\'s location data!');
    console.log('   District Head position now has complete parent hierarchy');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing location:', error);
    process.exit(1);
  }
}
