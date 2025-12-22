const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');
const compression = require('compression');

// Load environment variables
// Updated: 2025-12-02 - Fixed cross-database user search with direct MongoDB queries
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(compression()); // Enable gzip compression to reduce memory

// Enhanced CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://127.0.0.1:3000', 
    'http://localhost:5500',
    'https://instantllychannelpatner.onrender.com',
    'https://instantlly-channel-partner.vercel.app',
    'https://instantllychannelpatner.vercel.app',
    'https://www.instantllycards.com',
    'https://instantllycards.com',
    /\.vercel\.app$/
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
    'http://localhost:5500',
    'https://instantllychannelpatner.onrender.com',
    'https://instantlly-channel-partner.vercel.app',
    'https://instantllychannelpatner.vercel.app',
    'https://www.instantllycards.com',
    'https://instantllycards.com'
  ];
  
  if (allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
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

app.use('/api/payments/webhook', express.raw({ type: '*/*' }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Connect to MongoDB Atlas with better error handling
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/instantly-cards', {
      retryWrites: true,
      w: 'majority',
      serverSelectionTimeoutMS: 30000, // 30s to select server
      socketTimeoutMS: 60000, // 60s socket timeout
      connectTimeoutMS: 30000, // 30s connection timeout
      maxPoolSize: 5, // Increase pool for better concurrent handling
      minPoolSize: 2,
      maxIdleTimeMS: 30000, // 30s idle timeout
      heartbeatFrequencyMS: 10000, // Check connection every 10s
    });
    console.log('✅ Connected to MongoDB Atlas');
    console.log('Database:', conn.connection.name);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    // Don't exit the process, let the app run without DB for now
    console.log('⚠️ App will continue without database connection');
  }
};

// Set mongoose global timeout
mongoose.set('bufferTimeoutMS', 30000); // 30 second buffer timeout

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

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
