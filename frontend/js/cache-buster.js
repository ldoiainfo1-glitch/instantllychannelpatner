/**
 * Cache Buster Utility
 * Prevents browser from caching images by adding timestamps
 * Ensures users always see the latest images after admin updates
 * 
 * Usage:
 * - Call addCacheBuster(imageUrl) before setting img.src
 * - Use loadImageWithCacheBuster(imgElement, url) for automatic handling
 */

(function(window) {
    'use strict';

    const CacheBuster = {
        /**
         * Add cache-busting parameter to URL
         * @param {string} url - Image URL
         * @param {boolean} force - Force new timestamp (default: false)
         * @returns {string} URL with cache-busting parameter
         */
        addCacheBuster: function(url) {
            if (!url || typeof url !== 'string') {
                return url;
            }

            // Skip if already a data URL (base64) or blob URL
            if (url.startsWith('data:') || url.startsWith('blob:')) {
                return url;
            }

            // Skip if it's a placeholder/fallback image
            if (url.includes('placeholder') || url.includes('default-avatar') || url.includes('svg+xml')) {
                return url;
            }

            // Skip static assets that don't change
            if (url.includes('/images/logo') || url.includes('/public/logo') || url.includes('unsplash.com')) {
                return url;
            }

            // Add timestamp parameter
            const separator = url.includes('?') ? '&' : '?';
            const timestamp = Date.now();
            
            return `${url}${separator}_=${timestamp}`;
        },

        /**
         * Load image with cache-busting
         * @param {HTMLImageElement} imgElement - Image element
         * @param {string} url - Image URL
         * @param {string} fallbackUrl - Optional fallback URL
         */
        loadImageWithCacheBuster: function(imgElement, url, fallbackUrl) {
            if (!imgElement || !url) {
                return;
            }

            const cachedUrl = this.addCacheBuster(url);
            imgElement.src = cachedUrl;

            // Add error handler with fallback
            if (fallbackUrl) {
                imgElement.onerror = function() {
                    this.onerror = null; // Prevent infinite loop
                    this.src = fallbackUrl;
                };
            }
        },

        /**
         * Refresh all images on page (add timestamp to force reload)
         * @param {string} selector - CSS selector for images (default: 'img[src]')
         */
        refreshAllImages: function(selector = 'img[src]') {
            const images = document.querySelectorAll(selector);
            images.forEach(img => {
                const originalSrc = img.getAttribute('src');
                if (originalSrc && !originalSrc.startsWith('data:')) {
                    // Remove old timestamp and add new one
                    const cleanUrl = originalSrc.split('?')[0].split('&_=')[0];
                    img.src = this.addCacheBuster(cleanUrl);
                }
            });
        },

        /**
         * Clear browser cache for specific image
         * @param {string} url - Image URL to clear
         */
        clearImageCache: function(url) {
            if (!url) return;
            
            // Force reload by creating temporary image
            const img = new Image();
            img.src = this.addCacheBuster(url);
        },

        /**
         * Set up automatic cache-busting for dynamically loaded images
         * Monitors DOM mutations and adds cache-busting to new images
         */
        setupAutoCacheBusting: function() {
            const self = this;
            
            // Observe DOM for new images
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1) { // Element node
                            // Check if it's an image
                            if (node.tagName === 'IMG' && node.src) {
                                const bustedUrl = self.addCacheBuster(node.src);
                                if (bustedUrl !== node.src) {
                                    node.src = bustedUrl;
                                }
                            }
                            // Check for images within added element
                            const images = node.querySelectorAll && node.querySelectorAll('img[src]');
                            if (images) {
                                images.forEach(function(img) {
                                    const bustedUrl = self.addCacheBuster(img.src);
                                    if (bustedUrl !== img.src) {
                                        img.src = bustedUrl;
                                    }
                                });
                            }
                        }
                    });
                });
            });

            // Start observing
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            console.log('✅ Auto cache-busting enabled for images');
        },

        /**
         * Get cache-busted API URL for fetching
         * @param {string} url - API endpoint URL
         * @returns {string} URL with cache-busting header hint
         */
        getAPIUrl: function(url) {
            return this.addCacheBuster(url);        },

        /**
         * Clear all cached data and force refresh
         */
        clearCache: function() {
            // Clear sessionStorage
            if (window.sessionStorage) {
                console.log('🧹 Clearing sessionStorage...');
                sessionStorage.clear();
            }
            
            // Clear localStorage (except essential data like auth tokens)
            if (window.localStorage) {
                console.log('🧹 Clearing localStorage...');
                // Store essential data before clearing
                const authToken = localStorage.getItem('authToken');
                const userId = localStorage.getItem('userId');
                
                localStorage.clear();
                
                // Restore essential data
                if (authToken) localStorage.setItem('authToken', authToken);
                if (userId) localStorage.setItem('userId', userId);
            }
            
            console.log('✅ Cache cleared successfully');
        },

        /**
         * Force reload page without cache
         */
        hardRefresh: function() {
            console.log('🔄 Performing hard refresh...');
            window.location.reload(true);        }
    };

    // Expose globally
    window.CacheBuster = CacheBuster;

    // Auto-initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            CacheBuster.setupAutoCacheBusting();
        });
    } else {
        CacheBuster.setupAutoCacheBusting();
    }

    console.log('🚀 CacheBuster utility loaded');

})(window);
