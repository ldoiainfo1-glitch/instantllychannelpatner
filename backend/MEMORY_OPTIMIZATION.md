# Memory Optimization for Render (512MB Limit)

## Changes Made (November 29, 2025)

### 1. **Node.js Memory Limit**
- Set `--max-old-space-size=460` in package.json start script
- Keeps heap under 460MB, leaving ~50MB for system overhead

### 2. **MongoDB Connection Pool**
- Reduced `maxPoolSize` from 10 to 3 connections
- Added `minPoolSize: 1` and `maxIdleTimeMS: 10000`
- Each connection uses ~10-20MB, saving ~140MB

### 3. **Request Payload Limits**
- Reduced JSON/URL-encoded limits from 10MB to 2MB
- Prevents large upload attacks consuming memory

### 4. **Database Query Optimizations**
Added to all major queries:
- `.lean()` - Returns plain JS objects instead of Mongoose documents (saves 50-70% memory)
- `.limit()` - Caps results to 500-1000 records max
- `.select()` - Only fetch needed fields, not entire documents

### 5. **Compression Middleware**
- Added `compression` package
- Enables gzip compression on all responses
- Reduces response sizes by 60-80%

### 6. **Files Modified**
- `server/index.js` - Added compression, reduced pool size
- `package.json` - Added compression dependency, Node memory limit
- `api/routes/dynamic-positions.js` - Added lean() and limits
- `api/routes/applications.js` - Added lean() and limits  
- `api/routes/admin.js` - Added lean() and limits

## Expected Results
- Memory usage reduced from ~600MB to ~350-400MB
- Should stay well under 512MB limit
- Faster response times due to compression
- More stable under load

## Monitoring
Check logs on Render dashboard:
1. Go to https://dashboard.render.com
2. Select your backend service
3. Click "Logs" tab
4. Watch for "Out of memory" errors (should stop)
5. Check for "✅ Connected to MongoDB Atlas" on startup

## If Still Running Out of Memory
Additional optimizations possible:
- Add Redis caching for frequently accessed data
- Implement pagination on frontend to request less data
- Add database indexes to speed up queries
- Consider upgrading to 1GB plan on Render
