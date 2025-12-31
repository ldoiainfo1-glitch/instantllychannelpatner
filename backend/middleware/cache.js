/**
 * Cache Middleware for Express
 * Adds caching headers to API responses for better performance
 */

// Cache durations in seconds
const CACHE_DURATIONS = {
  STATIC: 31536000,      // 1 year for static assets
  LONG: 86400,           // 24 hours for rarely changing data
  MEDIUM: 3600,          // 1 hour for moderately changing data
  SHORT: 300,            // 5 minutes for frequently changing data
  NONE: 0                // No caching
};

/**
 * Set cache headers for the response
 * @param {number} duration - Cache duration in seconds
 * @param {boolean} isPublic - Whether cache is public or private
 */
function setCacheHeaders(duration, isPublic = true) {
  return (req, res, next) => {
    if (duration > 0) {
      const cacheControl = isPublic ? 'public' : 'private';
      res.set({
        'Cache-Control': `${cacheControl}, max-age=${duration}`,
        'Expires': new Date(Date.now() + duration * 1000).toUTCString()
      });
    } else {
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
    }
    next();
  };
}

// Memory cache for API responses
const memoryCache = new Map();
const MEMORY_CACHE_MAX_SIZE = 100; // Maximum number of cached items
const MEMORY_CACHE_TTL = 300000; // 5 minutes in milliseconds

/**
 * In-memory cache middleware
 * Caches API responses in memory for faster subsequent requests
 */
function memoryCacheMiddleware(duration = 300000) {
  return (req, res, next) => {
    const key = req.originalUrl;
    const cached = memoryCache.get(key);
    
    if (cached && Date.now() < cached.expiry) {
      console.log(`✅ Cache HIT: ${key}`);
      return res.json(cached.data);
    }
    
    console.log(`❌ Cache MISS: ${key}`);
    
    // Store the original res.json function
    const originalJson = res.json.bind(res);
    
    // Override res.json to cache the response
    res.json = function(data) {
      // Clean up old cache entries if cache is too large
      if (memoryCache.size >= MEMORY_CACHE_MAX_SIZE) {
        const oldestKey = memoryCache.keys().next().value;
        memoryCache.delete(oldestKey);
      }
      
      // Cache the response
      memoryCache.set(key, {
        data,
        expiry: Date.now() + duration
      });
      
      // Send the response
      return originalJson(data);
    };
    
    next();
  };
}

/**
 * Clear cache for specific pattern
 */
function clearCache(pattern) {
  let cleared = 0;
  for (const key of memoryCache.keys()) {
    if (key.includes(pattern)) {
      memoryCache.delete(key);
      cleared++;
    }
  }
  console.log(`🧹 Cleared ${cleared} cache entries matching: ${pattern}`);
  return cleared;
}

/**
 * Clear all cache
 */
function clearAllCache() {
  const size = memoryCache.size;
  memoryCache.clear();
  console.log(`🧹 Cleared all ${size} cache entries`);
  return size;
}

module.exports = {
  CACHE_DURATIONS,
  setCacheHeaders,
  memoryCacheMiddleware,
  clearCache,
  clearAllCache
};
