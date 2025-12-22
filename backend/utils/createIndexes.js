/**
 * Create database indexes for faster queries
 * Run this script once to create indexes on frequently queried fields
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function createIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // User collection indexes
    console.log('📊 Creating User indexes...');
    await db.collection('users').createIndex({ phone: 1 }, { unique: true });
    await db.collection('users').createIndex({ personCode: 1 });
    await db.collection('users').createIndex({ introducedBy: 1 });
    await db.collection('users').createIndex({ createdAt: -1 });
    await db.collection('users').createIndex({ credits: -1 });

    // Application collection indexes
    console.log('📊 Creating Application indexes...');
    await db.collection('applications').createIndex({ positionId: 1 });
    await db.collection('applications').createIndex({ 'applicantInfo.phone': 1 });
    await db.collection('applications').createIndex({ status: 1 });
    await db.collection('applications').createIndex({ appliedDate: -1 });
    await db.collection('applications').createIndex({ userId: 1 });

    // Promotion collection indexes
    console.log('📊 Creating Promotion indexes...');
    await db.collection('promotions').createIndex({ date: -1 });
    await db.collection('promotions').createIndex({ createdAt: -1 });

    // Location collection indexes
    console.log('📊 Creating Location indexes...');
    await db.collection('locations').createIndex({ zone: 1 });
    await db.collection('locations').createIndex({ state: 1 });
    await db.collection('locations').createIndex({ district: 1 });
    await db.collection('locations').createIndex({ pincode: 1 });

    // Compound indexes for common queries
    console.log('📊 Creating compound indexes...');
    await db.collection('applications').createIndex({ status: 1, appliedDate: -1 });
    await db.collection('users').createIndex({ introducedBy: 1, createdAt: -1 });

    console.log('✅ All indexes created successfully!');
    console.log('🚀 Database queries will now be much faster');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  }
}

createIndexes();
