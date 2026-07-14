const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');
const compression = require('compression');

// Load environment variables
// Updated: 2025-12-02 - Fixed cross-database user search with direct MongoDB queries
dotenv.config();

// ========================================
// CRITICAL: Global Error Handlers
// Prevents exit status 134 crashes from uncaught errors
// ========================================
process.on('uncaughtException', (error) => {
  console.error('\n' + '='.repeat(80));
  console.error('❌ UNCAUGHT EXCEPTION - This would have crashed with exit status 134!');
  console.error('='.repeat(80));
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
  console.error('Time:', new Date().toISOString());
  console.error('='.repeat(80) + '\n');
  // DON'T exit - log and continue running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n' + '='.repeat(80));
  console.error('❌ UNHANDLED PROMISE REJECTION - This would have crashed with exit status 134!');
  console.error('='.repeat(80));
  console.error('Reason:', reason);
  if (reason instanceof Error) {
    console.error('Stack:', reason.stack);
  }
  console.error('Promise:', promise);
  console.error('Time:', new Date().toISOString());
  console.error('='.repeat(80) + '\n');
  // DON'T exit - log and continue running
});

console.log('✅ Global error handlers active - exit status 134 crashes prevented');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(compression()); // Enable gzip compression to reduce memory

// Enhanced CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://127.0.0.1:3000',
    'http://localhost:8080',
    'http://127.0.0.1:8080', 
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:5501',
    'http://127.0.0.1:5501',
    'https://api.channel-partner.instantllycards.com',
    'https://channelpartner.instantllycards.com',
    'https://channelpartneradmin.instantllycards.com',
    'https://instantlly-channel-partner.vercel.app',
    'https://instantllychannelpatner.vercel.app',
    'https://www.instantllycards.com',
    'https://instantllycards.com',
    'http://channel-partner-prod.s3-website.ap-south-1.amazonaws.com',
    /\.vercel\.app$/,
    /\.instantllycards\.com$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma', 'Expires'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600
}));

// Additional CORS headers for all requests
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:5501',
    'http://127.0.0.1:5501',
    'https://api.channel-partner.instantllycards.com',
    'https://channelpartner.instantllycards.com',
    'https://channelpartneradmin.instantllycards.com',
    'https://instantlly-channel-partner.vercel.app',
    'https://instantllychannelpatner.vercel.app',
    'https://instantllychannelpatneradmin.vercel.app',
    'https://www.instantllycards.com',
    'https://instantllycards.com'
  ];
  
  if (allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin) || /\.instantllycards\.com$/.test(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma, Expires');
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Memory monitoring - log warnings before crashes
setInterval(() => {
  const used = process.memoryUsage();
  const heapUsedMB = (used.heapUsed / 1024 / 1024).toFixed(2);
  const rss = (used.rss / 1024 / 1024).toFixed(2);
  
  // Warn if memory usage exceeds 1.5GB (75% of 2GB)
  if (used.rss > 1.5 * 1024 * 1024 * 1024) {
    console.warn(`⚠️ HIGH MEMORY USAGE: Heap=${heapUsedMB}MB, RSS=${rss}MB - Triggering GC...`);
    if (global.gc) {
      global.gc();
      console.log('✅ Manual garbage collection completed');
    }
  }
}, 30000); // Check every 30 seconds

// Import index creation utility
const ensureIndexes = require('../utils/ensureIndexes');

// Connect to MongoDB Atlas with better error handling
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/instantly-cards', {
      retryWrites: true,
      w: 'majority',
      serverSelectionTimeoutMS: 30000, // 30s to select server
      socketTimeoutMS: 120000, // 120s socket timeout (doubled for slow queries)
      connectTimeoutMS: 30000, // 30s connection timeout
      maxPoolSize: 25, // Raised from 5 -> 25 to handle public traffic concurrency
      minPoolSize: 5,  // Raised from 2 -> 5 so pool doesn't cold-start under bursts
      maxIdleTimeMS: 30000, // 30s idle timeout
      heartbeatFrequencyMS: 10000, // Check connection every 10s
      family: 4, // Force IPv4 for better compatibility
    });
    console.log('✅ Connected to MongoDB Atlas');
    console.log('Database:', conn.connection.name);
    
    // Ensure indexes exist (runs in background, doesn't block startup)
    ensureIndexes(mongoose).catch(err => 
      console.error('⚠️ Index creation failed:', err.message)
    );
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    if (error.message.includes('authentication')) {
      console.error('⚠️ Check MONGODB_URI credentials in .env file');
    }
    // Don't exit - app continues without DB (better than crashing)
    console.log('⚠️ App will continue without database connection');
    console.log('⚠️ Will retry connection automatically on disconnect event');
  }
};

// Set mongoose global timeout
mongoose.set('bufferTimeoutMS', 30000); // 30 second buffer timeout

// Enable MongoDB query debugging ONLY outside production.
// The previous unconditional debug logger ran on every single query in prod,
// adding real CPU/I/O overhead on the public-facing endpoints.
if (process.env.NODE_ENV !== 'production') {
  mongoose.set('debug', (collectionName, method, query, doc, options) => {
    const timestamp = new Date().toISOString();
    console.log(`📊 [${timestamp}] MongoDB Query:`);
    console.log(`   Collection: ${collectionName}`);
    console.log(`   Method: ${method}`);
    console.log(`   Query:`, JSON.stringify(query).substring(0, 200));
    if (options) console.log(`   Options:`, JSON.stringify(options).substring(0, 100));
  });
} else {
  console.log('ℹ️ NODE_ENV=production — Mongoose query debug logging disabled');
}

connectDB();

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected - attempting reconnect in 5s...');
  // Attempt to reconnect after 5 seconds
  setTimeout(() => {
    console.log('🔄 Attempting MongoDB reconnection...');
    connectDB();
  }, 5000);
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected successfully');
});

// Health check endpoint
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'ok', 
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Import routes
const dynamicPositionsRoutes = require('../api/routes/dynamic-positions');
const applicationsRoutes = require('../api/routes/applications');
const locationsRoutes = require('../api/routes/locations');
const adminRoutes = require('../api/routes/admin');
const videoRoutes = require('../api/routes/video');
const usersRoutes = require('../api/routes/users');
const authRoutes = require('../api/routes/auth');
const creditsRoutes = require('../api/routes/credits');
const promotionsRoutes = require('../api/routes/promotions');
const adsRoutes = require('../api/routes/ads');
const positionsRoutes = require('../api/routes/positions');
const paymentsRoutes = require('../api/routes/payments');
const pricingManagerRoutes = require('../api/routes/pricing-manager');
const loginHelpRoutes = require('../api/routes/login-help');

// Routes
app.use('/api/positions', positionsRoutes); // Add positions route FIRST for photo fix
app.use('/api/pricing-manager', pricingManagerRoutes); // Dynamic Pricing & Credits Manager
app.use('/api/dynamic-positions', dynamicPositionsRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/promotions', promotionsRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api', loginHelpRoutes); // Login Help routes

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error occurred:', err.message);
  console.error('Stack:', err.stack);
  console.error('Request:', {
    method: req.method,
    url: req.url,
    body: req.body,
    query: req.query
  });
  
  // Send appropriate error response
  res.status(err.status || 500).json({ 
    error: err.message || 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Graceful shutdown handlers for production (Render sends SIGTERM on redeploy)
const gracefulShutdown = async (signal) => {
  console.log(`\n👋 ${signal} received. Starting graceful shutdown...`);
  
  try {
    // Close MongoDB connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close(false);
      console.log('✅ MongoDB connection closed');
    }
    
    console.log('✅ Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

console.log('✅ Graceful shutdown handlers registered');

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;