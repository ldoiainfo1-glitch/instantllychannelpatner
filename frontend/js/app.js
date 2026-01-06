// Configuration - Updated for Vercel deployment fix
const API_BASE_URL = 'https://instantllychannelpatner.onrender.com/api';
// const API_BASE_URL = 'http://localhost:5000/api';


// Global variables
let currentPositions = [];
let locationData = {};
let locationDataLoaded = false; // Track if location data is loaded
let isAdmin = false;

console.log('🚀 Instantly Channel Partner App - v1.0.3 - Cache Fix Applied');

/**
 * Utility function to fetch data with cache-busting
 * Ensures fresh data is always loaded from backend
 */
function fetchWithCacheBusting(url, options = {}) {
    // Add cache-busting timestamp to URL
    const separator = url.includes('?') ? '&' : '?';
    const cacheBustedUrl = `${url}${separator}_t=${Date.now()}`;
    
    // Add cache control headers
    const defaultHeaders = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
    };
    
    const mergedOptions = {
        ...options,
        cache: 'no-store',
        headers: {
            ...defaultHeaders,
            ...(options.headers || {})
        }
    };
    
    return fetch(cacheBustedUrl, mergedOptions);
}

// Store auth token
let authToken = localStorage.getItem('authToken');
let currentUser = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
    setupEventListeners();

    // Load table data immediately for fast initial display
    loadApplications();

    // Load location data in background (lazy loading - only when filters are used)
    // This prevents blocking the initial table load
    setTimeout(() => {
        loadLocationData();
    }, 500); // Load after 500ms delay

    // Check if user is logged in on page load
    if (authToken) {
        verifyToken();
    }
});

// Initialize the application
function initializeApp() {
    console.log('Instantly Cards Channel Partner System Initialized');

    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    setupNavigation();

    // Search and filters
    document.getElementById('searchBtn').addEventListener('click', handleSearch);
    document.getElementById('refreshBtn').addEventListener('click', handleSearch);
    document.getElementById('clearFilters').addEventListener('click', clearFilters);
    
    // Add auto-search on input (with debounce to avoid too many searches)
    let searchTimeout;
    const debounceSearch = () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            console.log('🔍 Auto-search triggered');
            handleSearch();
        }, 500); // Wait 500ms after user stops typing
    };
    
    document.getElementById('searchName').addEventListener('input', debounceSearch);
    document.getElementById('searchPhone').addEventListener('input', debounceSearch);

    // Setup searchable filters
    setupSearchableFilters();

    // Application form
    document.getElementById('submitApplication').addEventListener('click', submitApplication);
    
    // Phone number validation with visual feedback
    const phoneInput = document.getElementById('applicantPhone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function() {
            const phoneHelp = document.getElementById('phoneHelp');
            const value = this.value.replace(/[^0-9]/g, '');
            this.value = value; // Only allow numbers
            
            if (value.length === 0) {
                phoneHelp.textContent = '10 digit phone number only';
                phoneHelp.className = 'text-muted';
                this.classList.remove('is-valid', 'is-invalid');
            } else if (value.length < 10) {
                phoneHelp.textContent = `Enter ${10 - value.length} more digit${10 - value.length > 1 ? 's' : ''}`;
                phoneHelp.className = 'text-warning';
                this.classList.remove('is-valid');
                this.classList.add('is-invalid');
            } else if (value.length === 10) {
                phoneHelp.textContent = '✓ Valid phone number';
                phoneHelp.className = 'text-success';
                this.classList.remove('is-invalid');
                this.classList.add('is-valid');
            } else {
                this.value = value.substring(0, 10); // Limit to 10 digits
            }
        });
    }

    // Feedback form (now using dummy content, no form needed)

    // Rating stars
    setupRatingStars();

    // Login form handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleLogin();
        });
    }
}

// Setup navigation smooth scrolling
function setupNavigation() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Load location data from API
async function loadLocationData() {
    // Return immediately if already loaded (caching)
    if (locationDataLoaded) {
        console.log('✅ Location data already loaded (using cache)');
        return;
    }

    try {
        console.log('⚡ Loading location data with cache-busting...');

        // Use format=distinct to get actual location lists for filters (not counts)
        let response = await fetchWithCacheBusting(`${API_BASE_URL}/locations/all?format=distinct`);

        if (response.ok) {
            const data = await response.json();

            // Store all options
            locationData = {
                zones: data.zones || [],
                states: data.states || [],
                divisions: data.divisions || [],
                districts: data.districts || [],
                tehsils: data.tehsils || [],
                pincodes: data.pincodes || [],
                villages: data.villages || []
            };
        } else {
            // Fallback to individual endpoints if /all doesn't exist
            console.log('⚠️ Using fallback: loading from individual endpoints with cache-busting...');

            const [zonesRes, statesRes, divisionsRes, districtsRes, tehsilsRes, pincodesRes, villagesRes] = await Promise.all([
                fetchWithCacheBusting(`${API_BASE_URL}/locations/zones`),
                fetchWithCacheBusting(`${API_BASE_URL}/locations/states`),
                fetchWithCacheBusting(`${API_BASE_URL}/locations/divisions`),
                fetchWithCacheBusting(`${API_BASE_URL}/locations/districts`),
                fetchWithCacheBusting(`${API_BASE_URL}/locations/tehsils`),
                fetchWithCacheBusting(`${API_BASE_URL}/locations/pincodes`),
                fetchWithCacheBusting(`${API_BASE_URL}/locations/villages`)
            ]);

            const [zones, states, divisions, districts, tehsils, pincodes, villages] = await Promise.all([
                zonesRes.json(),
                statesRes.json(),
                divisionsRes.json(),
                districtsRes.json(),
                tehsilsRes.json(),
                pincodesRes.json(),
                villagesRes.json()
            ]);

            locationData = {
                zones: zones || [],
                states: states || [],
                divisions: divisions || [],
                districts: districts || [],
                tehsils: tehsils || [],
                pincodes: pincodes || [],
                villages: villages || []
            };
        }

        locationDataLoaded = true; // Mark as loaded

        console.log('✅ Location data loaded in background');
        console.log('📊 Loaded:', {
            zones: locationData.zones.length,
            states: locationData.states.length,
            divisions: locationData.divisions.length,
            districts: locationData.districts.length,
            tehsils: locationData.tehsils.length,
            pincodes: locationData.pincodes.length,
            villages: locationData.villages.length
        });

        console.log('🎯 Searchable filters ready with location data loaded');
    } catch (error) {
        console.error('❌ Error loading location data:', error);
        console.log('ℹ️ Filters will use on-demand data loading');
    }
}

// Build location hierarchy from positions data
function buildLocationHierarchy(positions) {
    const hierarchy = {
        zones: new Set(),
        states: new Map(), // zone -> states
        divisions: new Map(), // state -> divisions
        districts: new Map(), // division -> districts
        tehsils: new Map(), // district -> tehsils
        pincodes: new Map(), // tehsil -> pincodes
        villages: new Map(), // pincode -> villages
        reverseMap: {} // for reverse lookup: pincode -> {country, zone, state, etc}
    };

    positions.forEach(position => {
        const loc = position.location;
        if (!loc) return;

        // Forward mapping
        if (loc.zone) hierarchy.zones.add(loc.zone);

        if (loc.zone && loc.state) {
            if (!hierarchy.states.has(loc.zone)) hierarchy.states.set(loc.zone, new Set());
            hierarchy.states.get(loc.zone).add(loc.state);
        }

        if (loc.state && loc.division) {
            const stateKey = `${loc.zone}|${loc.state}`;
            if (!hierarchy.divisions.has(stateKey)) hierarchy.divisions.set(stateKey, new Set());
            hierarchy.divisions.get(stateKey).add(loc.division);
        }

        if (loc.division && loc.district) {
            const divisionKey = `${loc.zone}|${loc.state}|${loc.division}`;
            if (!hierarchy.districts.has(divisionKey)) hierarchy.districts.set(divisionKey, new Set());
            hierarchy.districts.get(divisionKey).add(loc.district);
        }

        if (loc.district && loc.tehsil) {
            const districtKey = `${loc.zone}|${loc.state}|${loc.division}|${loc.district}`;
            if (!hierarchy.tehsils.has(districtKey)) hierarchy.tehsils.set(districtKey, new Set());
            hierarchy.tehsils.get(districtKey).add(loc.tehsil);
        }

        if (loc.tehsil && loc.pincode) {
            const tehsilKey = `${loc.zone}|${loc.state}|${loc.division}|${loc.district}|${loc.tehsil}`;
            if (!hierarchy.pincodes.has(tehsilKey)) hierarchy.pincodes.set(tehsilKey, new Set());
            hierarchy.pincodes.get(tehsilKey).add(loc.pincode);
        }

        if (loc.pincode && loc.village) {
            const pincodeKey = `${loc.zone}|${loc.state}|${loc.division}|${loc.district}|${loc.tehsil}|${loc.pincode}`;
            if (!hierarchy.villages.has(pincodeKey)) hierarchy.villages.set(pincodeKey, new Set());
            hierarchy.villages.get(pincodeKey).add(loc.village);
        }

        // Reverse mapping for each level
        if (loc.pincode) {
            hierarchy.reverseMap[loc.pincode] = {
                country: loc.country,
                zone: loc.zone,
                state: loc.state,
                division: loc.division,
                district: loc.district,
                tehsil: loc.tehsil
            };
        }
        if (loc.village) {
            hierarchy.reverseMap[loc.village] = {
                country: loc.country,
                zone: loc.zone,
                state: loc.state,
                division: loc.division,
                district: loc.district,
                tehsil: loc.tehsil,
                pincode: loc.pincode
            };
        }
        if (loc.tehsil) {
            hierarchy.reverseMap[loc.tehsil] = {
                country: loc.country,
                zone: loc.zone,
                state: loc.state,
                division: loc.division,
                district: loc.district
            };
        }
        if (loc.district) {
            hierarchy.reverseMap[loc.district] = {
                country: loc.country,
                zone: loc.zone,
                state: loc.state,
                division: loc.division
            };
        }
        if (loc.division) {
            hierarchy.reverseMap[loc.division] = {
                country: loc.country,
                zone: loc.zone,
                state: loc.state
            };
        }
        if (loc.state) {
            hierarchy.reverseMap[loc.state] = {
                country: loc.country,
                zone: loc.zone
            };
        }
        if (loc.zone) {
            hierarchy.reverseMap[loc.zone] = {
                country: loc.country
            };
        }
    });

    // Convert Sets to Arrays
    hierarchy.zones = Array.from(hierarchy.zones);

    return hierarchy;
}

// Initialize searchable filters - options are populated on-demand when users click
function populateAllDropdowns() {
    console.log('Searchable filters ready with location data loaded');
    // Note: Individual filter dropdowns are now populated on-demand when clicked
    // This improves performance and provides better search functionality
}

// Populate zone filter
// Auto-update parent filters based on selection (reverse mapping)
// Auto-update parent filters based on selection (reverse mapping)
async function autoUpdateParentFilters(selectedValue, level) {
    if (!selectedValue) {
        console.log('No selected value for reverse mapping');
        return;
    }

    try {
        // Get location details from reverse lookup API
        const response = await fetch(`${API_BASE_URL}/locations/reverse-lookup/${encodeURIComponent(selectedValue)}`);
        if (!response.ok) {
            console.log('No reverse mapping found for:', selectedValue);
            await loadApplications(); // Still reload with current selection
            return;
        }

        const parentData = await response.json();
        console.log('Auto-updating parent filters for:', selectedValue, 'Data:', parentData);

        // Update parent filters based on the reverse mapping
        if (parentData.zone) {
            document.getElementById('filterZone').value = parentData.zone;
        }

        if (parentData.state) {
            document.getElementById('filterState').value = parentData.state;
        }

        if (parentData.division) {
            document.getElementById('filterDivision').value = parentData.division;
        }

        if (parentData.district) {
            document.getElementById('filterDistrict').value = parentData.district;
        }

        if (parentData.tehsil) {
            document.getElementById('filterTehsil').value = parentData.tehsil;
        }

        if (parentData.pincode && level === 'village') {
            document.getElementById('filterPincode').value = parentData.pincode;
        }

        // Reload applications with updated filters
        await loadApplications();
    } catch (error) {
        console.error('Error in reverse mapping:', error);
        await loadApplications(); // Still reload with current selection
    }
}

// Helper function to populate dropdown with options
function populateDropdown(selectId, options) {
    const select = document.getElementById(selectId);
    const defaultText = select.querySelector('option[value=""]')?.textContent || 'All';

    select.innerHTML = `<option value="">${defaultText}</option>`;

    if (Array.isArray(options)) {
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            select.appendChild(optionElement);
        });
    }
}

// Handle zone change
async function handleZoneChange() {
    const selectedZone = document.getElementById('filterZone').value;

    // Don't clear dependent selects - all options are already loaded
    // Just reload applications for this zone level  
    await loadApplications();
}

// Handle state change
async function handleStateChange() {
    const selectedZone = document.getElementById('filterZone').value;
    const selectedState = document.getElementById('filterState').value;

    // Auto-update parent filters if state was selected directly (reverse mapping)
    if (selectedState && !selectedZone) {
        await autoUpdateParentFilters(selectedState, 'state');
        return; // autoUpdateParentFilters will reload positions
    }

    // Reload applications for this state level
    await loadApplications();
}

// Handle division change
async function handleDivisionChange() {
    const selectedZone = document.getElementById('filterZone').value;
    const selectedState = document.getElementById('filterState').value;
    const selectedDivision = document.getElementById('filterDivision').value;

    // Auto-update parent filters if division was selected directly (reverse mapping)
    if (selectedDivision && (!selectedZone || !selectedState)) {
        await autoUpdateParentFilters(selectedDivision, 'division');
        return; // autoUpdateParentFilters will reload positions
    }

    // Reload applications for this division level
    await loadApplications();
}

// Handle district change
async function handleDistrictChange() {
    const selectedDistrict = document.getElementById('filterDistrict').value;

    // Auto-update parent filters if district was selected directly
    if (selectedDistrict) {
        await autoUpdateParentFilters(selectedDistrict, 'district');
        return;
    }

    // Reload applications for this district level
    await loadApplications();
}

// Handle tehsil change
async function handleTehsilChange() {
    const selectedTehsil = document.getElementById('filterTehsil').value;

    // Auto-update parent filters if tehsil was selected directly
    if (selectedTehsil) {
        await autoUpdateParentFilters(selectedTehsil, 'tehsil');
        return;
    }

    // Reload applications for this tehsil level
    await loadApplications();
}

// Handle pincode change
async function handlePincodeChange() {
    const selectedPincode = document.getElementById('filterPincode').value;

    // Auto-update parent filters if pincode was selected directly (REVERSE MAPPING)
    if (selectedPincode) {
        await autoUpdateParentFilters(selectedPincode, 'pincode');
        return;
    }

    // Reload applications for this pincode level
    await loadApplications();
}

// Handle village change
async function handleVillageChange() {
    const selectedVillage = document.getElementById('filterVillage').value;

    // Auto-update parent filters if village was selected directly
    if (selectedVillage) {
        await autoUpdateParentFilters(selectedVillage, 'village');
        return;
    }

    // Reload applications for this village level
    await loadApplications();
}

// Clear dependent select elements
function clearDependentSelects(selectIds) {
    selectIds.forEach(id => {
        const select = document.getElementById(id);
        select.innerHTML = `<option value="">All ${id.replace('filter', '').replace(/([A-Z])/g, ' $1').trim()}s</option>`;
    });
}

// Load dynamic positions based on location filters - generates positions for each location level
async function loadApplications() {
    try {
        const tbody = document.getElementById('positionsTableBody');

        // Show minimal loading state (don't block UI)
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-3">
                    <div class="spinner-border spinner-border-sm text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <span class="ms-2 text-muted">Loading...</span>
                </td>
            </tr>
        `;

        // Get all filter values
        const country = document.getElementById('filterCountry').value || 'India';
        const zone = document.getElementById('filterZone').value;
        const state = document.getElementById('filterState').value;
        const division = document.getElementById('filterDivision').value;
        const district = document.getElementById('filterDistrict').value;
        const tehsil = document.getElementById('filterTehsil').value;
        const pincode = document.getElementById('filterPincode').value;
        const village = document.getElementById('filterVillage').value;

        // Build query params for dynamic positions endpoint
        const params = new URLSearchParams({ country });
        if (zone) params.append('zone', zone);
        if (state) params.append('state', state);
        if (division) params.append('division', division);
        if (district) params.append('district', district);
        if (tehsil) params.append('tehsil', tehsil);
        if (pincode) params.append('pincode', pincode);
        if (village) params.append('village', village);

        // Add cache-busting timestamp to force fresh data from backend
        params.append('_t', Date.now());

        const url = `${API_BASE_URL}/dynamic-positions?${params.toString()}`;

        const response = await fetch(url, {
            cache: 'no-store', // Don't cache this request
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Handle both old array format and new {success, positions} format
        const positions = data.positions || data || [];

        // Store positions directly - they are already formatted with application data
        currentPositions = positions.map((pos, index) => ({
            ...pos,
            sNo: index + 1 // Ensure sequential numbering
        }));

        displayPositions(currentPositions);

        // Update selected filters display
        updateSelectedFiltersBadges();
        
        // Update Position Statistics table with same filters
        const filters = {};
        if (zone) filters.zone = zone;
        if (state) filters.state = state;
        if (division) filters.division = division;
        if (district) filters.district = district;
        if (tehsil) filters.tehsil = tehsil;
        if (pincode) filters.pincode = pincode;
        if (village) filters.village = village;
        filters.country = country;
        
        if (typeof loadPositionStatistics === 'function') {
            loadPositionStatistics(filters);
        }
    } catch (error) {
        console.error('❌ Error loading applications:', error);
        showNotification('Error loading applications: ' + error.message, 'error');

        // Show error in table
        const tbody = document.getElementById('positionsTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center py-4 text-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error loading positions. Please refresh the page.
                </td>
            </tr>
        `;
    }
}

// Display positions in table
function displayPositions(positions) {
    const tbody = document.getElementById('positionsTableBody');

    if (positions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center py-4">
                    <i class="fas fa-search fa-2x text-muted mb-3"></i>
                    <p class="text-muted mb-0">No positions found matching your criteria</p>
                </td>
            </tr>
        `;
        return;
    }

    // Use DocumentFragment for faster DOM manipulation
    const fragment = document.createDocumentFragment();

    positions.forEach(position => {
        const row = createPositionRow(position);
        fragment.appendChild(row);
    });

    // Clear and append all at once (much faster than individual appends)
    tbody.innerHTML = '';
    tbody.appendChild(fragment);

    // Skip animations for faster rendering
    // Animation removed for performance
}

// Create position table row
function createPositionRow(position) {
    const row = document.createElement('tr');

    const statusClass = getStatusClass(position.status);

    // Determine status text based on application workflow
    let statusText = position.status;
    if (position.applicantDetails) {
        if (position.status === 'Verified' || position.applicantDetails.isVerified) {
            statusText = 'Verified';
        } else if (position.status === 'Approved') {
            statusText = 'Approved';
        } else if (position.status === 'Pending') {
            statusText = 'Pending Admin Review';
        } else {
            statusText = position.status;
        }
    }

    // Format location for position display
    const location = formatLocation(position.location);

    // ID cell - always show position ID
    const idCell = `<small class="text-muted" style="font-size: 0.7rem; word-break: break-all;">${position._id}</small>`;

    // Handle name - show applicant name or Apply button
    let nameCell = '';
    if (position.status === 'Available') {
        nameCell = `
            <button class="btn btn-success btn-sm" onclick="openApplicationModal('${position._id}', '${position.designation}', ${JSON.stringify(position.location).replace(/"/g, '&quot;')})">
                <i class="fas fa-plus me-1"></i>Apply Now
            </button>
        `;
    } else if (position.applicantDetails && position.applicantDetails.name) {
        nameCell = position.applicantDetails.name;
    } else {
        nameCell = '-';
    }

    // Determine Area Head For - show most specific location area name (district, tehsil, etc.)
    let areaHeadFor = '-';
    if (position.location) {
        // Show only the most specific location (lowest level in hierarchy)
        if (position.location.village) {
            areaHeadFor = position.location.village;
        } else if (position.location.pincode) {
            areaHeadFor = position.location.pincode;
        } else if (position.location.tehsil) {
            areaHeadFor = position.location.tehsil;
        } else if (position.location.district) {
            areaHeadFor = position.location.district;
        } else if (position.location.division) {
            areaHeadFor = position.location.division;
        } else if (position.location.state) {
            areaHeadFor = position.location.state;
        } else if (position.location.zone) {
            areaHeadFor = position.location.zone;
        } else if (position.location.country) {
            areaHeadFor = position.location.country;
        }
    }

    // Handle photo
    let photoCell = '';
    if (position.applicantDetails && position.applicantDetails.photo) {
        console.log(`🖼️  FRONTEND RENDERING: ${position.applicantDetails.name}`);
        console.log(`   Photo exists: YES`);
        console.log(`   Photo length: ${position.applicantDetails.photo.length} chars`);
        console.log(`   Photo preview: ${position.applicantDetails.photo.substring(0, 50)}...`);
        console.log(`   Is base64: ${position.applicantDetails.photo.startsWith('data:')}`);
        
        // Photo is now stored as base64 in MongoDB
        // Add cache-busting timestamp to force fresh photo load
        const photoSrc = position.applicantDetails.photo.startsWith('data:') 
            ? position.applicantDetails.photo 
            : (window.CacheBuster ? window.CacheBuster.addCacheBuster(position.applicantDetails.photo) : `${position.applicantDetails.photo}?t=${Date.now()}`);

        photoCell = `<img src="${photoSrc}"
                         alt="${position.applicantDetails.name || 'Applicant'}" 
                         class="rounded-circle"
                         style="width: 50px; height: 50px; object-fit: cover;"
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjUiIGN5PSIyNSIgcj0iMjUiIGZpbGw9IiNlMmU4ZjAiLz4KPHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iMzAiIHZpZXdCb3g9IjAgMCAzMCAzMCIgZmlsbD0ibm9uZSIgeG1zbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSIxMCIgeT0iMTAiPgo8cGF0aCBkPSJNMTUgMTVDMTcuNzYxNCAxNSAyMCAxMi43NjE0IDIwIDEwQzIwIDcuMjM4NTggMTcuNzYxNCA1IDE1IDVDMTIuMjM4NiA1IDEwIDcuMjM4NTggMTAgMTBDMTAgMTIuNzYxNCAxMi4yMzg2IDE1IDE1IDE1WiIgZmlsbD0iIzYzNjM3NiIvPgo8cGF0aCBkPSJNMTUgMTdDMTEuNjY1IDUgOC41IDcuOTE2MjUgOC41IDExLjVWMjFIMjEuNVYxMS41QzIxLjUgNy45MTYyNSAxOC4zMzUgMTcgMTUgMTdaIiBmaWxsPSIjNjM2Mzc2Ii8+Cjwvc3ZnPgo8L3N2Zz4=';">`;
        console.log(`   ✅ Photo cell created with img tag`);
    } else {
        console.log(`🖼️  FRONTEND RENDERING: ${position.applicantDetails ? position.applicantDetails.name : 'Unknown'}`);
        console.log(`   Photo exists: NO - showing default icon`);
        photoCell = '<i class="fas fa-user-circle fa-3x text-muted"></i>';
    }

    // Handle phone number
    const phoneNo = position.applicantDetails && position.applicantDetails.phone
        ? position.applicantDetails.phone
        : '-';

    // Handle introduced count - show how many people joined using this person's referral code
    const introducedBy = position.applicantDetails && position.applicantDetails.introducedCount !== undefined
        ? position.applicantDetails.introducedCount
        : (position.applicantDetails ? 0 : '-');

    // Handle days since application
    const days = position.applicantDetails && position.applicantDetails.days !== undefined
        ? position.applicantDetails.days
        : '-';

    // Others column - Actions dropdown or Expand button
    let othersCell = '';
    
    // Determine if this position has potential child levels
    const locationHierarchy = {
        'zone': 'state',
        'state': 'division', 
        'division': 'district',
        'district': 'tehsil',
        'tehsil': 'pincode',
        'pincode': 'village'
    };
    
    // Detect current level and check if it has children
    let currentLevel = null;
    let hasChildren = false;
    
    if (position.location) {
        if (position.location.pincode && !position.location.village) {
            currentLevel = 'pincode';
            hasChildren = true;
        } else if (position.location.tehsil && !position.location.pincode) {
            currentLevel = 'tehsil';
            hasChildren = true;
        } else if (position.location.district && !position.location.tehsil) {
            currentLevel = 'district';
            hasChildren = true;
        } else if (position.location.division && !position.location.district) {
            currentLevel = 'division';
            hasChildren = true;
        } else if (position.location.state && !position.location.division) {
            currentLevel = 'state';
            hasChildren = true;
        } else if (position.location.zone && !position.location.state) {
            currentLevel = 'zone';
            hasChildren = true;
        }
    }
    
    if (hasChildren && (position.status === 'Approved' || position.status === 'Verified')) {
        // Show BOTH expand button AND actions dropdown for any level with children
        const phone = position.applicantDetails.phone || '';
        const name = position.applicantDetails.name || '';
        const photo = position.applicantDetails.photo || '';
        const locationJson = JSON.stringify(position.location).replace(/"/g, '&quot;');
        
        othersCell = `
            <div class="d-flex gap-2 align-items-center">
                <button class="btn btn-sm btn-info" onclick="toggleChildLocations('${position._id}', '${currentLevel}', ${locationJson}); return false;" 
                        id="expandBtn_${position._id}" title="See ${locationHierarchy[currentLevel]}s under this ${currentLevel}"
                        style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">
                    <i class="fas fa-chevron-down me-1" id="expandIcon_${position._id}" style="font-size: 0.7rem;"></i>See 1 more level
                </button>
                <div class="dropdown">
                    <button class="btn btn-sm btn-outline-primary dropdown-toggle" type="button" 
                            id="actionMenu${position._id}" data-bs-toggle="dropdown" aria-expanded="false">
                        Actions ▼
                    </button>
                    <ul class="dropdown-menu" aria-labelledby="actionMenu${position._id}">
                        <li>
                            <a class="dropdown-item" href="#" onclick="showLoginCredentials('${phone}', '${name}'); return false;">
                                <i class="fas fa-key me-2"></i>Login Credentials
                            </a>
                        </li>
                        <li>
                            <a class="dropdown-item" href="#" onclick="showReferralCode('${position._id}', '${phone}'); return false;">
                                <i class="fas fa-users me-2"></i>Referral Code
                            </a>
                        </li>
                        <li>
                            <a class="dropdown-item" href="#" onclick="showIDCard('${name}', '${phone}', '${photo}', ${locationJson}); return false;">
                                <i class="fas fa-id-card me-2"></i>ID Card
                            </a>
                        </li>
                        <li>
                            <a class="dropdown-item" href="#" onclick="openPromotion('${position._id}', '${name}', '${phone}', '${photo}', ${locationJson}, '${position.designation || ''}'); return false;">
                                <i class="fas fa-bullhorn me-2"></i>Promotion
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
        `;
    } else if (position.applicantDetails && (position.status === 'Approved' || position.status === 'Verified')) {
        // ENABLED Actions dropdown - shows immediately after admin approval
        const phone = position.applicantDetails.phone || '';
        const name = position.applicantDetails.name || '';
        const photo = position.applicantDetails.photo || '';

        othersCell = `
            <div class="dropdown">
                <button class="btn btn-sm btn-outline-primary dropdown-toggle" type="button" 
                        id="actionMenu${position._id}" data-bs-toggle="dropdown" aria-expanded="false">
                    Actions ▼
                </button>
                <ul class="dropdown-menu" aria-labelledby="actionMenu${position._id}">
                    <li>
                        <a class="dropdown-item" href="#" onclick="showLoginCredentials('${phone}', '${name}'); return false;">
                            <i class="fas fa-key me-2"></i>Login Credentials
                        </a>
                    </li>
                    <li>
                        <a class="dropdown-item" href="#" onclick="showReferralCode('${position._id}', '${phone}'); return false;">
                            <i class="fas fa-users me-2"></i>Referral Code
                        </a>
                    </li>
                    <li>
                        <a class="dropdown-item" href="#" onclick="showIDCard('${name}', '${phone}', '${photo}', ${JSON.stringify(position.location).replace(/"/g, '&quot;')})" return false;">
                            <i class="fas fa-id-card me-2"></i>ID Card
                        </a>
                    </li>
                    <li>
                        <a class="dropdown-item" href="#" onclick="openPromotion('${position._id}', '${name}', '${phone}', '${photo}', ${JSON.stringify(position.location).replace(/"/g, '&quot;')}, '${position.designation || ''}'); return false;">
                            <i class="fas fa-bullhorn me-2"></i>Promotion
                        </a>
                    </li>
                </ul>
            </div>
        `;
    } else if (position.status === 'Available') {
        // No action button for available positions
        othersCell = `<span class="text-muted small">-</span>`;
    } else {
        // DISABLED Actions dropdown - for Pending or Rejected status
        othersCell = `
            <div class="dropdown">
                <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" 
                        disabled title="Available after admin approval">
                    Actions ▼
                </button>
            </div>
        `;
    }

    row.innerHTML = `
        <td><strong>${position.sNo}</strong></td>
        <td>${idCell}</td>
        <td>${nameCell}</td>
        <td>${areaHeadFor}</td>
        <td class="text-center">${photoCell}</td>
        <td>${phoneNo}</td>
        <td>${introducedBy}</td>
        <td><strong>${days}</strong></td>
        <td><span class="badge ${statusClass}">${statusText}</span></td>
        <td>${othersCell}</td>
    `;

    return row;
}

// Store expanded locations state
const expandedLocations = new Map();

// Toggle child locations display (works for all levels)
async function toggleChildLocations(positionId, parentLevel, parentLocation) {
    const expandBtn = document.getElementById(`expandBtn_${positionId}`);
    const expandIcon = document.getElementById(`expandIcon_${positionId}`);
    const parentRow = document.querySelector(`tr:has(#expandBtn_${positionId})`);
    
    if (!parentRow) {
        console.error('Parent row not found');
        return;
    }
    
    // Check if already expanded
    if (expandedLocations.has(positionId)) {
        // Collapse: Remove all nested rows
        const nestedRows = document.querySelectorAll(`tr[data-parent-id="${positionId}"]`);
        nestedRows.forEach(row => row.remove());
        expandedLocations.delete(positionId);
        
        // Update button icon
        expandIcon.className = 'fas fa-chevron-down me-1';
        expandIcon.style.fontSize = '0.7rem';
        expandBtn.innerHTML = '<i class="fas fa-chevron-down me-1" style="font-size: 0.7rem;"></i>See 1 more level';
        return;
    }
    
    // Expand: Fetch and display child locations
    expandBtn.disabled = true;
    expandBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Loading...';
    
    try {
        // Build query params based on parent location
        const queryParams = new URLSearchParams();
        if (parentLocation.country) queryParams.append('country', parentLocation.country);
        if (parentLocation.zone) queryParams.append('zone', parentLocation.zone);
        if (parentLocation.state) queryParams.append('state', parentLocation.state);
        if (parentLocation.division) queryParams.append('division', parentLocation.division);
        if (parentLocation.district) queryParams.append('district', parentLocation.district);
        if (parentLocation.tehsil) queryParams.append('tehsil', parentLocation.tehsil);
        if (parentLocation.pincode) queryParams.append('pincode', parentLocation.pincode);
        
        // Fetch child positions
        const response = await fetch(`${API_BASE_URL}/dynamic-positions?${queryParams.toString()}`);
        const data = await response.json();
        
        if (!data.positions || data.positions.length === 0) {
            alert('No child positions found for this location');
            return;
        }
        
        // Filter for immediate child level only
        const childPositions = data.positions.filter(pos => {
            if (!pos.location) return false;
            
            // Check if this is the immediate child level
            if (parentLevel === 'zone') {
                return pos.location.state && pos.location.zone === parentLocation.zone && !pos.location.division;
            } else if (parentLevel === 'state') {
                return pos.location.division && pos.location.state === parentLocation.state && !pos.location.district;
            } else if (parentLevel === 'division') {
                return pos.location.district && pos.location.division === parentLocation.division && !pos.location.tehsil;
            } else if (parentLevel === 'district') {
                return pos.location.tehsil && pos.location.district === parentLocation.district && !pos.location.pincode;
            } else if (parentLevel === 'tehsil') {
                return pos.location.pincode && pos.location.tehsil === parentLocation.tehsil && !pos.location.village;
            } else if (parentLevel === 'pincode') {
                return pos.location.village && pos.location.pincode === parentLocation.pincode;
            }
            return false;
        });
        
        if (childPositions.length === 0) {
            alert('No child-level positions found');
            return;
        }
        
        // Mark as expanded
        expandedLocations.set(positionId, true);
        
        // Get current nesting level from parent row
        const parentNestLevel = parseInt(parentRow.getAttribute('data-nest-level') || '0');
        const childNestLevel = parentNestLevel + 1;
        
        // Create nested rows
        let lastInsertedRow = parentRow;
        childPositions.forEach((childPos, index) => {
            const nestedRow = createNestedRow(childPos, positionId, index + 1, childNestLevel);
            lastInsertedRow.insertAdjacentElement('afterend', nestedRow);
            lastInsertedRow = nestedRow;
        });
        
        // Update button icon
        expandIcon.className = 'fas fa-chevron-up me-1';
        expandIcon.style.fontSize = '0.7rem';
        expandBtn.innerHTML = '<i class="fas fa-chevron-up me-1" style="font-size: 0.7rem;"></i>Hide level';
        
    } catch (error) {
        console.error('Error fetching child locations:', error);
        alert('Failed to load child locations. Please try again.');
    } finally {
        expandBtn.disabled = false;
    }
}

// Create nested row for any child location
function createNestedRow(position, parentId, subIndex, nestLevel) {
    const row = document.createElement('tr');
    row.setAttribute('data-parent-id', parentId);
    row.setAttribute('data-nest-level', nestLevel);
    
    // Calculate background color based on nesting level
    const bgColors = ['#f8f9fa', '#f0f1f3', '#e8e9eb', '#e0e1e3', '#d8d9db'];
    row.style.backgroundColor = bgColors[Math.min(nestLevel - 1, bgColors.length - 1)];
    
    const statusClass = getStatusClass(position.status);
    let statusText = position.status;
    if (position.applicantDetails) {
        if (position.status === 'Verified' || position.applicantDetails.isVerified) {
            statusText = 'Verified';
        } else if (position.status === 'Approved') {
            statusText = 'Approved';
        } else if (position.status === 'Pending') {
            statusText = 'Pending Admin Review';
        }
    }
    
    // Calculate indentation based on nesting level
    const indentPx = 20 + (nestLevel * 20);
    
    // ID cell - always show position ID
    const idCell = `<small class="text-muted" style="font-size: 0.7rem; word-break: break-all;">${position._id}</small>`;
    
    // Name cell
    let nameCell = '';
    if (position.status === 'Available') {
        nameCell = `
            <button class="btn btn-success btn-sm" onclick="openApplicationModal('${position._id}', '${position.designation}', ${JSON.stringify(position.location).replace(/"/g, '&quot;')})">
                <i class="fas fa-plus me-1"></i>Apply Now
            </button>
        `;
    } else if (position.applicantDetails && position.applicantDetails.name) {
        nameCell = position.applicantDetails.name;
    } else {
        nameCell = '-';
    }
    
    // Area Head For - show only the most specific location name
    let areaHeadFor = '-';
    if (position.location) {
        // Show only the most specific location (lowest level in hierarchy)
        if (position.location.village) {
            areaHeadFor = position.location.village;
        } else if (position.location.pincode) {
            areaHeadFor = position.location.pincode;
        } else if (position.location.tehsil) {
            areaHeadFor = position.location.tehsil;
        } else if (position.location.district) {
            areaHeadFor = position.location.district;
        } else if (position.location.division) {
            areaHeadFor = position.location.division;
        } else if (position.location.state) {
            areaHeadFor = position.location.state;
        } else if (position.location.zone) {
            areaHeadFor = position.location.zone;
        } else if (position.location.country) {
            areaHeadFor = position.location.country;
        }
    }
    
    // Photo
    let photoCell = '';
    if (position.applicantDetails && position.applicantDetails.photo) {
        const photoSrc = position.applicantDetails.photo.startsWith('data:') 
            ? position.applicantDetails.photo 
            : (window.CacheBuster ? window.CacheBuster.addCacheBuster(position.applicantDetails.photo) : `${position.applicantDetails.photo}?t=${Date.now()}`);
        photoCell = `<img src="${photoSrc}" alt="${position.applicantDetails.name || 'Applicant'}" class="rounded-circle" style="width: 50px; height: 50px; object-fit: cover;">`;
    } else {
        photoCell = '<i class="fas fa-user-circle fa-3x text-muted"></i>';
    }
    
    // Phone, Introduced, Days
    const phoneNo = position.applicantDetails && position.applicantDetails.phone ? position.applicantDetails.phone : '-';
    const introducedBy = position.applicantDetails && position.applicantDetails.introducedCount !== undefined
        ? position.applicantDetails.introducedCount : (position.applicantDetails ? 0 : '-');
    const days = position.applicantDetails && position.applicantDetails.days !== undefined ? position.applicantDetails.days : '-';
    
    // Check if this nested row can also expand
    const locationHierarchy = {
        'zone': 'state', 'state': 'division', 'division': 'district',
        'district': 'tehsil', 'tehsil': 'pincode', 'pincode': 'village'
    };
    
    let currentLevel = null;
    let hasChildren = false;
    
    if (position.location) {
        if (position.location.pincode && !position.location.village) {
            currentLevel = 'pincode'; hasChildren = true;
        } else if (position.location.tehsil && !position.location.pincode) {
            currentLevel = 'tehsil'; hasChildren = true;
        } else if (position.location.district && !position.location.tehsil) {
            currentLevel = 'district'; hasChildren = true;
        } else if (position.location.division && !position.location.district) {
            currentLevel = 'division'; hasChildren = true;
        } else if (position.location.state && !position.location.division) {
            currentLevel = 'state'; hasChildren = true;
        }
    }
    
    // Actions or Expand button
    let othersCell = '';
    if (hasChildren && position.applicantDetails && (position.status === 'Approved' || position.status === 'Verified')) {
        const phone = position.applicantDetails.phone || '';
        const name = position.applicantDetails.name || '';
        const photo = position.applicantDetails.photo || '';
        const locationJson = JSON.stringify(position.location).replace(/"/g, '&quot;');
        
        othersCell = `
            <div class="d-flex gap-2 align-items-center">
                <button class="btn btn-sm btn-info" onclick="toggleChildLocations('${position._id}', '${currentLevel}', ${locationJson}); return false;" 
                        id="expandBtn_${position._id}" title="See ${locationHierarchy[currentLevel]}s"
                        style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">
                    <i class="fas fa-chevron-down me-1" id="expandIcon_${position._id}" style="font-size: 0.7rem;"></i>See 1 more level
                </button>
                <div class="dropdown">
                    <button class="btn btn-sm btn-outline-primary dropdown-toggle" type="button" id="actionMenu${position._id}" data-bs-toggle="dropdown">
                        Actions ▼
                    </button>
                    <ul class="dropdown-menu" aria-labelledby="actionMenu${position._id}">
                        <li><a class="dropdown-item" href="#" onclick="showLoginCredentials('${phone}', '${name}'); return false;"><i class="fas fa-key me-2"></i>Login Credentials</a></li>
                        <li><a class="dropdown-item" href="#" onclick="showReferralCode('${position._id}', '${phone}'); return false;"><i class="fas fa-users me-2"></i>Referral Code</a></li>
                        <li><a class="dropdown-item" href="#" onclick="showIDCard('${name}', '${phone}', '${photo}', ${locationJson}); return false;"><i class="fas fa-id-card me-2"></i>ID Card</a></li>
                        <li><a class="dropdown-item" href="#" onclick="openPromotion('${position._id}', '${name}', '${phone}', '${photo}', ${locationJson}, '${position.designation || ''}'); return false;"><i class="fas fa-bullhorn me-2"></i>Promotion</a></li>
                    </ul>
                </div>
            </div>
        `;
    } else if (position.applicantDetails && (position.status === 'Approved' || position.status === 'Verified')) {
        const phone = position.applicantDetails.phone || '';
        const name = position.applicantDetails.name || '';
        const photo = position.applicantDetails.photo || '';
        
        othersCell = `
            <div class="dropdown">
                <button class="btn btn-sm btn-outline-primary dropdown-toggle" type="button" id="actionMenu${position._id}" data-bs-toggle="dropdown">
                    Actions ▼
                </button>
                <ul class="dropdown-menu" aria-labelledby="actionMenu${position._id}">
                    <li><a class="dropdown-item" href="#" onclick="showLoginCredentials('${phone}', '${name}'); return false;"><i class="fas fa-key me-2"></i>Login Credentials</a></li>
                    <li><a class="dropdown-item" href="#" onclick="showReferralCode('${position._id}', '${phone}'); return false;"><i class="fas fa-users me-2"></i>Referral Code</a></li>
                    <li><a class="dropdown-item" href="#" onclick="showIDCard('${name}', '${phone}', '${photo}', ${JSON.stringify(position.location).replace(/"/g, '&quot;')}); return false;"><i class="fas fa-id-card me-2"></i>ID Card</a></li>
                    <li><a class="dropdown-item" href="#" onclick="openPromotion('${position._id}', '${name}', '${phone}', '${photo}', ${JSON.stringify(position.location).replace(/"/g, '&quot;')}, '${position.designation || ''}'); return false;"><i class="fas fa-bullhorn me-2"></i>Promotion</a></li>
                </ul>
            </div>
        `;
    } else if (position.status === 'Available') {
        othersCell = '<span class="text-muted small">-</span>';
    } else {
        othersCell = '<button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" disabled title="Available after admin approval">Actions ▼</button>';
    }
    
    // Indent indicator based on nest level
    const indentIndicator = '→ '.repeat(nestLevel);
    
    row.innerHTML = `
        <td style="padding-left: ${indentPx}px;"><span class="text-muted">${indentIndicator}</span>${subIndex}</td>
        <td>${idCell}</td>
        <td>${nameCell}</td>
        <td>${areaHeadFor}</td>
        <td class="text-center">${photoCell}</td>
        <td>${phoneNo}</td>
        <td>${introducedBy}</td>
        <td><strong>${days}</strong></td>
        <td><span class="badge ${statusClass}">${statusText}</span></td>
        <td>${othersCell}</td>
    `;
    
    return row;
}

// Copy position ID to clipboard
function copyPositionId(positionId) {
    const element = document.getElementById(`posId_${positionId}`);
    if (element) {
        // Create a range and select the text
        const range = document.createRange();
        range.selectNode(element);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);

        // Copy to clipboard
        try {
            document.execCommand('copy');
            // Show success feedback
            alert(`Position ID copied: ${positionId}`);
        } catch (err) {
            // Fallback: show the ID in a prompt for manual copy
            prompt('Copy this Position ID:', positionId);
        }

        // Deselect
        window.getSelection().removeAllRanges();
    }
}

// Get status class for badge styling
function getStatusClass(status) {
    const statusClasses = {
        'Available': 'bg-success',
        'Pending': 'bg-warning text-dark',
        'Pending Admin Review': 'bg-warning text-dark',
        'Approved': 'bg-info',
        'Verified': 'bg-success',
        'Rejected': 'bg-danger',
        'Occupied': 'bg-secondary'
    };
    return statusClasses[status] || 'bg-secondary';
}

// Format location for display
function formatLocation(location) {
    const parts = [];
    if (location.village) parts.push(location.village);
    if (location.pincode) parts.push(location.pincode);
    if (location.tehsil) parts.push(location.tehsil);
    if (location.district) parts.push(location.district);
    if (location.division) parts.push(location.division);
    if (location.state) parts.push(location.state);
    if (location.zone) parts.push(location.zone);
    if (location.country) parts.push(location.country);

    return parts.length > 0 ? parts.join(', ') : 'India';
}

// Calculate days since application
function calculateDays(appliedDate) {
    if (!appliedDate) return 0;
    const now = new Date();
    const applied = new Date(appliedDate);
    const diffTime = Math.abs(now - applied);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

// Handle search functionality
async function handleSearch() {
    const searchName = document.getElementById('searchName').value.toLowerCase().trim();
    const searchPhone = document.getElementById('searchPhone').value.trim();
    const country = document.getElementById('filterCountry').value || 'India';
    const zone = document.getElementById('filterZone').value;
    const state = document.getElementById('filterState').value;
    const division = document.getElementById('filterDivision').value;
    const district = document.getElementById('filterDistrict').value;
    const tehsil = document.getElementById('filterTehsil').value;
    const pincode = document.getElementById('filterPincode').value;
    const village = document.getElementById('filterVillage').value;

    console.log('🔍 Search called with:', {
        searchName,
        searchPhone,
        zone,
        state,
        division,
        district
    });

    try {
        showLoading(true);

        // Build query params for dynamic-positions endpoint (same as loadApplications)
        const params = new URLSearchParams({ country });
        if (zone) params.append('zone', zone);
        if (state) params.append('state', state);
        if (division) params.append('division', division);
        if (district) params.append('district', district);
        if (tehsil) params.append('tehsil', tehsil);
        if (pincode) params.append('pincode', pincode);
        if (village) params.append('village', village);
        params.append('_t', Date.now()); // Cache-busting

        const url = `${API_BASE_URL}/dynamic-positions?${params.toString()}`;
        console.log('🌐 FRONTEND: Fetching positions from:', url);
        const response = await fetch(url, {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const positions = data.positions || data || [];
        
        currentPositions = positions;
        console.log('📥 FRONTEND: Received', currentPositions.length, 'positions');
        
        // Log positions with applicants
        const withApplicants = currentPositions.filter(p => p.applicantDetails);
        console.log('👥 FRONTEND: Positions with applicants:', withApplicants.length);
        if (withApplicants.length > 0) {
            withApplicants.slice(0, 5).forEach(p => {
                console.log(`   - ${p.applicantDetails?.name || 'N/A'} (${p.applicantDetails?.phone || 'N/A'})`);
            });
        }

        // Client-side filter for name and phone
        let filteredPositions = currentPositions;
        if (searchName || searchPhone) {
            console.log('🔎 Applying client-side search filters...');
            console.log(`   Search term: "${searchName}" (name) or "${searchPhone}" (phone)`);
            
            filteredPositions = currentPositions.filter(position => {
                // Name search - check applicant name OR location names (zone, state, division, district, etc.)
                if (searchName) {
                    let nameMatches = false;
                    
                    // Check applicant name
                    if (position.applicantDetails && position.applicantDetails.name) {
                        const positionName = (position.applicantDetails.name || '').toLowerCase();
                        nameMatches = positionName.includes(searchName);
                    }
                    
                    // Check location fields if applicant name doesn't match
                    if (!nameMatches) {
                        const locationFields = [
                            position.zone,
                            position.state,
                            position.division,
                            position.district,
                            position.tehsil,
                            position.pincode,
                            position.village
                        ].filter(Boolean).map(val => (val || '').toLowerCase());
                        
                        nameMatches = locationFields.some(field => field.includes(searchName));
                    }
                    
                    if (!nameMatches) {
                        return false;
                    }
                }

                // Phone search - only check if position has applicant
                if (searchPhone) {
                    if (!position.applicantDetails) {
                        return false; // Can't search by phone if no applicant
                    }
                    
                    const positionPhone = position.applicantDetails.phone || '';
                    const matches = positionPhone.includes(searchPhone);
                    
                    if (!matches) {
                        return false;
                    }
                }

                return true;
            });
            console.log(`✅ Search filtered: ${filteredPositions.length} of ${currentPositions.length} positions match`);
        }

        displayPositions(filteredPositions);

        // Show search results count
        if (searchName || searchPhone) {
            showNotification(`Found ${filteredPositions.length} matching position(s)`, 'info');
        } else {
            showNotification(`Loaded ${filteredPositions.length} position(s)`, 'info');
        }
    } catch (error) {
        console.error('❌ Error searching positions:', error);
        showNotification('Error searching positions: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Clear all filters
// Refresh positions data - force reload from backend
async function refreshPositionsData() {
    try {
        const refreshBtn = document.getElementById('refreshBtn');
        const icon = refreshBtn.querySelector('i');
        
        // Show spinning animation
        icon.classList.add('fa-spin');
        refreshBtn.disabled = true;
        
        // Force reload location data (clear cache)
        locationDataLoaded = false;
        await loadLocationData();
        
        // Reload current positions
        await loadApplications();
        
        showNotification('✅ Data refreshed successfully!', 'success');
        
        // Stop spinning after delay
        setTimeout(() => {
            icon.classList.remove('fa-spin');
            refreshBtn.disabled = false;
        }, 1000);
    } catch (error) {
        console.error('❌ Error refreshing data:', error);
        showNotification('Error refreshing data: ' + error.message, 'error');
        
        const refreshBtn = document.getElementById('refreshBtn');
        const icon = refreshBtn.querySelector('i');
        icon.classList.remove('fa-spin');
        refreshBtn.disabled = false;
    }
}

function clearFilters() {
    // Clear search inputs
    document.getElementById('searchName').value = '';
    document.getElementById('searchPhone').value = '';

    // Clear all location filters
    const filters = ['filterZone', 'filterState', 'filterDivision', 'filterDistrict', 'filterTehsil', 'filterPincode', 'filterVillage'];
    filters.forEach(filterId => {
        const input = document.getElementById(filterId);
        const clearBtn = document.getElementById(filterId.replace('filter', 'clear'));

        if (input) {
            input.value = '';
            input.classList.remove('has-value');
        }

        if (clearBtn) {
            clearBtn.style.display = 'none';
        }
    });

    // Hide all dropdowns
    const dropdowns = ['zoneDropdown', 'stateDropdown', 'divisionDropdown', 'districtDropdown', 'tehsilDropdown', 'pincodeDropdown', 'villageDropdown'];
    dropdowns.forEach(dropdownId => {
        hideFilterDropdown(dropdownId);
    });

    // Remove active classes from all filter containers
    document.querySelectorAll('.filter-container.active').forEach(container => {
        container.classList.remove('active');
    });

    // Update selected filters display
    updateSelectedFiltersBadges();

    // Reload applications with default India filter
    loadApplications();
    showNotification('Filters cleared', 'info');
}

// Open application modal for applying to positions .
function openApplicationModal(positionId, positionTitle, location) {
    console.log('🎯 Opening application modal for position ID:', positionId, 'Title:', positionTitle);

    // Determine position level from location (most specific level available)
    let positionLevel = 'India';
    if (location.village) positionLevel = 'Village';
    else if (location.pincode) positionLevel = 'Pincode';
    else if (location.tehsil) positionLevel = 'Tehsil';
    else if (location.district) positionLevel = 'District';
    else if (location.division) positionLevel = 'Division';
    else if (location.state) positionLevel = 'State';
    else if (location.zone) positionLevel = 'Zone';

    // Store current position details for form submission
    window.currentPosition = {
        id: positionId, // This is the unique position ID from dynamic-positions
        title: positionTitle,
        location: location,
        level: positionLevel
    };

    // Update modal title
    document.querySelector('#applicationModal .modal-title').textContent = `Apply for: ${positionTitle}`;

    // Reset and show the application form
    document.getElementById('applicationForm').reset();

    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('applicationModal'));
    modal.show();
}

// Global variable to store application form data temporarily
let tempApplicationData = null;
let selectedPaymentTier = null;

// Default pricing tiers based on position level (will be fetched from API)
let DEFAULT_PRICING_TIERS = {
    'India': [{ pay: 90000, profit: 510000, credit: 600000 }],
    'Zone': [{ pay: 90000, profit: 510000, credit: 600000 }],
    'State': [{ pay: 90000, profit: 510000, credit: 600000 }],
    'Division': [
        { pay: 90000, profit: 510000, credit: 600000 },
        { pay: 75000, profit: 425000, credit: 500000 }
    ],
    'District': [
        { pay: 90000, profit: 510000, credit: 600000 },
        { pay: 75000, profit: 425000, credit: 500000 },
        { pay: 60000, profit: 340000, credit: 400000 }
    ],
    'Tehsil': [
        { pay: 90000, profit: 510000, credit: 600000 },
        { pay: 75000, profit: 425000, credit: 500000 },
        { pay: 60000, profit: 340000, credit: 400000 },
        { pay: 45000, profit: 255000, credit: 300000 }
    ],
    'Pincode': [
        { pay: 90000, profit: 510000, credit: 600000 },
        { pay: 75000, profit: 425000, credit: 500000 },
        { pay: 60000, profit: 340000, credit: 400000 },
        { pay: 45000, profit: 255000, credit: 300000 },
        { pay: 30000, profit: 170000, credit: 200000 }
    ],
    'Village': [
        { pay: 90000, profit: 510000, credit: 600000 },
        { pay: 75000, profit: 425000, credit: 500000 },
        { pay: 60000, profit: 340000, credit: 400000 },
        { pay: 45000, profit: 255000, credit: 300000 },
        { pay: 30000, profit: 170000, credit: 200000 },
        { pay: 15000, profit: 85000, credit: 100000 }
    ]
};

// Fetch payment plans from API on page load
async function fetchPaymentPlans() {
    try {
        console.log('💰 Fetching payment plans from API...');
        const response = await fetch(`${API_BASE_URL}/admin/payment-plans`);
        if (response.ok) {
            const data = await response.json();
            if (data.paymentPlans) {
                DEFAULT_PRICING_TIERS = data.paymentPlans;
                console.log('✅ Payment plans loaded from API:', DEFAULT_PRICING_TIERS);
                console.log('📊 Available position levels:', Object.keys(DEFAULT_PRICING_TIERS));
            }
        } else {
            console.log('⚠️ API response not OK, using default payment plans');
        }
    } catch (error) {
        console.log('⚠️ Error fetching payment plans, using default:', error);
    }
}

// Load payment plans when page loads
document.addEventListener('DOMContentLoaded', () => {
    fetchPaymentPlans();
});

// Submit application - Step 1: Validate form and show payment plans
async function submitApplication(event) {
    // Prevent default form submission
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const form = document.getElementById('applicationForm');
    const submitBtn = document.getElementById('submitApplication');

    // Check if position information is available
    if (!window.currentPosition) {
        showNotification('Position information not found. Please try again.', 'error');
        return;
    }

    // Get form fields
    const name = document.getElementById('applicantName').value.trim();
    const phone = document.getElementById('applicantPhone').value.trim();
    const photoInput = document.getElementById('applicantPhoto');
    
    // Validate name
    if (!name) {
        showNotification('Please enter your full name', 'error');
        document.getElementById('applicantName').focus();
        return;
    }
    
    if (name.length < 3) {
        showNotification('Name must be at least 3 characters long', 'error');
        document.getElementById('applicantName').focus();
        return;
    }
    
    // Validate phone number
    if (!phone) {
        showNotification('Please enter your phone number', 'error');
        document.getElementById('applicantPhone').focus();
        return;
    }
    
    if (!/^\d{10}$/.test(phone)) {
        showNotification('Phone number must be exactly 10 digits', 'error');
        document.getElementById('applicantPhone').focus();
        return;
    }
    
    // Validate photo file if uploaded
    if (photoInput.files.length > 0) {
        const photoFile = photoInput.files[0];
        const isImage = photoFile.type.startsWith('image/');
        const isPDF = photoFile.type === 'application/pdf';
        
        if (!isImage && !isPDF) {
            showNotification('Photo must be an image file (JPG, PNG) or PDF', 'error');
            photoInput.value = '';
            photoInput.focus();
            return;
        }
        
        // Check file size (max 5MB)
        if (photoFile.size > 5 * 1024 * 1024) {
            showNotification('Photo file size must be less than 5MB', 'error');
            photoInput.value = '';
            photoInput.focus();
            return;
        }
    }

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Loading...';

        // Store form data temporarily
        const formData = new FormData(form);
        tempApplicationData = {
            positionId: window.currentPosition.id,
            name: name,
            phone: phone,
            companyName: formData.get('companyName'),
            businessName: formData.get('businessName'),
            address: formData.get('address'),
            introducedBy: formData.get('introducedBy'),
            photo: photoInput.files[0],
            location: window.currentPosition.location,
            positionLevel: window.currentPosition.level
        };

        // Close application modal
        const applicationModal = bootstrap.Modal.getInstance(document.getElementById('applicationModal'));
        applicationModal.hide();

        // Show payment plans modal
        await showPaymentPlansModal();

    } catch (error) {
        console.error('❌ Error:', error);
        showNotification(error.message || 'Error processing application', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Next: Select Payment Plan';
    }
}

// Show payment plans modal
async function showPaymentPlansModal() {
    const modal = new bootstrap.Modal(document.getElementById('paymentPlansModal'));
    const subtitle = document.getElementById('paymentModalSubtitle');
    const container = document.getElementById('paymentTiersContainer');
    const customNotice = document.getElementById('customPricingNotice');
    
    // Get position level for pricing
    const positionLevel = tempApplicationData.positionLevel;
    
    console.log('🔍 Position level:', positionLevel);
    console.log('🔍 Available plans for this level:', DEFAULT_PRICING_TIERS[positionLevel]);
    
    // Update subtitle
    subtitle.textContent = `Payment plans for ${positionLevel} Head position`;
    
    // Fetch custom pricing if admin has set it
    let pricingTiers = DEFAULT_PRICING_TIERS[positionLevel] || [];
    let isCustomPricing = false;
    
    // Try to fetch custom pricing from backend
    try {
        const response = await fetch(`${API_BASE_URL}/positions/${tempApplicationData.positionId}/custom-pricing`);
        if (response.ok) {
            const data = await response.json();
            if (data.customPricing && data.customPricing.enabled && data.customPricing.tiers.length > 0) {
                pricingTiers = data.customPricing.tiers;
                isCustomPricing = true;
                console.log('✅ Using custom pricing for this position:', pricingTiers);
            } else {
                console.log('ℹ️ No custom pricing set, using default pricing');
            }
        }
    } catch (error) {
        console.log('⚠️ Error fetching custom pricing, using default:', error.message);
    }
    
    // Filter pricing tiers based on visibleFor field
    // Only show tiers that are marked as visible for this position level
    if (!isCustomPricing) {
        pricingTiers = pricingTiers.filter(tier => {
            // If tier has visibleFor array, check if current position is included
            if (tier.visibleFor && Array.isArray(tier.visibleFor)) {
                return tier.visibleFor.includes(positionLevel);
            }
            // If no visibleFor specified, show it (backward compatibility)
            return true;
        });
        console.log(`✅ Filtered ${pricingTiers.length} plans visible for ${positionLevel}`);
    }
    
    // Show/hide custom pricing notice
    if (isCustomPricing) {
        customNotice.classList.remove('d-none');
    } else {
        customNotice.classList.add('d-none');
    }
    
    // Render pricing tiers
    container.innerHTML = '';
    pricingTiers.forEach((tier, index) => {
        // Mark ₹90K plan as recommended (tier.pay === 90000)
        const isRecommended = tier.pay === 90000;
        const tierCard = createPaymentTierCard(tier, index, isRecommended);
        container.appendChild(tierCard);
    });
    
    // Reset selected tier
    selectedPaymentTier = null;
    document.getElementById('proceedToPayment').disabled = true;
    
    modal.show();
}

// Create payment tier card element
function createPaymentTierCard(tier, index, isRecommended) {
    const col = document.createElement('div');
    col.className = 'col-6 col-md-6 col-lg-4';
    
    col.innerHTML = `
        <div class="card payment-tier-card h-100" onclick="selectPaymentTier(${index}, ${tier.pay}, ${tier.profit}, ${tier.credit})">
            <div class="selected-check">
                <i class="fas fa-check"></i>
            </div>
            ${isRecommended ? '<div class="tier-badge recommended">RECOMMENDED</div>' : ''}
            <div class="card-body">
                <div class="text-center mb-2">
                    <div class="payment-amount-label">Investment Amount</div>
                    <div class="payment-amount">₹${(tier.pay / 1000).toFixed(0)}K</div>
                    <small class="text-muted" style="font-size: 0.6rem;">One-time payment</small>
                </div>
                
                <div class="benefits-section">
                    <div class="benefit-item">
                        <div class="benefit-icon profit">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div class="benefit-text">
                            <div class="benefit-label">Commission (75%)</div>
                            <div class="benefit-value">₹${(tier.profit / 1000).toFixed(0)}K</div>
                        </div>
                    </div>
                    
                    <div class="benefit-item">
                        <div class="benefit-icon credit">
                            <i class="fas fa-ad"></i>
                        </div>
                        <div class="benefit-text">
                            <div class="benefit-label">Ad Credits (100%)</div>
                            <div class="benefit-value">₹${(tier.credit / 1000).toFixed(0)}K</div>
                        </div>
                    </div>
                </div>
                
                <div class="mt-1 text-center">
                    <small class="text-muted" style="font-size: 0.6rem;">
                        <i class="fas fa-info-circle me-1"></i>
                        After approval
                    </small>
                </div>
            </div>
        </div>
    `;
    
    return col;
}

// Select payment tier
function selectPaymentTier(index, pay, profit, credit) {
    // Remove selected class from all cards
    document.querySelectorAll('.payment-tier-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add selected class to clicked card
    event.currentTarget.classList.add('selected');
    
    // Store selected tier
    selectedPaymentTier = { index, pay, profit, credit };
    
    // Enable proceed button
    document.getElementById('proceedToPayment').disabled = false;
    
    // Update button text with amount
    document.getElementById('proceedToPayment').innerHTML = `
        <i class="fas fa-lock me-2"></i>Pay ₹${(pay / 1000).toFixed(0)}K
    `;
}

// Back to application form
function backToApplicationForm() {
    const paymentModal = bootstrap.Modal.getInstance(document.getElementById('paymentPlansModal'));
    paymentModal.hide();
    
    const applicationModal = new bootstrap.Modal(document.getElementById('applicationModal'));
    applicationModal.show();
    
    // Re-enable submit button
    const submitBtn = document.getElementById('submitApplication');
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Next: Select Payment Plan';
}

// Proceed to manual payment with scanner
document.addEventListener('DOMContentLoaded', function() {
    const proceedBtn = document.getElementById('proceedToPayment');
    if (proceedBtn) {
        proceedBtn.addEventListener('click', showPaymentScanner);
    }
    
    // Setup screenshot upload handler
    const screenshotInput = document.getElementById('paymentScreenshot');
    if (screenshotInput) {
        screenshotInput.addEventListener('change', handleScreenshotSelect);
    }
    
    // Setup submit button
    const submitBtn = document.getElementById('submitPaymentScreenshot');
    if (submitBtn) {
        submitBtn.addEventListener('click', submitApplicationWithScreenshot);
    }
});

// Show payment scanner modal
function showPaymentScanner() {
    if (!selectedPaymentTier || !tempApplicationData) {
        showNotification('Please select a payment plan', 'error');
        return;
    }
    
    // Hide payment plans modal
    const paymentPlansModal = bootstrap.Modal.getInstance(document.getElementById('paymentPlansModal'));
    if (paymentPlansModal) {
        paymentPlansModal.hide();
    }
    
    // Show scanner modal
    const scannerModal = new bootstrap.Modal(document.getElementById('paymentScannerModal'));
    scannerModal.show();
    
    // Update payment amount display
    const amountDisplay = document.getElementById('paymentAmountDisplay');
    if (amountDisplay) {
        amountDisplay.textContent = `₹${selectedPaymentTier.pay.toLocaleString('en-IN')}`;
    }
    
    // Reset screenshot input and preview
    const screenshotInput = document.getElementById('paymentScreenshot');
    const screenshotPreview = document.getElementById('screenshotPreview');
    const submitBtn = document.getElementById('submitPaymentScreenshot');
    
    if (screenshotInput) screenshotInput.value = '';
    if (screenshotPreview) screenshotPreview.classList.add('d-none');
    if (submitBtn) submitBtn.disabled = false; // Enable by default since screenshot is optional
}

// Handle screenshot file selection
function handleScreenshotSelect(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('screenshotPreview');
    const previewImage = document.getElementById('previewImage');
    const pdfPreview = document.getElementById('pdfPreview');
    const pdfFileName = document.getElementById('pdfFileName');
    const submitBtn = document.getElementById('submitPaymentScreenshot');
    
    if (file) {
        // Validate file type (accept images and PDFs)
        const isImage = file.type.startsWith('image/');
        const isPDF = file.type === 'application/pdf';
        
        if (!isImage && !isPDF) {
            showNotification('Please upload an image file (JPG, PNG) or PDF', 'error');
            event.target.value = '';
            return;
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showNotification('File size must be less than 5MB', 'error');
            event.target.value = '';
            return;
        }
        
        // Show appropriate preview
        if (isImage) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImage.src = e.target.result;
                previewImage.classList.remove('d-none');
                if (pdfPreview) pdfPreview.classList.add('d-none');
                preview.classList.remove('d-none');
                submitBtn.disabled = false;
            };
            reader.readAsDataURL(file);
        } else if (isPDF) {
            // Show PDF preview
            previewImage.classList.add('d-none');
            if (pdfPreview) {
                pdfPreview.classList.remove('d-none');
                if (pdfFileName) pdfFileName.textContent = file.name;
            }
            preview.classList.remove('d-none');
            submitBtn.disabled = false;
        }
    } else {
        // No file selected - hide preview but keep button enabled (screenshot is optional)
        preview.classList.add('d-none');
    }
}

// Cancel payment and go back
function cancelPayment() {
    const scannerModal = bootstrap.Modal.getInstance(document.getElementById('paymentScannerModal'));
    if (scannerModal) {
        scannerModal.hide();
    }
    
    // Show payment plans modal again
    const paymentPlansModal = new bootstrap.Modal(document.getElementById('paymentPlansModal'));
    paymentPlansModal.show();
}

// Submit application with payment screenshot
async function submitApplicationWithScreenshot() {
    const screenshotInput = document.getElementById('paymentScreenshot');
    const submitBtn = document.getElementById('submitPaymentScreenshot');
    
    // Validate screenshot if provided
    if (screenshotInput.files[0]) {
        const file = screenshotInput.files[0];
        const isImage = file.type.startsWith('image/');
        const isPDF = file.type === 'application/pdf';
        
        if (!isImage && !isPDF) {
            showNotification('Payment screenshot must be an image (JPG, PNG) or PDF', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            showNotification('File size must be less than 5MB', 'error');
            return;
        }
    }
    
    try {
        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Submitting...';
        
        // Prepare application data with payment screenshot
        const formData = new FormData();
        formData.append('positionId', tempApplicationData.positionId);
        formData.append('name', tempApplicationData.name);
        formData.append('phone', tempApplicationData.phone);
        formData.append('companyName', tempApplicationData.companyName || '');
        formData.append('businessName', tempApplicationData.businessName || '');
        formData.append('address', tempApplicationData.address || '');
        formData.append('introducedBy', tempApplicationData.introducedBy || 'Self');
        
        if (tempApplicationData.photo) {
            formData.append('photo', tempApplicationData.photo);
        }
        
        // Add location data
        const location = tempApplicationData.location;
        if (location.country) formData.append('country', location.country);
        if (location.zone) formData.append('zone', location.zone);
        if (location.state) formData.append('state', location.state);
        if (location.division) formData.append('division', location.division);
        if (location.district) formData.append('district', location.district);
        if (location.tehsil) formData.append('tehsil', location.tehsil);
        if (location.pincode) formData.append('pincode', location.pincode);
        if (location.village) formData.append('village', location.village);
        
        // Add payment information
        formData.append('paymentAmount', selectedPaymentTier.pay);
        formData.append('paymentProfit', selectedPaymentTier.profit);
        formData.append('paymentCredit', selectedPaymentTier.credit);
        
        // Add payment screenshot only if uploaded (optional)
        if (screenshotInput.files[0]) {
            formData.append('paymentScreenshot', screenshotInput.files[0]);
            formData.append('paymentStatus', 'pending'); // Mark as pending verification
        } else {
            formData.append('paymentStatus', 'pending'); // Mark as pending even without screenshot
        }
        
        // Submit application with payment screenshot
        const response = await fetch(`${API_BASE_URL}/applications/with-payment`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Close all modals
            const scannerModal = bootstrap.Modal.getInstance(document.getElementById('paymentScannerModal'));
            if (scannerModal) scannerModal.hide();
            
            const paymentModal = bootstrap.Modal.getInstance(document.getElementById('paymentPlansModal'));
            if (paymentModal) paymentModal.hide();
            
            // Clear temp data
            tempApplicationData = null;
            selectedPaymentTier = null;
            
            // Show success message
            showNotification('✅ Application submitted successfully! Your payment will be verified by admin.', 'success');
            
            // Reload page after delay
            setTimeout(() => {
                window.location.reload(true);
            }, 2000);
        } else {
            throw new Error(result.error || 'Application submission failed');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        showNotification(error.message || 'Failed to submit application', 'error');
        
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-check me-1"></i>Submit Application';
    }
}



// Setup rating stars
function setupRatingStars() {
    const ratingStarsContainer = document.querySelector('.rating-stars');
    if (!ratingStarsContainer) {
        console.log('ℹ️ Rating stars not found on this page');
        return;
    }

    const stars = document.querySelectorAll('.star');
    const ratingInput = document.getElementById('feedbackRating');

    if (!ratingInput || stars.length === 0) {
        console.log('ℹ️ Rating elements not found');
        return;
    }

    stars.forEach((star, index) => {
        star.addEventListener('click', function () {
            const rating = this.getAttribute('data-rating');
            ratingInput.value = rating;

            // Update star display
            stars.forEach((s, i) => {
                if (i < rating) {
                    s.innerHTML = '<i class="fas fa-star"></i>';
                    s.classList.add('active');
                } else {
                    s.innerHTML = '<i class="far fa-star"></i>';
                    s.classList.remove('active');
                }
            });
        });

        star.addEventListener('mouseover', function () {
            const rating = this.getAttribute('data-rating');
            stars.forEach((s, i) => {
                if (i < rating) {
                    s.innerHTML = '<i class="fas fa-star"></i>';
                } else {
                    s.innerHTML = '<i class="far fa-star"></i>';
                }
            });
        });
    });

    // Reset on mouse leave
    if (ratingStarsContainer) {
        ratingStarsContainer.addEventListener('mouseleave', function () {
            const currentRating = ratingInput.value;
            stars.forEach((s, i) => {
                if (i < currentRating) {
                    s.innerHTML = '<i class="fas fa-star"></i>';
                    s.classList.add('active');
                } else {
                    s.innerHTML = '<i class="far fa-star"></i>';
                    s.classList.remove('active');
                }
            });
        });
    }
}

// Submit feedback
function submitFeedback(e) {
    e.preventDefault();

    const name = document.getElementById('feedbackName').value;
    const email = document.getElementById('feedbackEmail').value;
    const rating = document.getElementById('feedbackRating').value;
    const message = document.getElementById('feedbackMessage').value;

    if (rating === '0') {
        showNotification('Please select a rating', 'warning');
        return;
    }

    // Here you would typically send the feedback to your server
    console.log('Feedback submitted:', { name, email, rating, message });

    showNotification('Thank you for your feedback!', 'success');
    document.getElementById('feedbackForm').reset();

    // Reset stars
    document.querySelectorAll('.star').forEach(star => {
        star.innerHTML = '<i class="far fa-star"></i>';
        star.classList.remove('active');
    });
    document.getElementById('feedbackRating').value = '0';
}

// Edit Profile Function - Redirect to profile page with login
function editProfile(positionId) {
    // Check if user is logged in
    if (!authToken) {
        // Redirect to profile page which will handle login
        window.location.href = 'profile.html';
        return;
    }

    // User is logged in, go to profile page
    window.location.href = 'profile.html';
}

// Show change password form
function showChangePasswordForm() {
    const formHTML = `
        <div class="card mt-3">
            <div class="card-body">
                <h6 class="card-title">Change Password</h6>
                <form id="changePasswordForm">
                    <div class="mb-3">
                        <label class="form-label">Current Password</label>
                        <input type="password" class="form-control" id="currentPassword" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">New Password</label>
                        <input type="password" class="form-control" id="newPassword" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Confirm New Password</label>
                        <input type="password" class="form-control" id="confirmPassword" required>
                    </div>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-check me-2"></i>Update Password
                    </button>
                </form>
            </div>
        </div>
    `;

    document.querySelector('#profileModal .modal-body').insertAdjacentHTML('beforeend', formHTML);

    document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            showNotification('Passwords do not match', 'error');
            return;
        }

        // Call API to change password
        showNotification('Password changed successfully!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('profileModal')).hide();
    });
}

// Show forgot password form
function showForgotPasswordForm(phone) {
    const modalHTML = `
        <div class="modal fade" id="forgotPasswordModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-warning">
                        <h5 class="modal-title">
                            <i class="fas fa-lock me-2"></i>Forgot Password
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div id="otpRequestSection">
                            <p>OTP will be sent to: <strong>${phone}</strong></p>
                            <button class="btn btn-primary w-100" onclick="requestOTP('${phone}')">
                                <i class="fas fa-paper-plane me-2"></i>Send OTP
                            </button>
                        </div>
                        <div id="otpVerifySection" style="display: none;">
                            <form id="resetPasswordForm">
                                <div class="mb-3">
                                    <label class="form-label">Enter OTP</label>
                                    <input type="text" class="form-control" id="otpCode" maxlength="6" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">New Password</label>
                                    <input type="password" class="form-control" id="resetNewPassword" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Confirm Password</label>
                                    <input type="password" class="form-control" id="resetConfirmPassword" required>
                                </div>
                                <button type="submit" class="btn btn-primary w-100">
                                    <i class="fas fa-check me-2"></i>Reset Password
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('forgotPasswordModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('forgotPasswordModal'));
    modal.show();
}

// Request OTP via Fast2SMS
async function requestOTP(phone) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/forgot-password/request-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phone })
        });

        const result = await response.json();

        if (response.ok) {
            showNotification('OTP sent to your phone!', 'success');
            document.getElementById('otpRequestSection').style.display = 'none';
            document.getElementById('otpVerifySection').style.display = 'block';
        } else {
            throw new Error(result.error || 'Failed to send OTP');
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Payment functionality (₹10,000 → 60,000 credits)
function showPaymentOptions(positionId) {
    const position = currentPositions.find(p => p._id === positionId);
    if (!position) return;

    const modalHTML = `
        <div class="modal fade" id="paymentModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-credit-card me-2"></i>Payment
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info">
                            <h5 class="mb-3">Committee Position Application</h5>
                            <p class="mb-2"><strong>Position:</strong> ${position.designation}</p>
                            <p class="mb-2"><strong>Payment Required:</strong> ₹10,000</p>
                            <p class="mb-0"><strong>Credits to be Awarded:</strong> 60,000 credits</p>
                        </div>
                        <div class="d-grid">
                            <button class="btn btn-success btn-lg" onclick="processPayment('${positionId}')">
                                <i class="fas fa-check me-2"></i>Pay ₹10,000
                            </button>
                        </div>
                        <div class="mt-3 text-center">
                            <small class="text-muted">
                                <i class="fas fa-shield-alt me-1"></i>
                                Secure payment gateway
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('paymentModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('paymentModal'));
    modal.show();
}

// Process payment
async function processPayment(positionId) {
    try {
        // In production, integrate with payment gateway (Razorpay, Paytm, etc.)
        showNotification('Opening payment gateway...', 'info');

        // Simulate payment success
        setTimeout(async () => {
            const position = currentPositions.find(p => p._id === positionId);
            if (position && position.applicantDetails && position.applicantDetails.userId) {
                const response = await fetch(`${API_BASE_URL}/users/${position.applicantDetails.userId}/add-credits`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ amount: 10000 })
                });

                if (response.ok) {
                    showNotification('Payment successful! 60,000 credits added to your account.', 'success');
                    bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
                    loadApplications(); // Refresh data
                }
            }
        }, 2000);
    } catch (error) {
        showNotification('Payment failed: ' + error.message, 'error');
    }
}

// ============================================
// Authentication Functions
// ============================================

// Open login modal
function openLoginModal() {
    const modal = new bootstrap.Modal(document.getElementById('loginModal'));
    modal.show();
}

// Handle login
async function handleLogin() {
    const phone = document.getElementById('loginPhone').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phone, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Store token
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            currentUser = data.user;

            // Hide error
            errorDiv.classList.add('d-none');

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            modal.hide();

            // Update UI
            updateAuthUI();

            // Show success message
            showNotification('Login successful!', 'success');

            // Show profile if first login
            if (!data.user.hasReceivedInitialCredits) {
                setTimeout(() => {
                    showProfile();
                }, 500);
            }
        } else {
            errorDiv.textContent = data.error || 'Login failed';
            errorDiv.classList.remove('d-none');
        }
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = 'Network error. Please try again.';
        errorDiv.classList.remove('d-none');
    }
}

// Verify token
async function verifyToken() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            updateAuthUI();
        } else {
            // Token invalid, logout
            logout();
        }
    } catch (error) {
        console.error('Token verification error:', error);
        logout();
    }
}

// Update UI based on auth state
function updateAuthUI() {
    const loginNavItem = document.getElementById('loginNavItem');
    const profileNavItem = document.getElementById('profileNavItem');
    const userNameSpan = document.getElementById('userName');
    const userCreditsSpan = document.getElementById('userCredits');

    if (currentUser) {
        // Hide login, show profile
        loginNavItem.classList.add('d-none');
        profileNavItem.classList.remove('d-none');

        // Update user info
        userNameSpan.textContent = currentUser.name;
        userCreditsSpan.textContent = currentUser.credits || 0;
    } else {
        // Show login, hide profile
        loginNavItem.classList.remove('d-none');
        profileNavItem.classList.add('d-none');
    }
}

// Logout
function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    updateAuthUI();
    showNotification('Logged out successfully', 'info');
}

// Show profile
async function showProfile() {
    if (!authToken) {
        openLoginModal();
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const user = data.user;

            // Update profile modal
            document.getElementById('profileName').textContent = user.name;
            document.getElementById('profilePhone').textContent = user.phone;
            document.getElementById('profileEmail').textContent = user.email || 'Not provided';
            document.getElementById('profileCredits').textContent = user.credits || 0;
            document.getElementById('profileIntroducedBy').textContent = user.introducedBy || 'Self';
            document.getElementById('profileIntroducedCount').textContent = user.introducedCount || 0;

            // Set profile photo
            const profilePhoto = document.getElementById('profilePhoto');
            if (user.photo) {
                profilePhoto.src = window.CacheBuster ? window.CacheBuster.addCacheBuster(user.photo) : user.photo;
            } else {
                profilePhoto.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjZTJlOGYwIi8+Cjwvc3ZnPg==';
            }

            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('profileModal'));
            modal.show();

            // Update current user
            currentUser = user;
            updateAuthUI();
        } else {
            showNotification('Failed to load profile', 'error');
        }
    } catch (error) {
        console.error('Profile fetch error:', error);
        showNotification('Network error', 'error');
    }
}

// Show credits (alternative to profile)
function showCredits() {
    showProfile();
}

// Change password
async function changePassword() {
    const currentPassword = prompt('Enter current password:');
    if (!currentPassword) return;

    const newPassword = prompt('Enter new password:');
    if (!newPassword) return;

    const confirmPassword = prompt('Confirm new password:');
    if (newPassword !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });

        if (response.ok) {
            showNotification('Password changed successfully', 'success');

            // Close profile modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('profileModal'));
            if (modal) modal.hide();
        } else {
            const data = await response.json();
            showNotification(data.error || 'Failed to change password', 'error');
        }
    } catch (error) {
        console.error('Password change error:', error);
        showNotification('Network error', 'error');
    }
}

// Show notification (toast-style)
function showNotification(message, type = 'info') {
    // Create toast element
    const toastHtml = `
        <div class="toast align-items-center text-white bg-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;

    // Create container if not exists
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }

    // Add toast
    const toastWrapper = document.createElement('div');
    toastWrapper.innerHTML = toastHtml;
    const toastElement = toastWrapper.firstElementChild;
    toastContainer.appendChild(toastElement);

    // Show toast
    const toast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: 3000
    });
    toast.show();

    // Remove from DOM after hiding
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

// Utility functions
function showLoading(show) {
    const tbody = document.getElementById('positionsTableBody');
    if (show) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2 text-muted">Loading positions...</p>
                </td>
            </tr>
        `;
    }
}

// Setup searchable filters with autocomplete functionality
function setupSearchableFilters() {
    const filters = [
        { id: 'filterZone', dropdown: 'zoneDropdown', clear: 'clearZone', dataKey: 'zones' },
        { id: 'filterState', dropdown: 'stateDropdown', clear: 'clearState', dataKey: 'states' },
        { id: 'filterDivision', dropdown: 'divisionDropdown', clear: 'clearDivision', dataKey: 'divisions' },
        { id: 'filterDistrict', dropdown: 'districtDropdown', clear: 'clearDistrict', dataKey: 'districts' },
        { id: 'filterTehsil', dropdown: 'tehsilDropdown', clear: 'clearTehsil', dataKey: 'tehsils' },
        { id: 'filterPincode', dropdown: 'pincodeDropdown', clear: 'clearPincode', dataKey: 'pincodes' },
        { id: 'filterVillage', dropdown: 'villageDropdown', clear: 'clearVillage', dataKey: 'villages' }
    ];

    filters.forEach(filter => {
        const input = document.getElementById(filter.id);
        const dropdown = document.getElementById(filter.dropdown);
        const clearBtn = document.getElementById(filter.clear);

        if (input && dropdown && clearBtn) {
            // Setup input click to show dropdown (with touch support for mobile)
            input.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showFilterDropdown(filter.id, filter.dropdown, filter.dataKey);
            });

            // Add touch event for mobile devices (primary interaction on mobile)
            input.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showFilterDropdown(filter.id, filter.dropdown, filter.dataKey);
            });

            // Setup hover to show dropdown (desktop only)
            input.addEventListener('mouseenter', () => {
                if (!dropdown.classList.contains('show')) {
                    showFilterDropdown(filter.id, filter.dropdown, filter.dataKey);
                }
            });

            // Setup clear button
            clearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                clearSingleFilter(filter.id, filter.clear);
            });

            // Add touch event for clear button on mobile
            clearBtn.addEventListener('touchend', (e) => {
                e.stopPropagation();
                e.preventDefault();
                clearSingleFilter(filter.id, filter.clear);
            });
        }
    });

    // Add document-level click/touch handlers ONCE (outside loop)
    // Close dropdowns when clicking/touching outside
    document.addEventListener('click', (e) => {
        // Check all dropdowns
        filters.forEach(filter => {
            const input = document.getElementById(filter.id);
            const dropdown = document.getElementById(filter.dropdown);

            if (dropdown && dropdown.classList.contains('show')) {
                const searchInput = dropdown.querySelector('.filter-search-input');
                // Don't close if clicking on the filter input, dropdown, or search input
                if (!input.contains(e.target) && !dropdown.contains(e.target)) {
                    hideFilterDropdown(filter.dropdown);
                }
            }
        });
    });

    document.addEventListener('touchend', (e) => {
        // Check all dropdowns
        filters.forEach(filter => {
            const input = document.getElementById(filter.id);
            const dropdown = document.getElementById(filter.dropdown);

            if (dropdown && dropdown.classList.contains('show')) {
                const searchInput = dropdown.querySelector('.filter-search-input');
                // Don't close if touching the filter input, dropdown, or search input
                if (!input.contains(e.target) && !dropdown.contains(e.target)) {
                    hideFilterDropdown(filter.dropdown);
                }
            }
        });
    }, { passive: true });
}

// Get filtered data based on parent filter selections (CLIENT-SIDE cascading using positions data)
function getFilteredDataBasedOnParents(inputId, dataKey, allData) {
    // Get current filter values from parent filters
    const selectedZone = document.getElementById('filterZone').value;
    const selectedState = document.getElementById('filterState').value;
    const selectedDivision = document.getElementById('filterDivision').value;
    const selectedDistrict = document.getElementById('filterDistrict').value;
    const selectedTehsil = document.getElementById('filterTehsil').value;
    const selectedPincode = document.getElementById('filterPincode').value;

    // If no parent filters selected, return all data
    if (!selectedZone && !selectedState && !selectedDivision && !selectedDistrict && !selectedTehsil && !selectedPincode) {
        console.log(`🔍 No parent filters selected for ${inputId}, showing all ${dataKey}`);
        return allData;
    }

    // If no positions data loaded yet, return all data
    if (!currentPositions || currentPositions.length === 0) {
        console.log('⚠️ No positions loaded yet, showing all options for', dataKey);
        return allData;
    }

    // Filter positions based on parent selections to build hierarchy
    let filteredPositions = currentPositions.filter(position => {
        const loc = position.location;
        if (!loc) return false;

        // Apply cascading filter logic based on which filter we're showing
        if (inputId === 'filterState') {
            // State filter: only show states from selected zone
            return !selectedZone || loc.zone === selectedZone;
        } else if (inputId === 'filterDivision') {
            // Division filter: filter by zone and state
            return (!selectedZone || loc.zone === selectedZone) &&
                (!selectedState || loc.state === selectedState);
        } else if (inputId === 'filterDistrict') {
            // District filter: filter by zone, state, and division
            return (!selectedZone || loc.zone === selectedZone) &&
                (!selectedState || loc.state === selectedState) &&
                (!selectedDivision || loc.division === selectedDivision);
        } else if (inputId === 'filterTehsil') {
            // Tehsil filter: filter by zone, state, division, and district
            return (!selectedZone || loc.zone === selectedZone) &&
                (!selectedState || loc.state === selectedState) &&
                (!selectedDivision || loc.division === selectedDivision) &&
                (!selectedDistrict || loc.district === selectedDistrict);
        } else if (inputId === 'filterPincode') {
            // Pincode filter: filter by all parent filters
            return (!selectedZone || loc.zone === selectedZone) &&
                (!selectedState || loc.state === selectedState) &&
                (!selectedDivision || loc.division === selectedDivision) &&
                (!selectedDistrict || loc.district === selectedDistrict) &&
                (!selectedTehsil || loc.tehsil === selectedTehsil);
        } else if (inputId === 'filterVillage') {
            // Village filter: filter by all parent filters including pincode
            return (!selectedZone || loc.zone === selectedZone) &&
                (!selectedState || loc.state === selectedState) &&
                (!selectedDivision || loc.division === selectedDivision) &&
                (!selectedDistrict || loc.district === selectedDistrict) &&
                (!selectedTehsil || loc.tehsil === selectedTehsil) &&
                (!selectedPincode || loc.pincode === selectedPincode);
        }

        return true; // Zone filter shows all zones
    });

    // Extract unique values for the current filter from filtered positions
    const uniqueValues = new Set();
    const locationFieldMap = {
        'filterZone': 'zone',
        'filterState': 'state',
        'filterDivision': 'division',
        'filterDistrict': 'district',
        'filterTehsil': 'tehsil',
        'filterPincode': 'pincode',
        'filterVillage': 'village'
    };

    const fieldName = locationFieldMap[inputId];
    if (fieldName) {
        filteredPositions.forEach(position => {
            const value = position.location?.[fieldName];
            if (value) {
                uniqueValues.add(value);
            }
        });
    }

    // Convert Set to Array and sort
    const filteredData = Array.from(uniqueValues).sort();

    console.log(`🔍 Cascading filter for ${inputId}: ${filteredData.length} ${dataKey} from ${filteredPositions.length} positions (filtered by parent: ${selectedZone || selectedState || selectedDivision || selectedDistrict || selectedTehsil || selectedPincode})`);

    // Important: If filtering resulted in matches but no unique values for this specific field,
    // that means positions match parents but this field is not populated - return all data as fallback
    if (filteredPositions.length > 0 && filteredData.length === 0) {
        console.log(`  ⚠️ ${filteredPositions.length} positions match but have no ${fieldName} data, showing all options`);
        return allData;
    }

    return filteredData.length > 0 ? filteredData : allData;
}

// Show filter dropdown with search functionality
async function showFilterDropdown(inputId, dropdownId, dataKey) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    const container = input.closest('.filter-container');

    // Wait for location data to load if not yet loaded
    if (!locationDataLoaded) {
        console.log('⏳ Waiting for location data to load...');
        dropdown.innerHTML = '<div class="no-results">Loading...</div>';
        dropdown.classList.add('show');
        container?.classList.add('active');

        // Wait for location data
        await loadLocationData();
    }

    if (!locationData[dataKey] || !Array.isArray(locationData[dataKey]) || locationData[dataKey].length === 0) {
        console.log('⚠️ No data available for', dataKey);
        dropdown.innerHTML = '<div class="no-results">No data available</div>';
        dropdown.classList.add('show');
        container?.classList.add('active');
        return;
    }

    // Close all other dropdowns
    document.querySelectorAll('.filter-dropdown.show').forEach(d => {
        if (d.id !== dropdownId) {
            d.classList.remove('show');
            d.closest('.filter-container')?.classList.remove('active');
        }
    });

    // Add active class to current container
    container?.classList.add('active');

    // Get filtered data based on parent selections (reverse mapping handles cascading)
    let data = getFilteredDataBasedOnParents(inputId, dataKey, locationData[dataKey]);
    console.log(`✅ Showing dropdown for ${dataKey}:`, data.length, 'items');

    // Only create dropdown content if it doesn't exist or data changed
    if (!dropdown.dataset.initialized || dropdown.dataset.dataKey !== dataKey) {
        dropdown.innerHTML = `
            <input type="text" class="filter-search-input" placeholder="Type to search..." id="search_${inputId}" autocomplete="off" inputmode="text">
            <div class="filter-options" id="options_${inputId}"></div>
        `;
        dropdown.dataset.initialized = 'true';
        dropdown.dataset.dataKey = dataKey;
    }

    const searchInput = document.getElementById(`search_${inputId}`);
    const optionsContainer = document.getElementById(`options_${inputId}`);

    // Clear previous search
    searchInput.value = '';

    // Initial display - show first 50 items for performance
    displayFilterOptions(optionsContainer, data.slice(0, 50), data, inputId, dropdownId);

    // Setup search functionality (remove old listeners first)
    const newSearchInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newSearchInput, searchInput);

    // Prevent search input from being affected by parent events
    newSearchInput.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        // Don't prevent default - allow normal touch behavior for input focus
    });

    newSearchInput.addEventListener('touchend', (e) => {
        e.stopPropagation();
        // Allow the input to receive focus
    });

    newSearchInput.addEventListener('focus', (e) => {
        e.stopPropagation();
        // Keep dropdown open when search input is focused
        console.log('Search input focused - keyboard should appear');
    });

    newSearchInput.addEventListener('blur', (e) => {
        // Allow blur but log it
        console.log('Search input blurred');
    });

    newSearchInput.addEventListener('click', (e) => {
        e.stopPropagation();
        // Ensure search input can be clicked and focused
        newSearchInput.focus();
    });

    newSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        if (searchTerm) {
            const filteredData = data.filter(item =>
                item.toLowerCase().includes(searchTerm)
            );
            displayFilterOptions(optionsContainer, filteredData, data, inputId, dropdownId);
        } else {
            // Show first 50 when no search term
            displayFilterOptions(optionsContainer, data.slice(0, 50), data, inputId, dropdownId);
        }
    });

    // Don't auto-focus on mobile - let user tap when they want to search
    // This prevents unwanted keyboard popup

    // Show dropdown (use absolute positioning, not fixed)
    dropdown.classList.add('show');
}

// Display filter options in dropdown
function displayFilterOptions(container, displayData, fullData, inputId, dropdownId) {
    if (displayData.length === 0) {
        container.innerHTML = '<div class="no-results">No results found</div>';
        return;
    }

    // Limit to 100 items for performance
    const limitedData = displayData.slice(0, 100);
    const hasMore = displayData.length > 100;

    container.innerHTML = limitedData.map(item =>
        `<div class="filter-dropdown-item" data-value="${item}">${item}</div>`
    ).join('') + (hasMore ? `<div class="no-results">Showing ${limitedData.length} of ${displayData.length} results. Type to search...</div>` : '');

    // Setup click and touch handlers for options (mobile compatibility)
    container.querySelectorAll('.filter-dropdown-item').forEach(item => {
        let touchStartY = 0;
        let touchStartTime = 0;
        let isTouching = false;

        item.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
            isTouching = true;
        }, { passive: true });

        item.addEventListener('touchmove', (e) => {
            // If moved more than 10px, it's a scroll not a tap
            if (Math.abs(e.touches[0].clientY - touchStartY) > 10) {
                isTouching = false;
            }
        }, { passive: true });

        item.addEventListener('touchend', (e) => {
            const touchDuration = Date.now() - touchStartTime;
            const touchDistance = Math.abs(e.changedTouches[0].clientY - touchStartY);

            // Only select if it was a quick tap (not a scroll)
            // Tap: < 200ms duration and < 10px movement
            if (isTouching && touchDuration < 200 && touchDistance < 10) {
                e.preventDefault();
                selectFilterOption(inputId, dropdownId, item.dataset.value);
            }
            isTouching = false;
        }, { passive: false });

        // Desktop click handler
        item.addEventListener('click', (e) => {
            // Prevent if this was triggered by touch (already handled above)
            if (e.detail === 0) return; // detail === 0 means programmatic click
            selectFilterOption(inputId, dropdownId, item.dataset.value);
        });
    });
}

// Select a filter option
async function selectFilterOption(inputId, dropdownId, value) {
    const input = document.getElementById(inputId);
    const clearBtn = document.getElementById(inputId.replace('filter', 'clear'));

    // Set the input value
    input.value = value;
    input.classList.add('has-value');

    // Show clear button
    if (clearBtn) {
        clearBtn.style.display = 'flex';
    }

    // Hide dropdown
    hideFilterDropdown(dropdownId);

    // Clear child filters when parent filter changes (cascading behavior)
    clearChildFilters(inputId);

    // WAIT for reverse mapping to complete before loading applications
    await performReverseMapping(inputId, value);

    // Update selected filters display
    updateSelectedFiltersBadges();

    // Trigger filter update (now with parent fields populated)
    loadApplications();
}

// Clear child filters when parent filter changes (cascading behavior)
function clearChildFilters(inputId) {
    // Define the filter hierarchy
    const filterHierarchy = [
        'filterZone',
        'filterState',
        'filterDivision',
        'filterDistrict',
        'filterTehsil',
        'filterPincode',
        'filterVillage'
    ];

    // Find the index of the current filter
    const currentIndex = filterHierarchy.indexOf(inputId);

    if (currentIndex === -1) return;

    // Clear all filters that come after this one
    for (let i = currentIndex + 1; i < filterHierarchy.length; i++) {
        const childFilterId = filterHierarchy[i];
        const childInput = document.getElementById(childFilterId);
        const childClearBtn = document.getElementById(childFilterId.replace('filter', 'clear'));

        if (childInput) {
            childInput.value = '';
            childInput.classList.remove('has-value');
        }

        if (childClearBtn) {
            childClearBtn.style.display = 'none';
        }
    }

    console.log(`🧹 Cleared child filters after ${inputId}`);
}

// Perform reverse mapping when a location is selected
async function performReverseMapping(inputId, value) {
    try {
        console.log('🔍 Reverse mapping triggered for:', { inputId, value });

        // Call reverse-lookup API to get full location hierarchy
        const response = await fetch(`${API_BASE_URL}/locations/reverse-lookup/${encodeURIComponent(value)}`);

        console.log('📡 API Response status:', response.status);

        if (response.ok) {
            const locationHierarchy = await response.json();
            console.log('📦 Location hierarchy received:', locationHierarchy);

            // Auto-populate parent fields based on what was selected
            // Mapping: Village → Pincode → Tehsil → District → Division → State → Zone

            if (inputId === 'filterVillage') {
                console.log('🏘️ Populating from Village...');
                // Populate all parent fields
                autoPopulateField('filterPincode', 'clearPincode', locationHierarchy.pincode);
                autoPopulateField('filterTehsil', 'clearTehsil', locationHierarchy.tehsil);
                autoPopulateField('filterDistrict', 'clearDistrict', locationHierarchy.district);
                autoPopulateField('filterDivision', 'clearDivision', locationHierarchy.division);
                autoPopulateField('filterState', 'clearState', locationHierarchy.state);
                autoPopulateField('filterZone', 'clearZone', locationHierarchy.zone);
            }
            else if (inputId === 'filterPincode') {
                console.log('📮 Populating from Pincode...');
                // Populate parent fields (Tehsil, District, Division, State, Zone)
                autoPopulateField('filterTehsil', 'clearTehsil', locationHierarchy.tehsil);
                autoPopulateField('filterDistrict', 'clearDistrict', locationHierarchy.district);
                autoPopulateField('filterDivision', 'clearDivision', locationHierarchy.division);
                autoPopulateField('filterState', 'clearState', locationHierarchy.state);
                autoPopulateField('filterZone', 'clearZone', locationHierarchy.zone);
            }
            else if (inputId === 'filterTehsil') {
                console.log('🏛️ Populating from Tehsil...');
                // Populate parent fields (District, Division, State, Zone)
                autoPopulateField('filterDistrict', 'clearDistrict', locationHierarchy.district);
                autoPopulateField('filterDivision', 'clearDivision', locationHierarchy.division);
                autoPopulateField('filterState', 'clearState', locationHierarchy.state);
                autoPopulateField('filterZone', 'clearZone', locationHierarchy.zone);
            }
            else if (inputId === 'filterDistrict') {
                console.log('🏙️ Populating from District...');
                // Populate parent fields (Division, State, Zone)
                autoPopulateField('filterDivision', 'clearDivision', locationHierarchy.division);
                autoPopulateField('filterState', 'clearState', locationHierarchy.state);
                autoPopulateField('filterZone', 'clearZone', locationHierarchy.zone);
            }
            else if (inputId === 'filterDivision') {
                console.log('📍 Populating from Division...');
                // Populate parent fields (State, Zone)
                autoPopulateField('filterState', 'clearState', locationHierarchy.state);
                autoPopulateField('filterZone', 'clearZone', locationHierarchy.zone);
            }
            else if (inputId === 'filterState') {
                console.log('🗺️ Populating from State...');
                // Populate parent field (Zone)
                autoPopulateField('filterZone', 'clearZone', locationHierarchy.zone);
            }

            // Update selected filters display after auto-population
            updateSelectedFiltersBadges();
        } else {
            console.log('⚠️ Reverse lookup not available for:', value);
        }
    } catch (error) {
        console.error('❌ Error in reverse mapping:', error);
        // Non-critical error, continue without reverse mapping
    }
}

// Helper function to auto-populate a field
function autoPopulateField(inputId, clearBtnId, value) {
    if (!value || value === 'N/A' || value === '') return;

    const input = document.getElementById(inputId);
    const clearBtn = document.getElementById(clearBtnId);

    if (input && input.value === '') { // Only populate if field is empty
        input.value = value;
        input.classList.add('has-value');

        if (clearBtn) {
            clearBtn.style.display = 'flex';
        }

        console.log(`  ✅ Auto-populated ${inputId}: ${value}`);
    }
}

// Update the display of selected filters as colored badges
function updateSelectedFiltersBadges() {
    const container = document.getElementById('selectedFiltersContainer');
    const badgesDiv = document.getElementById('selectedFiltersBadges');

    if (!container || !badgesDiv) return;

    // Filter configuration with colors
    const filterConfig = [
        { id: 'filterCountry', label: 'India', color: '#f0e68c', value: 'India' }, // Light yellow
        { id: 'filterZone', label: 'Zone', color: '#add8e6' }, // Light blue
        { id: 'filterState', label: 'State', color: '#90ee90' }, // Light green
        { id: 'filterDivision', label: 'Div', color: '#dda0dd' }, // Plum
        { id: 'filterDistrict', label: 'District', color: '#ffb6c1' }, // Light pink
        { id: 'filterTehsil', label: 'Tehsil', color: '#ffa07a' }, // Light salmon
        { id: 'filterPincode', label: 'Pincode', color: '#87ceeb' }, // Sky blue
        { id: 'filterVillage', label: 'Post Office', color: '#98fb98' } // Pale green
    ];

    let badges = [];
    let hasActiveFilters = false;

    filterConfig.forEach(config => {
        let value = config.value || (document.getElementById(config.id)?.value || '');

        if (value && value.trim() !== '') {
            hasActiveFilters = true;
            badges.push(`
                <span class="badge filter-badge" style="background-color: ${config.color}; color: #333; padding: 8px 12px; border-radius: 4px; font-size: 14px; font-weight: 500;">
                    ${config.label}: ${value}
                </span>
            `);

            // Also update inline badge for mobile
            const inlineBadgeId = config.id.replace('filter', '').toLowerCase() + 'Badge';
            const inlineBadge = document.getElementById(inlineBadgeId);
            if (inlineBadge) {
                inlineBadge.innerHTML = `
                    <span class="badge filter-badge" style="background-color: ${config.color}; color: #333; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">
                        ${config.label}: ${value}
                    </span>
                `;
            }
        } else {
            // Clear inline badge if no value
            const inlineBadgeId = config.id.replace('filter', '').toLowerCase() + 'Badge';
            const inlineBadge = document.getElementById(inlineBadgeId);
            if (inlineBadge) {
                inlineBadge.innerHTML = '';
            }
        }
    });

    if (hasActiveFilters) {
        badgesDiv.innerHTML = badges.join('');
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
    }
}

// Hide filter dropdown
function hideFilterDropdown(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) {
        dropdown.classList.remove('show');

        // Remove active class from container
        const container = dropdown.closest('.filter-container');
        if (container) {
            container.classList.remove('active');
        }
    }
}

// Clear a single filter
function clearSingleFilter(inputId, clearBtnId) {
    const input = document.getElementById(inputId);
    const clearBtn = document.getElementById(clearBtnId);

    if (input) {
        input.value = '';
        input.classList.remove('has-value');
    }

    if (clearBtn) {
        clearBtn.style.display = 'none';
    }

    // Clear all child filters (cascading clear)
    clearChildFilters(inputId);

    // Update selected filters display
    updateSelectedFiltersBadges();

    // Trigger filter update
    loadApplications();
}

// Clear child filters when a parent filter is cleared or changed
function clearChildFilters(parentFilterId) {
    // Define filter hierarchy (parent → children)
    const filterHierarchy = {
        'filterZone': ['filterState', 'filterDivision', 'filterDistrict', 'filterTehsil', 'filterPincode', 'filterVillage'],
        'filterState': ['filterDivision', 'filterDistrict', 'filterTehsil', 'filterPincode', 'filterVillage'],
        'filterDivision': ['filterDistrict', 'filterTehsil', 'filterPincode', 'filterVillage'],
        'filterDistrict': ['filterTehsil', 'filterPincode', 'filterVillage'],
        'filterTehsil': ['filterPincode', 'filterVillage'],
        'filterPincode': ['filterVillage']
    };

    const childFilters = filterHierarchy[parentFilterId];

    if (childFilters) {
        childFilters.forEach(childId => {
            const childInput = document.getElementById(childId);
            const childClearBtn = document.getElementById(childId.replace('filter', 'clear'));

            if (childInput && childInput.value) {
                childInput.value = '';
                childInput.classList.remove('has-value');

                if (childClearBtn) {
                    childClearBtn.style.display = 'none';
                }

                console.log(`🧹 Cleared child filter: ${childId}`);
            }
        });
    }
}

// Redirect to login page
function showLoginCredentials(phone, name) {
    // Simply redirect to the login page
    window.location.href = 'profile.html';
}

// Show referral code (phone number) in a modal
function showReferralCode(positionId, phone) {
    if (!phone) {
        alert('Phone number not available');
        return;
    }

    // Create modern modal for referral code display
    const modalHTML = `
        <div class="modal fade" id="referralCodeModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content" style="border-radius: 20px; overflow: hidden; border: none; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
                    <div class="modal-body p-0">
                        <!-- Header -->
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; position: relative;">
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" style="position: absolute; top: 15px; right: 15px;"></button>
                            <div style="margin-top: 10px;">
                                <i class="fas fa-users" style="font-size: 3rem; color: white; margin-bottom: 10px;"></i>
                                <h4 class="text-white fw-bold mb-0">Your Referral Code</h4>
                            </div>
                        </div>
                        
                        <!-- Content -->
                        <div style="padding: 30px; background: white;">
                            <p class="text-center text-muted mb-4">Share this code with others to refer them</p>
                            
                            <!-- Referral Code Display -->
                            <div style="background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); padding: 25px; border-radius: 15px; margin-bottom: 25px;">
                                <div class="text-center mb-2">
                                    <small class="text-muted d-block mb-2" style="font-size: 0.85rem;">REFERRAL CODE</small>
                                    <div style="font-size: 2rem; font-weight: bold; color: #667eea; letter-spacing: 2px; font-family: 'Courier New', monospace;">
                                        ${phone}
                                    </div>
                                </div>
                                
                                <!-- Copy Button -->
                                <div class="text-center mt-3">
                                    <button class="btn btn-primary" onclick="copyReferralCode('${phone}')" style="border-radius: 25px; padding: 10px 30px;">
                                        <i class="fas fa-copy me-2"></i>Copy Code
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Instructions -->
                            <div class="alert alert-info" style="border-radius: 15px; border: none; background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);">
                                <div class="d-flex align-items-start">
                                    <i class="fas fa-info-circle me-3 mt-1" style="color: #1976d2; font-size: 1.2rem;"></i>
                                    <div>
                                        <strong style="color: #1976d2;">How to use:</strong>
                                        <p class="mb-0 mt-1" style="font-size: 0.9rem; color: #333;">
                                            When someone applies for a position, they can enter your phone number (${phone}) in the "Referred By" field to credit you as their referrer.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Share Options -->
                            <div class="text-center mt-4">
                                <p class="text-muted mb-2" style="font-size: 0.9rem;">Share via:</p>
                                <div class="d-flex gap-2 justify-content-center">
                                    <button class="btn btn-success btn-sm" onclick="shareViaWhatsApp('${phone}')" style="border-radius: 20px; padding: 8px 20px;">
                                        <i class="fab fa-whatsapp me-1"></i>WhatsApp
                                    </button>
                                    <button class="btn btn-primary btn-sm" onclick="shareViaSMS('${phone}')" style="border-radius: 20px; padding: 8px 20px;">
                                        <i class="fas fa-sms me-1"></i>SMS
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('referralCodeModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('referralCodeModal'));
    modal.show();

    // Remove modal from DOM after it's hidden
    document.getElementById('referralCodeModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

// Copy referral code to clipboard
function copyReferralCode(phone) {
    navigator.clipboard.writeText(phone).then(() => {
        // Show success message
        const btn = event.target.closest('button');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check me-2"></i>Copied!';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-success');
        
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.classList.remove('btn-success');
            btn.classList.add('btn-primary');
        }, 2000);
    }).catch(err => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = phone;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            alert('Referral code copied: ' + phone);
        } catch (err) {
            alert('Failed to copy. Your referral code is: ' + phone);
        }
        document.body.removeChild(textArea);
    });
}

// Share referral code via WhatsApp
function shareViaWhatsApp(phone) {
    const message = `Join as a Channel Partner! Use my referral code: ${phone} when applying.\n\nApply here: ${window.location.origin}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

// Share referral code via SMS
function shareViaSMS(phone) {
    const message = `Join as a Channel Partner! Use my referral code: ${phone} when applying. Apply here: ${window.location.origin}`;
    const smsUrl = `sms:?body=${encodeURIComponent(message)}`;
    window.location.href = smsUrl;
}

// Show referral info with phone number and credits info
async function showReferralInfo(positionId, phone, name) {
    try {
        // Fetch user details by phone
        const response = await fetch(`${API_BASE_URL}/admin/test-user/${phone}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            alert('User details not found. Please contact admin.');
            return;
        }

        const user = await response.json();
        const userPhone = phone || 'Not available';
        const introducedCount = user.introducedCount || 0;
        const creditsPerReferral = 100000; // 20% of 500,000
        const maxReferrals = 20;
        const remainingReferrals = Math.max(0, maxReferrals - introducedCount);
        const canEarnMore = introducedCount < maxReferrals;

        // Create modern modal for referral info
        const modalHTML = `
            <div class="modal fade" id="referralModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content" style="border-radius: 20px; overflow: hidden; border: none; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
                        <div class="modal-body p-0">
                            <div style="background: linear-gradient(135deg, #0066cc 0%, #00a8ff 50%, #ffa500 100%); padding: 30px; text-align: center; position: relative;">
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" style="position: absolute; top: 15px; right: 15px;"></button>
                                <div style="margin-top: 10px;">
                                    <i class="fas fa-gift" style="font-size: 3rem; color: white; margin-bottom: 10px;"></i>
                                    <h4 class="text-white fw-bold mb-0">Referral Information</h4>
                                </div>
                            </div>
                            
                            <div style="padding: 30px; background: white;">
                                <!-- Name Display -->
                                <div class="text-center mb-3">
                                    <h5 class="fw-bold text-dark">${name || 'Channel Partner'}</h5>
                                </div>
                                
                                <!-- Phone Number Display -->
                                <div style="background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); padding: 25px; border-radius: 15px; margin-bottom: 25px;">
                                    <div class="text-center mb-2">
                                        <small class="text-muted">Referral Phone Number</small>
                                    </div>
                                    <h2 class="fw-bold text-center mb-0" style="color: #0066cc; font-size: 2rem; letter-spacing: 2px;">+91 ${userPhone}</h2>
                                </div>
                                
                                <!-- Stats Row -->
                                <div class="row text-center mb-4">
                                    <div class="col-4">
                                        <div class="p-2">
                                            <h4 class="mb-1 fw-bold" style="color: #0066cc;">${introducedCount}</h4>
                                            <small class="text-muted" style="font-size: 0.75rem;">Introduced</small>
                                        </div>
                                    </div>
                                    <div class="col-4">
                                        <div class="p-2">
                                            <h4 class="mb-1 fw-bold" style="color: #ffa500;">1,00,000</h4>
                                            <small class="text-muted" style="font-size: 0.75rem;">Credits/Referral</small>
                                        </div>
                                    </div>
                                    <div class="col-4">
                                        <div class="p-2">
                                            <h4 class="mb-1 fw-bold" style="color: #28a745;">${remainingReferrals}/${maxReferrals}</h4>
                                            <small class="text-muted" style="font-size: 0.75rem;">Remaining</small>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Instructions -->
                                <div style="background: #fff3e0; border-left: 4px solid #ffa500; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                                    <div class="d-flex align-items-start mb-2">
                                        <span style="background: #ffa500; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: bold; margin-right: 10px; flex-shrink: 0;">1</span>
                                        <small style="color: #666;">Share your phone number with friends to join Instantlly Cards</small>
                                    </div>
                                    <div class="d-flex align-items-start">
                                        <span style="background: #ffa500; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: bold; margin-right: 10px; flex-shrink: 0;">2</span>
                                        <small style="color: #666;">Get <strong>1,00,000 credits</strong> (20% of 5,00,000) when they apply using your phone (up to ${maxReferrals} people)</small>
                                    </div>
                                </div>
                                
                                ${!canEarnMore ? `
                                <div class="alert alert-success mb-3" style="background: #e8f5e9; border: none; border-radius: 10px;">
                                    <small><i class="fas fa-check-circle me-1"></i> You've reached max paid referrals! Keep sharing - count still increases</small>
                                </div>
                                ` : ''}
                                
                                <!-- Copy Button -->
                                <button type="button" class="btn btn-lg w-100" onclick="copyReferralPhone('+91${userPhone}')" style="background: linear-gradient(135deg, #ffa500 0%, #ff7043 100%); border: none; color: white; padding: 15px; border-radius: 12px; font-weight: bold; box-shadow: 0 4px 15px rgba(255, 112, 67, 0.3);">
                                    <i class="fas fa-copy me-2"></i>Copy Phone Number
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('referralModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('referralModal'));
        modal.show();

    } catch (error) {
        console.error('Error fetching referral code:', error);
        alert('Error loading referral code. Please try again.');
    }
}

// Copy referral phone to clipboard
function copyReferralPhone(phone) {
    // Don't copy if phone is not valid
    if (!phone || phone === 'N/A' || phone === 'Not available') {
        alert('Phone number not available.');
        return;
    }

    // Try clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(phone).then(() => {
            // Show success message
            const btn = event.target.closest('button');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check me-2"></i>Copied!';
            btn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';

            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.background = 'linear-gradient(135deg, #ffa500 0%, #ff7043 100%)';
            }, 2000);
        }).catch(err => {
            console.error('Clipboard write failed:', err);
            // Fallback to manual copy
            fallbackCopyTextToClipboard(phone);
        });
    } else {
        // Fallback for browsers that don't support clipboard API
        fallbackCopyTextToClipboard(phone);
    }
}

// Fallback copy method for older browsers
function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        if (successful) {
            // Show success notification
            showNotification('Referral code copied: ' + text, 'success');
        } else {
            alert('Failed to copy. Please copy manually: ' + text);
        }
    } catch (err) {
        console.error('Fallback copy failed:', err);
        alert('Failed to copy. Please copy manually: ' + text);
    }

    document.body.removeChild(textArea);
}

// Show ID Card with download option
// async function showIDCard(name, phone, photo, positionId) {
//     try {
//         // Fetch user details
//         const response = await fetch(`${API_BASE_URL}/admin/test-user/${phone}`, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' }
//         });

//         if (!response.ok) {
//             alert('User details not found.');
//             return;
//         }

//         const user = await response.json();
//         // Use personCode if available, otherwise use applicationId
//         const partnerId = user.personCode || user.applicationId || 'N/A';

//         // Create modal with ID card
//         const modalHTML = `
//             <div class="modal fade" id="idCardModal" tabindex="-1">
//                 <div class="modal-dialog modal-lg modal-dialog-centered">
//                     <div class="modal-content">
//                         <div class="modal-header bg-primary text-white">
//                             <h5 class="modal-title">
//                                 <i class="fas fa-id-card me-2"></i>Channel Partner ID Card
//                             </h5>
//                             <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
//                         </div>
//                         <div class="modal-body p-0">
//                             <!-- Standard ID Card Size: 90mm × 54mm (850px × 510px for display) -->
//                             <div id="idCardContent" style="background: linear-gradient(135deg, #0066cc 0%, #00a8ff 50%, #ffa500 100%); padding: 20px; width: 850px; height: 510px; margin: 0 auto;">
//                                 <!-- Landscape ID Card Design - 2 SECTIONS ONLY -->
//                                 <div style="background: white; border-radius: 15px; padding: 20px; width: 100%; height: 100%; box-shadow: 0 10px 40px rgba(0,0,0,0.3); display: flex; align-items: stretch; gap: 25px;">

//                                     <!-- LEFT SECTION: Logo (Top) + Photo (Middle) + Company Name (Bottom) -->
//                                     <div style="flex: 0 0 220px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 10px 0;">
//                                         <!-- Logo at Top -->
//                                         <img src="images/logo.jpeg" alt="Instantlly Cards Logo" style="width: 140px; height: 140px; object-fit: contain; border-radius: 15px;">

//                                         <!-- Photo in Middle -->
//                                         <img src="${photo || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNzUiIGN5PSI3NSIgcj0iNzUiIGZpbGw9IiNlMmU4ZjAiLz48L3N2Zz4='}" 
//                                              alt="${name}" 
//                                              style="width: 150px; height: 170px; object-fit: cover; border-radius: 15px; border: 4px solid #0066cc;">

//                                         <!-- Company Name at Bottom -->
//                                         <div style="width: 100%;">
//                                             <h6 style="margin: 0; margin-bottom: 5px; color: #0066cc; font-weight: bold; font-size: 1.1rem; line-height: 1.2;">INSTANTLLY CARDS</h6>
//                                             <small style="color: #ffa500; font-size: 0.9rem; font-weight: 600;">Channel Partner</small>
//                                         </div>
//                                     </div>

//                                     <!-- RIGHT SECTION: User Details -->
//                                     <div style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
//                                         <!-- Name -->
//                                         <h3 style="color: #333; font-weight: bold; margin: 0 0 25px 0; font-size: 1.8rem; line-height: 1.2;">${name}</h3>

//                                         <!-- Details List -->
//                                         <div style="margin-bottom: 15px;">
//                                             <i class="fas fa-phone" style="color: #0066cc; width: 25px; font-size: 1rem;"></i>
//                                             <strong style="font-size: 1rem;">Phone:</strong> <span style="font-size: 1rem;">${phone}</span>
//                                         </div>
//                                         <div style="margin-bottom: 15px;">
//                                             <i class="fas fa-id-badge" style="color: #ffa500; width: 25px; font-size: 1rem;"></i>
//                                             <strong style="font-size: 1rem;">Partner ID:</strong> <span style="font-size: 1rem;">${partnerId}</span>
//                                         </div>
//                                         <div style="margin-bottom: 20px;">
//                                             <i class="fas fa-calendar" style="color: #00a8ff; width: 25px; font-size: 1rem;"></i>
//                                             <strong style="font-size: 1rem;">Joined:</strong> <span style="font-size: 1rem;">${new Date().toLocaleDateString()}</span>
//                                         </div>

//                                         <!-- Authorized Badge -->
//                                         <div style="background: linear-gradient(135deg, #0066cc 0%, #ffa500 100%); color: white; padding: 12px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
//                                             <strong style="font-size: 1rem; letter-spacing: 0.5px;">AUTHORIZED CHANNEL PARTNER</strong>
//                                         </div>

//                                         <!-- Footer -->
//                                         <div style="padding-top: 15px; border-top: 2px solid #0066cc;">
//                                             <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
//                                                 <small style="color: #666; font-size: 0.8rem;">
//                                                     <i class="fas fa-globe me-1"></i>
//                                                     www.instantllycards.com
//                                                 </small>
//                                                 <small style="color: #666; font-size: 0.8rem;">
//                                                     <i class="fas fa-envelope me-1"></i>
//                                                     instantllycardsonlinemeeting@gmail.com
//                                                 </small>
//                                             </div>
//                                         </div>
//                                     </div>

//                                 </div>
//                             </div>
//                         </div>
//                         <div class="modal-footer">
//                             <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
//                             <button type="button" class="btn btn-primary" onclick="downloadIDCard('${name}', '${phone}', '${photo}', '${partnerId}')">
//                                 <i class="fas fa-download me-2"></i>Download as PDF
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         `;

//         // Remove existing modal if any
//         const existingModal = document.getElementById('idCardModal');
//         if (existingModal) {
//             existingModal.remove();
//         }

//         // Add modal to body
//         document.body.insertAdjacentHTML('beforeend', modalHTML);

//         // Show modal
//         const modal = new bootstrap.Modal(document.getElementById('idCardModal'));
//         modal.show();

//     } catch (error) {
//         console.error('Error showing ID card:', error);
//         alert('Error loading ID card. Please try again.');
//     }
// }
// async function showIDCard(name, phone, photo, positionId) {
//     try {
//         // Fetch user details
//         const response = await fetch(`${API_BASE_URL}/admin/test-user/${phone}`, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' }
//         });

//         if (!response.ok) {
//             alert('User details not found.');
//             return;
//         }

//         const user = await response.json();
//         // Use personCode if available, otherwise use applicationId
//         const partnerId = user.personCode || user.applicationId || 'N/A';

//         // Create modal with ID card
//         const modalHTML = `
//             <div class="modal fade" id="idCardModal" tabindex="-1">
//                 <div class="modal-dialog modal-lg modal-dialog-centered">
//                     <div class="modal-content">
//                         <div class="modal-header bg-primary text-white">
//                             <h5 class="modal-title">
//                                 <i class="fas fa-id-card me-2"></i>Channel Partner ID Card
//                             </h5>
//                             <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
//                         </div>
//                         <div class="modal-body p-0">
//                             <!-- Vertical ID Card Design - Exact Match to Provided Image: 623.62px × 1020.47px -->
//                             <div id="idCardContent" style="background: white; padding: 0; width: 623.62px; height: 1020.47px; margin: 0 auto; position: relative; overflow: hidden; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">

//                                 <!-- LEFT SECTION: Dark background with app benefits, ads, and appointment info -->
//                                 <div style="position: absolute; left: 0; top: 0; width: 200px; height: 100%; background-color: #000000; display: flex; flex-direction: column; justify-content: space-between; padding: 20px 10px; box-sizing: border-box;">

//                                     <!-- Top: Instantlly Cards Logo -->
//                                     <div style="text-align: center; margin-bottom: 20px;">
//                                         <img src="images/Logo.png" alt="Instantlly Cards Logo" style="width: 120px; height: auto; object-fit: contain;">
//                                     </div>

//                                     <!-- App Benefits -->
//                                     <div style="color: #ffffff; text-align: center; margin-bottom: 30px;">
//                                         <div style="font-weight: bold; font-size: 0.85rem; margin-bottom: 10px; color: #00bfff;">App Benefits</div>
//                                         <div style="font-size: 0.7rem; line-height: 1.3;">Create Send Receive</div>
//                                         <div style="font-size: 0.7rem; line-height: 1.3; color: #00bfff;">Unlimited Cards</div>
//                                     </div>

//                                     <!-- Advertisements -->
//                                     <div style="color: #ffffff; text-align: center; margin-bottom: 30px;">
//                                         <div style="font-weight: bold; font-size: 0.85rem; margin-bottom: 10px; color: #00bfff;">Advertisements</div>
//                                         <div style="font-weight: bold; font-size: 0.75rem; margin-bottom: 5px;">Banner</div>
//                                         <div style="font-weight: bold; font-size: 0.75rem; margin-bottom: 5px;">Display</div>
//                                         <div style="font-weight: bold; font-size: 0.75rem; margin-bottom: 10px;">Video</div>
//                                         <div style="font-size: 0.7rem; margin-bottom: 5px;">Download from</div>
//                                         <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="Play Store" style="width: 80px; height: auto; margin: 0 auto;">
//                                         <div style="font-size: 0.65rem; color: #00bfff; margin-top: 5px;">Playstore</div>
//                                     </div>

//                                     <!-- Bottom: Appointment Info (White Box) -->
//                                     <div style="background-color: #ffffff; padding: 15px; border-radius: 5px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
//                                         <div style="color: #000000; font-weight: bold; font-size: 0.8rem; margin-bottom: 10px;">Instantlly Cards</div>
//                                         <div style="color: #000000; font-size: 0.65rem; line-height: 1.2; margin-bottom: 10px;">We Are Appointing Sole Head</div>
//                                         <div style="color: #000000; font-size: 0.65rem; line-height: 1.2;">for India, Zone, State, Division,</div>
//                                         <div style="color: #000000; font-size: 0.65rem; line-height: 1.2;">District, Tehsil, Pincode, Village</div>
//                                         <div style="color: #000000; font-size: 0.7rem; font-weight: bold; margin-top: 10px;">Mob: $9833752025</div>
//                                         <div style="color: #000000; font-size: 0.65rem; margin-top: 5px;">Web: instantly.com</div>
//                                     </div>

//                                 </div>

//                                 <!-- RIGHT SECTION: Red background with photo and details -->
//                                 <div style="position: absolute; right: 0; top: 0; width: 423.62px; height: 100%; background-color: #ff0000; display: flex; flex-direction: column; padding: 20px 20px; box-sizing: border-box; color: #ffffff; justify-content: flex-start;">

//                                     <!-- Photo Placeholder (Top) -->
//                                     <div style="text-align: center; margin-bottom: 20px; height: 200px; display: flex; align-items: center; justify-content: center;">
//                                         <div style="width: 180px; height: 200px; background-color: #ffffff; border: 3px solid #ffffff; border-radius: 5px; overflow: hidden; display: flex; align-items: center; justify-content: center;">
//                                             <img src="${photo || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDE4MCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2U5ZWFmMCIvPjxjaXJjbGUgY3g9IjkwIiBjeT0iNjAiIHI9IjQwIiBmaWxsPSIjY2NjIi8+PHRleHQgeD0iOTAiIHk9IjEyMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+dXNlciA8L3RleHQ+PC9zdmc+'}" 
//                                                  alt="${name}" 
//                                                  style="width: 100%; height: 100%; object-fit: cover;">
//                                         </div>
//                                         <div style="font-size: 0.8rem; margin-top: 5px;">Photo</div>
//                                     </div>

//                                     <!-- Details Form -->
//                                     <div style="flex: 1; display: flex; flex-direction: column; justify-content: flex-start; font-size: 0.75rem; line-height: 1.4;">
//                                         <div style="margin-bottom: 10px;">
//                                             <strong style="font-size: 0.8rem;">Name:</strong> <span style="font-weight: bold;">${name}</span>
//                                         </div>
//                                         <div style="margin-bottom: 10px;">
//                                             <strong style="font-size: 0.8rem;">Mob:</strong> <span style="font-weight: bold;">${phone}</span>
//                                         </div>
//                                         <div style="margin-bottom: 10px; font-weight: bold; font-size: 0.85rem; color: #ffffff;">Area Head For</div>
//                                         <div style="margin-bottom: 8px;">
//                                             <strong>Country:</strong> India
//                                         </div>
//                                         <div style="margin-bottom: 8px;">
//                                             <strong>Zone:</strong> Western
//                                         </div>
//                                         <div style="margin-bottom: 8px;">
//                                             <strong>State:</strong> Maharashtra
//                                         </div>
//                                         <div style="margin-bottom: 8px;">
//                                             <strong>Division:</strong> Konkan
//                                         </div>
//                                         <div style="margin-bottom: 8px;">
//                                             <strong>District:</strong> Mumbai
//                                         </div>
//                                         <div style="margin-bottom: 8px;">
//                                             <strong>Taluka:</strong> 
//                                         </div>
//                                         <div style="margin-bottom: 8px;">
//                                             <strong>Pincode:</strong> 
//                                         </div>
//                                         <div style="margin-bottom: 8px;">
//                                             <strong>Village:</strong> 
//                                         </div>
//                                     </div>

//                                 </div>

//                             </div>
//                         </div>
//                         <div class="modal-footer">
//                             <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
//                             <button type="button" class="btn btn-primary" onclick="downloadIDCard('${name}', '${phone}', '${photo}', '${partnerId}')">
//                                 <i class="fas fa-download me-2"></i>Download as PDF
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         `;

//         // Remove existing modal if any
//         const existingModal = document.getElementById('idCardModal');
//         if (existingModal) {
//             existingModal.remove();
//         }

//         // Add modal to body
//         document.body.insertAdjacentHTML('beforeend', modalHTML);

//         // Show modal
//         const modal = new bootstrap.Modal(document.getElementById('idCardModal'));
//         modal.show();

//     } catch (error) {
//         console.error('Error showing ID card:', error);
//         alert('Error loading ID card. Please try again.');
//     }
// }  

// async function showIDCard(name, phone, photo) {
//     try {
//         // Fetch details
//         const response = await fetch(`${API_BASE_URL}/admin/test-user/${phone}`, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' }
//         });

//         if (!response.ok) {
//             alert("User details not found.");
//             return;
//         }

//         const user = await response.json();

//         const modalHTML = `
//         <div class="modal fade" id="idCardModal" tabindex="-1">
//             <div class="modal-dialog modal-lg modal-dialog-centered">
//                 <div class="modal-content">

//                     <div class="modal-header bg-primary text-white">
//                         <h5 class="modal-title">
//                             <i class="fas fa-id-card me-2"></i>Channel Partner ID Card
//                         </h5>
//                         <button class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
//                     </div>

//                     <div class="modal-body p-0" style="background:#f5f5f5;">
//                         <div style="padding: 10px; display:flex; justify-content:center;">

//                             <!-- CARD -->
//                             <div id="idCardContent" style="
//                                 width: 720px;
//                                 height: 1280px;
//                                 background:white;
//                                 position:relative;
//                                 overflow:hidden;
//                                 font-family: Arial,Helvetica,sans-serif;
//                                 box-shadow: 0 4px 15px rgba(0,0,0,0.20);
//                             ">

//                                 <!-- LEFT PANEL (304px exact) -->
//                                 <div style="
//                                     position:absolute;
//                                     left:0; top:0;
//                                     width:304px;
//                                     height:100%;
//                                     background:black;
//                                     color:white;
//                                     padding:20px;
//                                     box-sizing:border-box;
//                                 ">

//                                     <!-- LOGO -->
//                                     <div style="text-align:center; margin-bottom:25px;">
//                                         <img src="images/logo.png"
//                                              style="width:160px; object-fit:contain;">
//                                     </div>

//                                     <!-- APP BENEFITS -->
//                                     <div style="text-align:center; margin-bottom:30px;">
//                                         <div style="font-size:28px; font-weight:700;">App Benefits</div>
//                                         <div style="font-size:22px;">Create Send Receive</div>
//                                         <div style="font-size:28px; color:#00bfff; font-weight:700;">Unlimited Cards</div>
//                                     </div>

//                                     <!-- ADS -->
//                                     <div style="text-align:center; margin-bottom:30px;">
//                                         <div style="font-size:28px; font-weight:700; margin-bottom:10px;">
//                                             Advertisements
//                                         </div>
//                                         <div style="font-size:60px; font-weight:700; line-height:0.9;">Banner</div>
//                                         <div style="font-size:60px; font-weight:700; line-height:0.9;">Display</div>
//                                         <div style="font-size:60px; font-weight:700; line-height:0.9; margin-bottom:5px;">
//                                             Video
//                                         </div>

//                                         <div style="font-size:20px; margin-bottom:8px;">Download from</div>
//                                         <img src="images/android.png"
//                                              style="width:70px; display:block; margin:auto;">
//                                     </div>

//                                     <!-- FOOTER STATIC -->
//                                     <div style="
//                                         background:white;
//                                         color:black;
//                                         padding:15px;
//                                         border-radius:6px;
//                                         text-align:center;
//                                         font-size:20px;
//                                     ">
//                                         <div style="font-weight:700; font-size:26px;">
//                                             Instantly Cards
//                                         </div>
//                                         <div style="font-size:18px;">We Are Appointing Sole Head</div>
//                                         <div style="font-size:16px;">
//                                             for India, Zone, State, Division,<br>
//                                             District, Tehsil, Pincode, Village
//                                         </div>
//                                         <div style="margin-top:10px; font-size:20px; font-weight:700;">
//                                             Mob: ${phone}
//                                         </div>
//                                         <div style="font-size:16px;">Web: instantly.com</div>
//                                     </div>

//                                 </div>

//                                 <!-- RIGHT PANEL (416px exact) -->
//                                 <div style="
//                                     position:absolute;
//                                     right:0; top:0;
//                                     width:416px;
//                                     height:100%;
//                                     background:#e60000;
//                                     color:white;
//                                     padding:25px 40px;
//                                     box-sizing:border-box;
//                                     display:flex;
//                                    flex-direction:column;
//                                    justify-content:flex-start;

//                                 ">

//                                     <!-- PHOTO -->
//                                     <div style="text-align:center; margin-bottom:25px;">
//                                         <div style="font-size:36px; font-weight:700; color:black;">
//                                             Photo
//                                         </div>

//                                         <div style="
//                                             width:260px;
//                                             height:260px;
//                                             border-radius:50%;
//                                             background:white;
//                                             margin:10px auto 0 auto;
//                                             overflow:hidden;
//                                             display:flex;
//                                             align-items:center;
//                                             justify-content:center;
//                                         ">
//                                             <img src="${photo}"
//                                                  style="width:100%; height:100%; object-fit:cover;">
//                                         </div>
//                                     </div>

//                                     <!-- TEXT DETAILS -->
//                                     <div style="font-size:30px; line-height:1.3;">
//                                         <div style="margin-bottom:10px;">
//                                             <b>Name:</b> ${name}
//                                         </div>
//                                         <div style="margin-bottom:25px;">
//                                             <b>Mob:</b> ${phone}
//                                         </div>

//                                         <div style="font-size:36px; font-weight:700; margin-bottom:20px;">
//                                             Area Head For
//                                         </div>

//                                         <div><b>Country:</b> India</div>
//                                         <div><b>Zone:</b> Western</div>
//                                         <div><b>State:</b> Maharashtra</div>
//                                         <div><b>Division:</b> Konkan</div>

//                                         <div style="
//                                             background:white;
//                                             color:black;
//                                             padding:10px;
//                                             margin:5px 0 10px 0;
//                                             font-size:26px;
//                                             font-weight:700;
//                                         ">
//                                             <b>District:</b> Mumbai
//                                         </div>

//                                         <div><b>Taluka:</b></div>
//                                         <div><b>Pincode:</b></div>
//                                         <div><b>Village:</b></div>
//                                     </div>

//                                 </div>

//                             </div> <!-- card -->

//                         </div>
//                     </div>

//                     <div class="modal-footer">
//                         <button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>

//                         <button class="btn btn-primary" onclick="downloadIDCardAsImage('${name}', '${phone}', '${photo}')">
//                             <i class="fas fa-download me-2"></i>Download
//                         </button>
//                     </div>

//                 </div>
//             </div>
//         </div>
//         `;

//         const oldModal = document.getElementById("idCardModal");
//         if (oldModal) oldModal.remove();

//         document.body.insertAdjacentHTML("beforeend", modalHTML);
//         new bootstrap.Modal(document.getElementById("idCardModal")).show();

//     } catch (err) {
//         alert("Error loading card.");
//     }
// }

// Function to get complete location hierarchy path UP TO the person's level (not beyond)
async function getCompleteLocationPath(location) {
    try {
        console.log('🔍 Getting complete path for:', location);
        
        // Determine the person's area head level (the lowest level that has a value)
        let personLevel = null;
        if (location.village) personLevel = 'village';
        else if (location.pincode) personLevel = 'pincode';
        else if (location.tehsil) personLevel = 'tehsil';
        else if (location.district) personLevel = 'district';
        else if (location.division) personLevel = 'division';
        else if (location.state) personLevel = 'state';
        else if (location.zone) personLevel = 'zone';
        else personLevel = 'country';
        
        console.log('👤 Person is Area Head at level:', personLevel);
        
        // Get the value to lookup
        const lookupValue = location.village || location.pincode || location.tehsil || 
                           location.district || location.division || location.state || 
                           location.zone || location.country;
        
        if (!lookupValue) {
            return location; // Return as-is if nothing is set
        }
        
        // Call backend API to get reverse lookup
        const response = await fetch(`${API_BASE_URL}/locations/reverse-lookup/${encodeURIComponent(lookupValue)}`);
        
        if (!response.ok) {
            console.warn('⚠️ Could not fetch location hierarchy, using provided data');
            return location;
        }
        
        const fullPath = await response.json();
        console.log('✅ Got complete path:', fullPath);
        
        // Build the result - fill hierarchy UP TO person's level, leave rest empty
        const result = {
            country: "India", // Always show country
            zone: "",
            state: "",
            division: "",
            district: "",
            tehsil: "",
            pincode: "",
            village: ""
        };
        
        // Fill hierarchy from top down, UP TO the person's level only
        const hierarchy = ['country', 'zone', 'state', 'division', 'district', 'tehsil', 'pincode', 'village'];
        const personLevelIndex = hierarchy.indexOf(personLevel);
        
        for (let i = 0; i <= personLevelIndex; i++) {
            const level = hierarchy[i];
            // Use original location value first, then fullPath, then empty
            result[level] = location[level] || fullPath[level] || "";
        }
        
        console.log('📍 Final hierarchy (up to', personLevel + '):', result);
        
        return result;
    } catch (error) {
        console.error('❌ Error getting location path:', error);
        return location; // Return original on error
    }
}

async function showIDCard(name, phone, photo, positionLocation) {
    // Show loading overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'idCardLoadingOverlay';
    loadingOverlay.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                    background: rgba(0, 0, 0, 0.7); z-index: 9999; 
                    display: flex; justify-content: center; align-items: center;">
            <div style="text-align: center; color: white;">
                <div class="spinner-border text-light" role="status" style="width: 3rem; height: 3rem; border-width: 0.3rem;">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p style="margin-top: 1rem; font-size: 1.1rem; font-weight: 500;">Loading ID Card...</p>
            </div>
        </div>
    `;
    document.body.appendChild(loadingOverlay);

    try {
        // Get complete location hierarchy path
        const completeLocation = await getCompleteLocationPath(positionLocation);
        console.log('📍 Complete location for ID card:', completeLocation);

        function getAreaHighlight(loc) {
            if (loc.village)  return { level: "Village", value: loc.village };
            if (loc.pincode)  return { level: "Pincode", value: loc.pincode };
            if (loc.tehsil)   return { level: "Tehsil", value: loc.tehsil };
            if (loc.district) return { level: "District", value: loc.district };
            if (loc.division) return { level: "Div", value: loc.division };
            if (loc.state)    return { level: "State", value: loc.state };
            if (loc.zone)     return { level: "Zone", value: loc.zone };
            return { level: "Country", value: loc.country || "India" };
        }

        const highlight = getAreaHighlight(completeLocation);

        const loc = {
            country: completeLocation.country || "India",
            zone: completeLocation.zone || "",
            state: completeLocation.state || "",
            division: completeLocation.division || "",
            district: completeLocation.district || "",
            tehsil: completeLocation.tehsil || "",
            pincode: completeLocation.pincode || "",
            village: completeLocation.village || ""
        };

        let areaListHTML = "";

        function makeRow(label, value) {
            // HIGHLIGHT BOX for the area head level (filled value)
            if (value && highlight.level === label) {
                return `
                <div style="
                    background:white;
                    color:black;
                    padding:8px 10px;
                    font-size:24px;
                    font-weight:700;
                    margin:6px 0;
                    display:flex;
                    align-items:center;
                    line-height:1.1;
                ">
                    <span style="font-weight:bold; margin-right:8px;">${label}:</span><span>${value}</span>
                </div>`;
            }

            // ALWAYS show the row - even if empty
            return `<div style="margin-bottom:6px; line-height:1.25;"><b>${label}:</b> ${value}</div>`;
        }

        // ALWAYS show all 8 fields in order (filled or empty)
        areaListHTML += makeRow("Country", loc.country);
        areaListHTML += makeRow("Zone", loc.zone);
        areaListHTML += makeRow("State", loc.state);
        areaListHTML += makeRow("Div", loc.division);  // Changed to "Div"
        areaListHTML += makeRow("District", loc.district);
        areaListHTML += makeRow("Tehsil", loc.tehsil);
        areaListHTML += makeRow("Pincode", loc.pincode);
        areaListHTML += makeRow("Village", loc.village);

        const response = await fetch(`${API_BASE_URL}/admin/test-user/${phone}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });

        if (!response.ok) {
            alert("User details not found.");
            return;
        }

        const user = await response.json();

        const modalHTML = `
        <style>
            #idCardModal .modal-dialog {
                max-width: 420px;
                margin: 0.5rem auto;
            }
            #idCardModal .modal-body {
                overflow: hidden;
                padding: 0;
                height: 550px;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            #idCardContent {
                transform: scale(0.46);
                transform-origin: center center;
            }
            @media (min-width: 1400px) {
                #idCardModal .modal-dialog {
                    max-width: 480px;
                }
                #idCardModal .modal-body {
                    height: 620px;
                }
                #idCardContent {
                    transform: scale(0.52);
                }
            }
            @media (max-width: 1199px) {
                #idCardModal .modal-dialog {
                    max-width: 400px;
                }
                #idCardModal .modal-body {
                    height: 520px;
                }
                #idCardContent {
                    transform: scale(0.44);
                }
            }
            @media (max-width: 991px) {
                #idCardModal .modal-dialog {
                    max-width: 380px;
                }
                #idCardModal .modal-body {
                    height: 500px;
                }
                #idCardContent {
                    transform: scale(0.42);
                }
            }
            @media (max-width: 768px) {
                #idCardModal .modal-dialog {
                    max-width: 350px;
                    margin: 0.5rem auto;
                }
                #idCardModal .modal-body {
                    height: 470px;
                }
                #idCardContent {
                    transform: scale(0.39);
                }
            }
            @media (max-width: 576px) {
                #idCardModal .modal-dialog {
                    max-width: 320px;
                    margin: 0.5rem auto;
                }
                #idCardModal .modal-body {
                    height: 440px;
                }
                #idCardContent {
                    transform: scale(0.36);
                }
            }
            @media (max-width: 480px) {
                #idCardModal .modal-dialog {
                    max-width: 300px;
                }
                #idCardModal .modal-body {
                    height: 420px;
                }
                #idCardContent {
                    transform: scale(0.34);
                }
            }
            @media (max-width: 400px) {
                #idCardModal .modal-dialog {
                    max-width: 280px;
                }
                #idCardModal .modal-body {
                    height: 400px;
                }
                #idCardContent {
                    transform: scale(0.32);
                }
            }
            @media (max-width: 360px) {
                #idCardModal .modal-dialog {
                    max-width: 260px;
                }
                #idCardModal .modal-body {
                    height: 380px;
                }
                #idCardContent {
                    transform: scale(0.30);
                }
            }
        </style>
        <div class="modal fade" id="idCardModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">

                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-id-card me-2"></i>Channel Partner ID Card
                        </h5>
                        <button class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>

                    <div class="modal-body p-0" style="background:#f5f5f5;">
                        <div style="padding:10px; display:flex; justify-content:center;">

                            <!-- FULL ID CARD -->
                            <div id="idCardContent" style="
                                width:720px;
                                background:white;
                                min-height:auto;
                                display:flex;
                                overflow:hidden;
                                font-family:Arial, Helvetica, sans-serif;
                                box-shadow:0 4px 15px rgba(0,0,0,0.25);
                            ">

                                <!-- LEFT SECTION -->
                                <div style="
                                    width:304px;
                                    background:black;
                                    color:white;
                                    padding:20px;
                                    display:flex;
                                    flex-direction:column;
                                    align-items:center;
                                ">

                                    <!-- LOGO -->
                                    <div style="text-align:center; margin-bottom:25px;">
                                        <img src="images/mainlogo.png" style="width:165px;">
                                    </div>

                                    <!-- APP BENEFITS -->
                                    <div style="text-align:center; margin-bottom:30px;">
                                        <div style="font-size:32px; font-weight:700;">App Benefits</div>
                                        <div style="font-size:26px;">Create Send Receive</div>
                                        <div style="font-size:32px; color:#00bfff; font-weight:700;">Unlimited Cards</div>
                                    </div>

                                    <!-- ADS -->
                                    <div style="text-align:center; margin-bottom:30px;">
                                        <div style="font-size:32px; font-weight:700; margin-bottom:10px;">
                                            Advertisements
                                        </div>

                                        <div style="font-size:66px; font-weight:700; line-height:0.9;">Banner</div>
                                        <div style="font-size:66px; font-weight:700; line-height:0.9;">Display</div>
                                        <div style="font-size:66px; font-weight:700; line-height:0.9;">Video</div>

                                        <div style="font-size:22px; margin-top:5px;">Download from</div>

                                        <!-- PLAYSTORE INLINE -->
                                        <div style="display:flex; align-items:center; gap:8px; margin-top:10px; justify-content:center;">
                                            <span style="font-size:22px;">Playstore</span>
                                            <img src="images/android.png" style="width:40px;">
                                        </div>
                                    </div>

                                    <!-- HEADING: Instantly Cards -->
                                    <div style="
                                        font-size:30px;
                                        font-weight:700;
                                        text-align:center;
                                        margin-bottom:8px;
                                        letter-spacing:-0.5px;
                                    ">
                                        <span style="color:white;">Instan<span style="color:#00bfff;">tlly</span></span>
                                        <span style="color:white;"> Cards</span>
                                    </div>

                                    <!-- WHITE BOX 1 -->
                                    <div style="
                                        background:white;
                                        color:black;
                                        padding:12px;
                                        border-radius:6px;
                                        text-align:center;
                                        font-size:17px;
                                        line-height:1.2;
                                        font-weight:600;
                                        margin-bottom:10px;
                                        width:100%;
                                    ">
                                        We Are Appointing Sole Head <br>
                                        for India, Zone, State, Division,<br>
                                        District, Tehsil, Pincode, Village
                                    </div>

                                    <!-- WHITE BOX 2 -->
                                    <div style="
                                        background:white;
                                        color:black;
                                        padding:12px;
                                        border-radius:6px;
                                        text-align:center;
                                        font-size:22px;
                                        line-height:1.3;
                                        width:100%;
                                        margin-bottom:0px;
                                    ">
                                        <div style="font-weight:700;">Mob: 9833752025</div>
                                        <div style="font-size:18px;">Web: instantlly.com</div>
                                    </div>

                                </div>

                                <!-- RIGHT SECTION -->
                                <div style="
                                    width:416px;
                                    background:#e60000;
                                    color:white;
                                    padding:25px 35px;
                                    display:flex;
                                    flex-direction:column;
                                    justify-content:flex-start;
                                ">

                                    <!-- PHOTO -->
                                    <div style="text-align:center; margin-bottom:20px;">
                                        <div style="font-size:32px; font-weight:700; color:black; margin-bottom:8px;">
                                            Photo
                                        </div>

                                        <div style="
                                            width:260px;
                                            height:260px;
                                            background:white;
                                            overflow:hidden;
                                            margin:0 auto;
                                            border:4px solid white;
                                        ">
                                            <img src="${window.CacheBuster ? window.CacheBuster.addCacheBuster(photo) : photo}" style="width:100%; height:100%; object-fit:cover;">
                                        </div>
                                    </div>

                                    <!-- NAME & MOBILE -->
                                    <div style="font-size:26px; line-height:1.25;">
                                        <div style="margin-bottom:8px;">
                                            <b>Name:</b> ${name}
                                        </div>
                                        <div style="margin-bottom:15px;">
                                            <b>Mob:</b> ${phone}
                                        </div>
                                    </div>

                                    <!-- AREA HEAD FOR -->
                                    <div style="
                                        font-size:36px;
                                        font-weight:700;
                                        margin-bottom:15px;
                                    ">
                                        Area Head For
                                    </div>

                                    <!-- COUNTRY → VILLAGE -->
                                    <div style="font-size:24px; line-height:1.25;">
                                        ${areaListHTML}
                                    </div>

                                </div>

                            </div>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>

                        <button class="btn btn-primary" onclick="downloadIDCardAsImage('${name}', '${phone}', '${photo}')">
                            <i class="fas fa-download me-2"></i>Download
                        </button>
                    </div>

                </div>
            </div>
        </div>
        `;

        const existing = document.getElementById("idCardModal");
        if (existing) existing.remove();

        document.body.insertAdjacentHTML("beforeend", modalHTML);
        
        // Remove loading overlay
        const loadingOverlay = document.getElementById('idCardLoadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
        
        new bootstrap.Modal(document.getElementById("idCardModal")).show();

    } catch (err) {
        // Remove loading overlay on error
        const loadingOverlay = document.getElementById('idCardLoadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
        alert("Error loading card.");
    }
}



async function downloadIDCardAsImage(name) {
    const element = document.getElementById("idCardContent");
    
    // Temporarily remove the scale transform to capture full-size image
    const originalTransform = element.style.transform;
    element.style.transform = 'none';
    
    // Wait for browser to reflow
    await new Promise(resolve => setTimeout(resolve, 100));

    // Get actual element dimensions
    const actualHeight = element.scrollHeight || element.offsetHeight;
    
    const canvas = await html2canvas(element, {
        scale: 2,
        width: 720,
        height: actualHeight,
        backgroundColor: "#ffffff",
        useCORS: true,
        windowHeight: actualHeight,
        scrollY: -window.scrollY,
        scrollX: -window.scrollX
    });

    // Restore the original transform
    element.style.transform = originalTransform;

    const url = canvas.toDataURL("image/png");

    const link = document.createElement("a");
    link.href = url;
    link.download = `ID_Card_${name}.png`;
    link.click();
}


// Download ID Card as PDF (landscape)
// async function downloadIDCard(name, phone, photo, personCode) {
//     try {
//         const element = document.getElementById('idCardContent');

//         if (!element) {
//             alert('ID Card content not found. Please try again.');
//             return;
//         }

//         // Show loading message
//         const downloadBtn = event.target;
//         const originalText = downloadBtn.innerHTML;
//         downloadBtn.disabled = true;
//         downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating PDF...';

//         console.log('🎨 Starting PDF generation...');
//         console.log('📋 Name:', name, 'Phone:', phone, 'Partner ID:', personCode);

//         // Convert all images to base64 to avoid CORS issues
//         const images = element.querySelectorAll('img');
//         console.log('🖼️ Found', images.length, 'images to process');

//         for (let i = 0; i < images.length; i++) {
//             const img = images[i];
//             console.log(`🔄 Processing image ${i + 1}:`, img.src.substring(0, 50) + '...');

//             try {
//                 // If it's already base64, skip
//                 if (img.src.startsWith('data:')) {
//                     console.log(`✓ Image ${i + 1} already base64`);
//                     continue;
//                 }

//                 // Convert to base64
//                 const canvas = document.createElement('canvas');
//                 const ctx = canvas.getContext('2d');

//                 // Wait for image to load
//                 await new Promise((resolve, reject) => {
//                     if (img.complete && img.naturalWidth > 0) {
//                         resolve();
//                     } else {
//                         img.onload = () => resolve();
//                         img.onerror = () => reject(new Error('Image failed to load'));
//                         setTimeout(() => reject(new Error('Image load timeout')), 5000);
//                     }
//                 });

//                 canvas.width = img.naturalWidth || img.width;
//                 canvas.height = img.naturalHeight || img.height;
//                 ctx.drawImage(img, 0, 0);

//                 // Convert to base64
//                 const base64 = canvas.toDataURL('image/jpeg', 0.95);
//                 img.src = base64;
//                 console.log(`✅ Image ${i + 1} converted to base64 (${base64.length} chars)`);

//             } catch (imgError) {
//                 console.warn(`⚠️ Failed to convert image ${i + 1}:`, imgError.message);
//                 // Use placeholder for failed images
//                 img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNzUiIGN5PSI3NSIgcj0iNzUiIGZpbGw9IiNlMmU4ZjAiLz48L3N2Zz4=';
//             }
//         }

//         console.log('⏳ Waiting for DOM to settle...');
//         await new Promise(resolve => setTimeout(resolve, 1500));

//         console.log('📄 Generating PDF with html2pdf...');

//         // Standard ID card size: 90mm × 54mm
//         // At 300 DPI: 1063px × 638px
//         // We'll use half scale for reasonable file size: 850px × 510px
//         const opt = {
//             margin: 0,
//             filename: `ID_Card_${name.replace(/\s+/g, '_')}_${Date.now()}.pdf`,
//             image: { type: 'jpeg', quality: 1.0 },
//             html2canvas: { 
//                 scale: 2,
//                 useCORS: true,
//                 allowTaint: true,
//                 logging: true,
//                 letterRendering: true,
//                 imageTimeout: 0,
//                 backgroundColor: null,
//                 removeContainer: true,
//                 scrollY: 0,
//                 scrollX: 0,
//                 width: 850,
//                 height: 510
//             },
//             jsPDF: { 
//                 unit: 'mm',
//                 format: [90, 54],
//                 orientation: 'landscape'
//             },
//             pagebreak: { mode: 'avoid-all' }
//         };

//         // Generate PDF
//         const worker = html2pdf().set(opt).from(element);
//         await worker.save();

//         console.log('✅ PDF generated and downloaded successfully!');

//         // Restore button
//         downloadBtn.disabled = false;
//         downloadBtn.innerHTML = originalText;

//         // Show success notification
//         showNotification('ID Card PDF downloaded successfully!', 'success');

//     } catch (error) {
//         console.error('❌ Error downloading ID card:', error);
//         console.error('Error stack:', error.stack);

//         alert('❌ Error downloading ID card: ' + error.message + '\n\nPlease check:\n1. Images are loading properly\n2. Browser console for detailed errors\n3. Try again after refreshing the page');

//         // Restore button if error occurs
//         if (event && event.target) {
//             event.target.disabled = false;
//             event.target.innerHTML = '<i class="fas fa-download me-2"></i>Download as PDF';
//         }
//     }
// }

// Phone number search for referral dropdown
let searchTimeout;
document.addEventListener('DOMContentLoaded', function () {
    const introducedByInput = document.getElementById('introducedBy');
    const dropdown = document.getElementById('referralDropdown');

    if (introducedByInput && dropdown) {
        // Hide dropdown when clicking outside
        document.addEventListener('click', function (e) {
            if (!introducedByInput.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });

        // Search as user types
        introducedByInput.addEventListener('input', async function (e) {
            const searchTerm = e.target.value.trim();

            // Clear previous timeout
            clearTimeout(searchTimeout);

            // Hide dropdown if search is empty or too short
            if (searchTerm.length < 1) {
                dropdown.style.display = 'none';
                return;
            }

            // Debounce search
            searchTimeout = setTimeout(async () => {
                try {
                    // Fetch all approved applications to get phone numbers and names
                    const response = await fetch(`${API_BASE_URL}/dynamic-positions?country=India`, {
                        method: 'GET',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Cache-Control': 'no-cache'
                        }
                    });

                    if (!response.ok) {
                        console.error('Failed to fetch users');
                        dropdown.style.display = 'none';
                        return;
                    }

                    const data = await response.json();
                    const positions = data.positions || data || [];

                    // Extract unique users with phone and name from applicantDetails
                    const usersMap = new Map();
                    positions.forEach(position => {
                        if (position.applicantDetails && position.applicantDetails.phone) {
                            const phone = position.applicantDetails.phone;
                            const name = position.applicantDetails.name || 'Unknown';
                            const introducedCount = position.applicantDetails.introducedCount || 0;
                            
                            // Only add if not already in map (avoid duplicates)
                            if (!usersMap.has(phone)) {
                                usersMap.set(phone, { phone, name, introducedCount });
                            }
                        }
                    });

                    // Convert map to array and filter by search term
                    const allUsers = Array.from(usersMap.values());
                    const matchingUsers = allUsers.filter(user =>
                        user.phone.includes(searchTerm) || 
                        (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    ).slice(0, 10); // Limit to 10 results

                    if (matchingUsers.length === 0) {
                        dropdown.innerHTML = '<div class="dropdown-item text-muted">No matching users found</div>';
                        dropdown.style.display = 'block';
                        dropdown.classList.add('show');
                        return;
                    }

                    // Build dropdown HTML with better formatting
                    const dropdownHTML = matchingUsers.map(user => `
                        <a href="#" class="dropdown-item py-2 px-3" onclick="selectReferrer('${user.phone}', '${user.name.replace(/'/g, "\\'")}'); return false;" style="border-bottom: 1px solid #f0f0f0;">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <div><strong>${user.phone}</strong></div>
                                    <div class="text-muted small">${user.name}</div>
                                </div>
                                <div class="text-end">
                                    <span class="badge bg-success" style="font-size: 0.7rem;">
                                        ${user.introducedCount} referrals
                                    </span>
                                </div>
                            </div>
                        </a>
                    `).join('');

                    dropdown.innerHTML = dropdownHTML;
                    dropdown.style.display = 'block';
                    dropdown.classList.add('show');

                } catch (error) {
                    console.error('Error searching users:', error);
                    dropdown.style.display = 'none';
                }
            }, 300);
        });
    }
});

// Select referrer from dropdown
function selectReferrer(phone, name) {
    const introducedByInput = document.getElementById('introducedBy');
    const dropdown = document.getElementById('referralDropdown');

    if (introducedByInput) {
        introducedByInput.value = phone;
        introducedByInput.setAttribute('data-referrer-name', name);
    }

    if (dropdown) {
        dropdown.style.display = 'none';
    }
}

// Open Promotion Page with sessionStorage (avoids URI_TOO_LONG error)
function openPromotion(userId, name, phone, photo, location, designation) {
    // Store promotion data in sessionStorage (NOT in URL - photos are too large)
    const promotionData = {
        userId: userId,
        name: name,
        phone: phone,
        photo: photo,
        country: location?.country || 'India',
        zone: location?.zone || '',
        state: location?.state || '',
        division: location?.division || '',
        district: location?.district || '',
        designation: designation
    };
    
    console.log('📦 Storing promotion data in sessionStorage:', promotionData);
    sessionStorage.setItem('promotionData', JSON.stringify(promotionData));
    window.location.href = 'promotion.html';
}

// ====================================
// FORGOT PASSWORD FUNCTIONALITY
// ====================================

// Initialize forgot password on page load
if (document.getElementById('forgotPasswordLink')) {
    document.getElementById('forgotPasswordLink').addEventListener('click', function(e) {
        e.preventDefault();
        const modal = new bootstrap.Modal(document.getElementById('forgotPasswordModal'));
        modal.show();
    });
}

// Send OTP for password reset
async function sendResetOTP() {
    const phone = document.getElementById('resetPhone').value.trim();
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const resetAlert = document.getElementById('resetAlert');
    
    // Validate phone number
    if (!phone || phone.length !== 10 || !/^\d{10}$/.test(phone)) {
        showResetAlert('Please enter a valid 10-digit phone number', 'danger');
        return;
    }
    
    // Show loading state
    sendOtpBtn.disabled = true;
    sendOtpBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/forgot-password/request-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phone })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show OTP in console for development (remove in production)
            if (result._debug?.otp) {
                console.log('🔐 Development OTP:', result._debug.otp);
            }
            
            showResetAlert('OTP sent successfully to ' + phone, 'success');
            
            // Switch to verify step
            setTimeout(() => {
                document.getElementById('requestOtpStep').style.display = 'none';
                document.getElementById('verifyOtpStep').style.display = 'block';
                document.getElementById('sentToPhone').textContent = phone;
                resetAlert.style.display = 'none';
            }, 1500);
        } else {
            showResetAlert(result.error || 'Failed to send OTP', 'danger');
            sendOtpBtn.disabled = false;
            sendOtpBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Send OTP';
        }
    } catch (error) {
        console.error('❌ Error sending OTP:', error);
        showResetAlert('Network error. Please try again.', 'danger');
        sendOtpBtn.disabled = false;
        sendOtpBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Send OTP';
    }
}

// Reset password with OTP verification
async function resetPassword(event) {
    event.preventDefault();
    
    const phone = document.getElementById('resetPhone').value.trim();
    const otp = document.getElementById('otpCode').value.trim();
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const resetBtn = document.getElementById('resetBtn');
    
    // Validate passwords match
    if (newPassword !== confirmPassword) {
        showResetAlert('Passwords do not match', 'danger');
        return;
    }
    
    // Validate password length
    if (newPassword.length < 6) {
        showResetAlert('Password must be at least 6 characters long', 'danger');
        return;
    }
    
    // Validate OTP
    if (!otp || otp.length !== 6) {
        showResetAlert('Please enter a valid 6-digit OTP', 'danger');
        return;
    }
    
    // Show loading state
    resetBtn.disabled = true;
    resetBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Resetting...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/forgot-password/reset`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phone,
                otp,
                newPassword
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showResetAlert('Password reset successfully! Redirecting to login...', 'success');
            
            // Close modal and clear fields after 2 seconds
            setTimeout(() => {
                const modal = bootstrap.Modal.getInstance(document.getElementById('forgotPasswordModal'));
                modal.hide();
                resetForgotPasswordForm();
                
                // Auto-fill phone in login if on login page
                if (document.getElementById('phone')) {
                    document.getElementById('phone').value = phone;
                }
            }, 2000);
        } else {
            showResetAlert(result.error || 'Failed to reset password', 'danger');
            resetBtn.disabled = false;
            resetBtn.innerHTML = '<i class="fas fa-check me-2"></i>Reset Password';
        }
    } catch (error) {
        console.error('❌ Error resetting password:', error);
        showResetAlert('Network error. Please try again.', 'danger');
        resetBtn.disabled = false;
        resetBtn.innerHTML = '<i class="fas fa-check me-2"></i>Reset Password';
    }
}

// Show alert in forgot password modal
function showResetAlert(message, type) {
    const resetAlert = document.getElementById('resetAlert');
    resetAlert.className = `alert alert-${type} mt-3`;
    resetAlert.textContent = message;
    resetAlert.style.display = 'block';
    
    // Auto-hide success messages
    if (type === 'success') {
        setTimeout(() => {
            resetAlert.style.display = 'none';
        }, 3000);
    }
}

// Back to request OTP step
function backToRequestOtp() {
    document.getElementById('verifyOtpStep').style.display = 'none';
    document.getElementById('requestOtpStep').style.display = 'block';
    document.getElementById('resetAlert').style.display = 'none';
    
    // Re-enable send OTP button
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    sendOtpBtn.disabled = false;
    sendOtpBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Send OTP';
}

// Reset forgot password form
function resetForgotPasswordForm() {
    document.getElementById('resetPhone').value = '';
    document.getElementById('otpCode').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    document.getElementById('requestOtpStep').style.display = 'block';
    document.getElementById('verifyOtpStep').style.display = 'none';
    document.getElementById('resetAlert').style.display = 'none';
    
    // Reset buttons
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    sendOtpBtn.disabled = false;
    sendOtpBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Send OTP';
    
    const resetBtn = document.getElementById('resetBtn');
    resetBtn.disabled = false;
    resetBtn.innerHTML = '<i class="fas fa-check me-2"></i>Reset Password';
}

// Reset form when modal is closed
if (document.getElementById('forgotPasswordModal')) {
    document.getElementById('forgotPasswordModal').addEventListener('hidden.bs.modal', resetForgotPasswordForm);
}

