/**
 * Ensure database indexes exist (runs automatically on server startup)
 * Uses createIndex with { background: true } to not block queries
 */

async function ensureIndexes(mongoose) {
  try {
    console.log('🔍 Checking/creating database indexes...');
    const db = mongoose.connection.db;
    const startTime = Date.now();

    // User collection indexes
    await Promise.all([
      db.collection('users').createIndex({ phone: 1 }, { unique: true, background: true }),
      db.collection('users').createIndex({ personCode: 1 }, { background: true }),
      db.collection('users').createIndex({ introducedBy: 1 }, { background: true }),
      db.collection('users').createIndex({ createdAt: -1 }, { background: true }),
      db.collection('users').createIndex({ credits: -1 }, { background: true })
    ]);

    // Application collection indexes
    await Promise.all([
      db.collection('applications').createIndex({ positionId: 1 }, { background: true }),
      db.collection('applications').createIndex({ 'applicantInfo.phone': 1 }, { background: true }),
      db.collection('applications').createIndex({ status: 1 }, { background: true }),
      db.collection('applications').createIndex({ appliedDate: -1 }, { background: true }),
      db.collection('applications').createIndex({ 'payment.status': 1 }, { background: true }),
      db.collection('applications').createIndex(
        { status: 1, appliedDate: -1 }, 
        { background: true }
      ),
      db.collection('applications').createIndex(
        { introducedBy: 1, createdAt: -1 }, 
        { background: true }
      )
    ]);

    // Promotion collection indexes
    await Promise.all([
      db.collection('promotions').createIndex({ date: -1 }, { background: true }),
      db.collection('promotions').createIndex({ createdAt: -1 }, { background: true })
    ]);

    // Location collection indexes
    await Promise.all([
      db.collection('locations').createIndex({ zone: 1 }, { background: true }),
      db.collection('locations').createIndex({ state: 1 }, { background: true }),
      db.collection('locations').createIndex({ division: 1 }, { background: true }),
      db.collection('locations').createIndex({ district: 1 }, { background: true }),
      db.collection('locations').createIndex({ tehsil: 1 }, { background: true }),
      db.collection('locations').createIndex({ pincode: 1 }, { background: true }),
      db.collection('locations').createIndex({ village: 1 }, { background: true })
    ]);

    const elapsed = Date.now() - startTime;
    console.log(`✅ Database indexes ensured (${elapsed}ms)`);
    
  } catch (error) {
    console.error('⚠️  Error ensuring indexes:', error.message);
    // Don't fail server startup if index creation fails
  }
}

module.exports = ensureIndexes;
