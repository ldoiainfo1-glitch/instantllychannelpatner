const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://127.0.0.1:3000', 
    'http://localhost:5500',
    'https://instantllychannelpatner.onrender.com',
    'https://instantlly-channel-partner.vercel.app',
    'https://instantllychannelpatner.vercel.app',
    /\.vercel\.app$/
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Connect to MongoDB Atlas with better error handling
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/instantly-cards', {
      retryWrites: true,
      w: 'majority',
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      maxPoolSize: 10, // Maintain up to 10 socket connections
    });
    console.log('✅ Connected to MongoDB Atlas');
    console.log('Database:', conn.connection.name);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    // Don't exit the process, let the app run without DB for now
    console.log('⚠️ App will continue without database connection');
  }
};

connectDB();

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
  // Attempt to reconnect after 5 seconds
  setTimeout(connectDB, 5000);
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

// Routes
app.use('/api/dynamic-positions', dynamicPositionsRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/auth', authRoutes);

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
