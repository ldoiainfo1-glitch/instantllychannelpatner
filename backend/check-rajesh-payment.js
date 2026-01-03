const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  const Application = require('./api/models/Application');
  
  // Find Rajesh's application
  const rajesh = await Application.findOne({ 
    'applicantInfo.phone': '9867477227' 
  });
  
  if (rajesh) {
    console.log('✅ Found Rajesh application');
    console.log('Application ID:', rajesh._id);
    console.log('Name:', rajesh.applicantInfo.name);
    console.log('Phone:', rajesh.applicantInfo.phone);
    console.log('Has payment object?', !!rajesh.payment);
    
    if (rajesh.payment) {
      console.log('Payment amount:', rajesh.payment.amount);
      console.log('Payment status:', rajesh.payment.status);
      console.log('Has screenshot?', !!rajesh.payment.paymentScreenshot);
      if (rajesh.payment.paymentScreenshot) {
        console.log('Screenshot length:', rajesh.payment.paymentScreenshot.length);
        console.log('Screenshot starts with:', rajesh.payment.paymentScreenshot.substring(0, 50));
      } else {
        console.log('❌ NO PAYMENT SCREENSHOT IN DATABASE!');
      }
    } else {
      console.log('❌ NO PAYMENT OBJECT IN DATABASE!');
    }
  } else {
    console.log('❌ Rajesh application not found');
  }
  
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
