const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://rajeshmodi:Newpass1234@cluster0.9yfi96i.mongodb.net/channelpartner?retryWrites=true&w=majority&appName=Cluster0';

async function testSearch() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    const phonePrefix = '88';
    
    // Escape special regex characters
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedPrefix = escapeRegex(phonePrefix);
    
    // Create search patterns
    const searchPatterns = [escapedPrefix];
    if (!phonePrefix.startsWith('+')) {
      searchPatterns.push(`\\+91${escapedPrefix}`);
    }
    const searchRegex = searchPatterns.map(p => `^${p}`).join('|');
    
    console.log('🔍 Search regex:', searchRegex);
    console.log('🔍 Patterns:', searchPatterns);

    // Search instantlly database
    const instantllyDB = mongoose.connection.useDb('instantlly');
    
    const appUsers = await instantllyDB.db.collection('users')
      .find({
        phone: { $regex: searchRegex, $options: 'i' }
      })
      .project({
        name: 1,
        phone: 1,
        credits: 1
      })
      .limit(10)
      .toArray();

    console.log(`\n📱 Found ${appUsers.length} App Users:`);
    appUsers.forEach(u => {
      console.log(`  - ${u.name}: ${u.phone} (${u.credits || 0} cr)`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testSearch();
