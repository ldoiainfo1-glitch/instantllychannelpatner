// Video migration and management functions
class VideoManager {
    constructor() {
        // Use the backend API URL
        this.baseURL = 'https://instantllychannelpatner.onrender.com';
    }

    // Show fallback message
    showFallback() {
        const videoElement = document.querySelector('#instructionVideo');
        const fallbackElement = document.querySelector('#videoFallback');
        
        if (videoElement && fallbackElement) {
            videoElement.style.display = 'none';
            fallbackElement.style.display = 'flex';
            console.log('📺 Showing video fallback message');
        }
    }

    // Migrate existing video to MongoDB
    async migrateVideo() {
        try {
            const response = await fetch(`${this.baseURL}/api/video/migrate-existing`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (response.ok) {
                console.log('✅ Video migration successful:', result);
                this.updateVideoSource();
                return result;
            } else {
                console.warn('⚠️ Video migration not available:', result);
                this.showFallback();
                return null;
            }
        } catch (error) {
            console.warn('⚠️ Migration endpoint not available:', error.message);
            this.showFallback();
            return null;
        }
    }

    // Update video source to use database stream
    updateVideoSource() {
        const videoElement = document.querySelector('#instructionVideo');
        if (videoElement) {
            const source = videoElement.querySelector('source');
            if (source) {
                source.src = `${this.baseURL}/api/video/stream/instruction_video.mp4`;
                
                // Add error handler
                videoElement.addEventListener('error', () => {
                    console.warn('⚠️ Video failed to load');
                    this.showFallback();
                });
                
                // Add loaded handler
                videoElement.addEventListener('loadedmetadata', () => {
                    console.log('✅ Video loaded successfully');
                });
                
                videoElement.load(); // Reload video with new source
                console.log('✅ Video source updated to use database stream');
            }
        }
    }

    // Check if video exists in database
    async checkVideoExists(filename = 'instruction_video.mp4') {
        try {
            const response = await fetch(`${this.baseURL}/api/video/info/${filename}`);
            return response.ok;
        } catch (error) {
            console.warn('⚠️ Could not check video existence:', error.message);
            return false;
        }
    }

    // Initialize video management
    async init() {
        console.log('🎥 Initializing video management...');
        
        // Check if video exists in database
        const videoExists = await this.checkVideoExists();
        
        if (!videoExists) {
            console.log('📤 Video not found in database');
            this.showFallback();
            // Optionally try to migrate if it exists locally
            // await this.migrateVideo();
        } else {
            console.log('✅ Video found in database, updating source...');
            this.updateVideoSource();
        }
    }
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const videoManager = new VideoManager();
    
    // Check if API is available before initializing
    fetch('https://instantllychannelpatner.onrender.com/health')
        .then(response => {
            if (response.ok) {
                videoManager.init();
            } else {
                videoManager.showFallback();
            }
        })
        .catch(() => {
            console.log('ℹ️ API not available, showing fallback');
            videoManager.showFallback();
        });
});

// Export for manual use
window.VideoManager = VideoManager;
