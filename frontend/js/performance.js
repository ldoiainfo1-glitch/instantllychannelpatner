// ⚡ Performance Utilities for Frontend
// Cache implementation with TTL (Time To Live)

class SimpleCache {
  constructor(ttl = 5 * 60 * 1000) { // 5 minutes default
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    const age = Date.now() - item.timestamp;
    if (age > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  clear() {
    this.cache.clear();
  }

  delete(key) {
    this.cache.delete(key);
  }
}

// Global cache instances
const apiCache = new SimpleCache(5 * 60 * 1000); // 5 minutes for API calls
const dataCache = new SimpleCache(10 * 60 * 1000); // 10 minutes for data

// Cached fetch wrapper
async function cachedFetch(url, options = {}, cacheKey = null) {
  const key = cacheKey || url;
  
  // Check cache first
  const cached = apiCache.get(key);
  if (cached) {
    console.log(`✅ Cache hit for: ${key}`);
    return cached;
  }
  
  console.log(`🔄 Cache miss, fetching: ${key}`);
  const response = await fetch(url, options);
  const data = await response.json();
  
  // Store in cache
  apiCache.set(key, data);
  
  return data;
}

// Debounce function to limit API calls
function debounce(func, wait = 500) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Show loading overlay
function showLoading(containerId, message = 'Loading...') {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.innerHTML = `
    <div class="loading-content">
      <div class="spinner-border text-primary mb-3" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mb-0">${message}</p>
    </div>
  `;
  
  container.style.position = 'relative';
  container.appendChild(overlay);
}

// Hide loading overlay
function hideLoading(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const overlay = container.querySelector('.loading-overlay');
  if (overlay) {
    overlay.remove();
  }
}

// Lazy load images
function lazyLoadImages() {
  const images = document.querySelectorAll('img[data-src]');
  
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        observer.unobserve(img);
      }
    });
  });
  
  images.forEach(img => imageObserver.observe(img));
}

// Measure and log performance
function measurePerformance(label, callback) {
  const start = performance.now();
  const result = callback();
  const end = performance.now();
  console.log(`⏱️ ${label}: ${(end - start).toFixed(2)}ms`);
  return result;
}

// Clear specific cache pattern
function clearCachePattern(pattern) {
  const keys = Array.from(apiCache.cache.keys());
  keys.forEach(key => {
    if (key.includes(pattern)) {
      apiCache.delete(key);
      console.log(`🗑️ Cleared cache: ${key}`);
    }
  });
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.SimpleCache = SimpleCache;
  window.apiCache = apiCache;
  window.dataCache = dataCache;
  window.cachedFetch = cachedFetch;
  window.debounce = debounce;
  window.showLoading = showLoading;
  window.hideLoading = hideLoading;
  window.lazyLoadImages = lazyLoadImages;
  window.measurePerformance = measurePerformance;
  window.clearCachePattern = clearCachePattern;
}
