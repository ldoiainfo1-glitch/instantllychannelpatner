// Configuration - Updated for Vercel deployment fix
const API_BASE_URL = 'https://instantllychannelpatner.onrender.com/api';

// Global variables
let currentPositions = [];
let locationData = {};
let locationDataLoaded = false; // Track if location data is loaded
let isAdmin = false;

console.log('🚀 Instantly Channel Partner App - v1.0.2 - Frontend Ready');

// Store auth token
let authToken = localStorage.getItem('authToken');
let currentUser = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
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
    document.getElementById('clearFilters').addEventListener('click', clearFilters);
    
    // Setup searchable filters
    setupSearchableFilters();
    
    // Application form
    document.getElementById('submitApplication').addEventListener('click', submitApplication);
    
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
        console.log('⚡ Loading location data in background...');
        
        // Try new optimized endpoint first
        let response = await fetch(`${API_BASE_URL}/locations/all`);
        
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
            console.log('⚠️ Using fallback: loading from individual endpoints...');
            
            const [zonesRes, statesRes, divisionsRes, districtsRes, tehsilsRes, pincodesRes, villagesRes] = await Promise.all([
                fetch(`${API_BASE_URL}/locations/zones`),
                fetch(`${API_BASE_URL}/locations/states`),
                fetch(`${API_BASE_URL}/locations/divisions`),
                fetch(`${API_BASE_URL}/locations/districts`),
                fetch(`${API_BASE_URL}/locations/tehsils`),
                fetch(`${API_BASE_URL}/locations/pincodes`),
                fetch(`${API_BASE_URL}/locations/villages`)
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
        
        const url = `${API_BASE_URL}/dynamic-positions?${params.toString()}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const positions = await response.json();
        
        // Store positions directly - they are already formatted with application data
        currentPositions = positions.map((pos, index) => ({
            ...pos,
            sNo: index + 1 // Ensure sequential numbering
        }));
        
        displayPositions(currentPositions);
        
        // Update selected filters display
        updateSelectedFiltersBadges();
    } catch (error) {
        console.error('❌ Error loading applications:', error);
        showNotification('Error loading applications: ' + error.message, 'error');
        
        // Show error in table
        const tbody = document.getElementById('positionsTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-4 text-danger">
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
                <td colspan="9" class="text-center py-4">
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
    
    // Handle name - show applicant name or Apply button with Position ID below
    let nameCell = '';
    if (position.status === 'Available') {
        nameCell = `
            <div>
                <button class="btn btn-success btn-sm" onclick="openApplicationModal('${position._id}', '${position.designation}', ${JSON.stringify(position.location).replace(/"/g, '&quot;')})">
                    <i class="fas fa-plus me-1"></i>Apply Now
                </button>
                <div class="mt-2">
                    <small class="text-muted d-block" style="font-size: 0.75rem;">ID: ${position._id}</small>
                </div>
            </div>
        `;
    } else if (position.applicantDetails && position.applicantDetails.name) {
        nameCell = `
            <div>
                <div>${position.applicantDetails.name}</div>
                <small class="text-muted" style="font-size: 0.75rem;">ID: ${position._id}</small>
            </div>
        `;
    } else {
        nameCell = '-';
    }
    
    // Determine Area Head For - show most specific location area name (district, tehsil, etc.)
    let areaHeadFor = '-';
    if (position.location) {
        // Prioritize most specific location first (village > pincode > tehsil > district > division > state > zone > country)
        if (position.location.village) {
            areaHeadFor = position.location.village.toUpperCase();
        } else if (position.location.pincode) {
            areaHeadFor = position.location.pincode;
        } else if (position.location.tehsil) {
            areaHeadFor = position.location.tehsil.toUpperCase();
        } else if (position.location.district) {
            areaHeadFor = position.location.district.toUpperCase();
        } else if (position.location.division) {
            areaHeadFor = position.location.division.toUpperCase();
        } else if (position.location.state) {
            areaHeadFor = position.location.state.toUpperCase();
        } else if (position.location.zone) {
            areaHeadFor = position.location.zone.toUpperCase();
        } else if (position.location.country) {
            areaHeadFor = position.location.country.toUpperCase();
        }
    }

    // Handle photo
    let photoCell = '';
    if (position.applicantDetails && position.applicantDetails.photo) {
        // Photo is now stored as base64 in MongoDB
        photoCell = `<img src="${position.applicantDetails.photo}" 
                         alt="${position.applicantDetails.name || 'Applicant'}" 
                         class="rounded-circle"
                         style="width: 50px; height: 50px; object-fit: cover;"
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjUiIGN5PSIyNSIgcj0iMjUiIGZpbGw9IiNlMmU4ZjAiLz4KPHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iMzAiIHZpZXdCb3g9IjAgMCAzMCAzMCIgZmlsbD0ibm9uZSIgeG1zbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSIxMCIgeT0iMTAiPgo8cGF0aCBkPSJNMTUgMTVDMTcuNzYxNCAxNSAyMCAxMi43NjE0IDIwIDEwQzIwIDcuMjM4NTggMTcuNzYxNCA1IDE1IDVDMTIuMjM4NiA1IDEwIDcuMjM4NTggMTAgMTBDMTAgMTIuNzYxNCAxMi4yMzg2IDE1IDE1IDE1WiIgZmlsbD0iIzYzNjM3NiIvPgo8cGF0aCBkPSJNMTUgMTdDMTEuNjY1IDUgOC41IDcuOTE2MjUgOC41IDExLjVWMjFIMjEuNVYxMS41QzIxLjUgNy45MTYyNSAxOC4zMzUgMTcgMTUgMTdaIiBmaWxsPSIjNjM2Mzc2Ii8+Cjwvc3ZnPgo8L3N2Zz4=';">`;
    } else {
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
    
    // Others column - Actions dropdown
    let othersCell = '';
    
    // Show action button IMMEDIATELY when status is Approved (no payment required)
    // Status can be: "Available", "Pending", "Approved", "Verified", "Rejected"
    if (position.applicantDetails && (position.status === 'Approved' || position.status === 'Verified')) {
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
                        <a class="dropdown-item" href="#" onclick="showIDCard('${name}', '${phone}', '${photo}', '${position._id}'); return false;">
                            <i class="fas fa-id-card me-2"></i>ID Card
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
    const searchName = document.getElementById('searchName').value.toLowerCase();
    const searchPhone = document.getElementById('searchPhone').value;
    const country = document.getElementById('filterCountry').value || 'India';
    const zone = document.getElementById('filterZone').value;
    const state = document.getElementById('filterState').value;
    const division = document.getElementById('filterDivision').value;
    const district = document.getElementById('filterDistrict').value;
    const tehsil = document.getElementById('filterTehsil').value;
    const pincode = document.getElementById('filterPincode').value;
    const village = document.getElementById('filterVillage').value;
    
    try {
        showLoading(true);
        
        // Build query params
        let queryParams = [`country=${country}`];
        if (zone) queryParams.push(`zone=${zone}`);
        if (state) queryParams.push(`state=${state}`);
        if (division) queryParams.push(`division=${division}`);
        if (district) queryParams.push(`district=${district}`);
        if (tehsil) queryParams.push(`tehsil=${tehsil}`);
        if (pincode) queryParams.push(`pincode=${pincode}`);
        if (village) queryParams.push(`village=${village}`);
        
        const url = `${API_BASE_URL}/positions?${queryParams.join('&')}`;
        const response = await fetch(url);
        currentPositions = await response.json();
        
        // Client-side filter for name and phone
        let filteredPositions = currentPositions;
        if (searchName || searchPhone) {
            filteredPositions = currentPositions.filter(position => {
                // Name search
                if (searchName && position.applicantDetails && 
                    !position.applicantDetails.name.toLowerCase().includes(searchName)) {
                    return false;
                }
                
                // Phone search
                if (searchPhone && position.applicantDetails && 
                    !position.applicantDetails.phone.includes(searchPhone)) {
                    return false;
                }
                
                return true;
            });
        }
        
        displayPositions(filteredPositions);
        
        // Show search results count
        showNotification(`Found ${filteredPositions.length} positions`, 'info');
    } catch (error) {
        console.error('Error searching positions:', error);
        showNotification('Error searching positions', 'error');
    } finally {
        showLoading(false);
    }
}

// Clear all filters
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

// Open application modal for applying to positions
function openApplicationModal(positionId, positionTitle, location) {
    console.log('🎯 Opening application modal for position ID:', positionId, 'Title:', positionTitle);
    
    // Store current position details for form submission
    window.currentPosition = {
        id: positionId, // This is the unique position ID from dynamic-positions
        title: positionTitle,
        location: location
    };
    
    // Update modal title
    document.querySelector('#applicationModal .modal-title').textContent = `Apply for: ${positionTitle}`;
    
    // Reset and show the application form
    document.getElementById('applicationForm').reset();
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('applicationModal'));
    modal.show();
}

// Submit application
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
    
    // Set position ID in the hidden form field BEFORE creating FormData
    document.getElementById('positionId').value = window.currentPosition.id;
    
    // Now create FormData with the correct position ID
    const formData = new FormData(form);
    
    // Validate form
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Submitting...';
        
        // Add additional fields that aren't in the form
        formData.append('positionTitle', window.currentPosition.title);
        
        // Add location data from the position
        const location = window.currentPosition.location;
        if (location.country) formData.append('country', location.country);
        if (location.zone) formData.append('zone', location.zone);
        if (location.state) formData.append('state', location.state);
        if (location.division) formData.append('division', location.division);
        if (location.district) formData.append('district', location.district);
        if (location.tehsil) formData.append('tehsil', location.tehsil);
        if (location.pincode) formData.append('pincode', location.pincode);
        if (location.village) formData.append('village', location.village);
        
        console.log('📝 Submitting application with location data:', location);
        console.log('📝 Position ID being sent:', window.currentPosition.id);
        console.log('📝 FormData entries:');
        for (let [key, value] of formData.entries()) {
            console.log(`   ${key}: ${value instanceof File ? `File: ${value.name}` : value}`);
        }
        
        const response = await fetch(`${API_BASE_URL}/applications`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Close modal immediately
            const modalElement = document.getElementById('applicationModal');
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }
            
            // Reset form
            form.reset();
            
            // Show success notification
            showNotification('✅ Application submitted successfully! Reloading page...', 'success');
            
            // Clear current position
            window.currentPosition = null;
            
            // Force reload the entire page after a short delay (hard reload to bypass cache)
            setTimeout(() => {
                window.location.reload(true);
            }, 1500);
        } else {
            throw new Error(result.error || 'Failed to submit application');
        }
    } catch (error) {
        console.error('❌ Error submitting application:', error);
        showNotification(error.message || 'Error submitting application', 'error');
        
        // Re-enable submit button on error
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Submit Application';
        }
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
        star.addEventListener('click', function() {
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
        
        star.addEventListener('mouseover', function() {
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
        ratingStarsContainer.addEventListener('mouseleave', function() {
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
                profilePhoto.src = user.photo;
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
            // Setup input click to show dropdown
            input.addEventListener('click', (e) => {
                e.preventDefault();
                showFilterDropdown(filter.id, filter.dropdown, filter.dataKey);
            });

            // Setup input focus to show dropdown
            input.addEventListener('focus', () => {
                showFilterDropdown(filter.id, filter.dropdown, filter.dataKey);
            });

            // Setup hover to show dropdown
            input.addEventListener('mouseenter', () => {
                if (!dropdown.classList.contains('show')) {
                    showFilterDropdown(filter.id, filter.dropdown, filter.dataKey);
                }
            });

            // Setup clear button
            clearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                clearSingleFilter(filter.id, filter.clear);
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!input.contains(e.target) && !dropdown.contains(e.target)) {
                    hideFilterDropdown(filter.dropdown);
                }
            });

            // Close dropdown on scroll to prevent positioning issues
            window.addEventListener('scroll', () => {
                if (dropdown.classList.contains('show')) {
                    hideFilterDropdown(filter.dropdown);
                }
            });
        }
    });
}

// Get filtered data based on parent filter selections (cascading filters)
function getFilteredDataBasedOnParents(inputId, dataKey, allData) {
    // Get current filter values from parent filters
    const selectedZone = document.getElementById('filterZone').value;
    const selectedState = document.getElementById('filterState').value;
    const selectedDivision = document.getElementById('filterDivision').value;
    const selectedDistrict = document.getElementById('filterDistrict').value;
    const selectedTehsil = document.getElementById('filterTehsil').value;
    const selectedPincode = document.getElementById('filterPincode').value;

    // If no positions data loaded yet, return all data
    if (!currentPositions || currentPositions.length === 0) {
        console.log('⚠️ No positions loaded yet, showing all options for', dataKey);
        return allData;
    }

    // Filter positions based on parent selections
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
    
    console.log(`🔍 Cascading filter for ${inputId}: ${filteredData.length} options (from ${filteredPositions.length} matching positions)`);
    
    // Important: If filtering resulted in matches but no unique values for this specific field,
    // that means the data exists but this field might not be populated for those positions
    // In that case, return all data as fallback
    if (filteredPositions.length > 0 && filteredData.length === 0) {
        console.log(`  ⚠️ ${filteredPositions.length} positions match parents but have no ${fieldName} data, showing all options`);
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

    // Get filtered data based on parent selections (cascading filters)
    let data = getFilteredDataBasedOnParents(inputId, dataKey, locationData[dataKey]);
    console.log(`✅ Showing dropdown for ${dataKey}:`, data.length, 'items (filtered by parent selections)');
    
    // Only create dropdown content if it doesn't exist or data changed
    if (!dropdown.dataset.initialized || dropdown.dataset.dataKey !== dataKey) {
        dropdown.innerHTML = `
            <input type="text" class="filter-search-input" placeholder="Type to search..." id="search_${inputId}" autocomplete="off">
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

    // Focus on search input
    setTimeout(() => newSearchInput.focus(), 10);
    
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

    // Setup click handlers for options
    container.querySelectorAll('.filter-dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
            selectFilterOption(inputId, dropdownId, item.dataset.value);
        });
    });
}

// Select a filter option
function selectFilterOption(inputId, dropdownId, value) {
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
    
    // Perform reverse mapping to auto-populate parent fields
    performReverseMapping(inputId, value);
    
    // Update selected filters display
    updateSelectedFiltersBadges();
    
    // Trigger filter update
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
async function showIDCard(name, phone, photo, positionId) {
    try {
        // Fetch user details
        const response = await fetch(`${API_BASE_URL}/admin/test-user/${phone}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            alert('User details not found.');
            return;
        }
        
        const user = await response.json();
        // Use personCode if available, otherwise use applicationId
        const partnerId = user.personCode || user.applicationId || 'N/A';
        
        // Create modal with ID card
        const modalHTML = `
            <div class="modal fade" id="idCardModal" tabindex="-1">
                <div class="modal-dialog modal-lg modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title">
                                <i class="fas fa-id-card me-2"></i>Channel Partner ID Card
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body p-0">
                            <!-- Standard ID Card Size: 90mm × 54mm (850px × 510px for display) -->
                            <div id="idCardContent" style="background: linear-gradient(135deg, #0066cc 0%, #00a8ff 50%, #ffa500 100%); padding: 20px; width: 850px; height: 510px; margin: 0 auto;">
                                <!-- Landscape ID Card Design - 2 SECTIONS ONLY -->
                                <div style="background: white; border-radius: 15px; padding: 20px; width: 100%; height: 100%; box-shadow: 0 10px 40px rgba(0,0,0,0.3); display: flex; align-items: stretch; gap: 25px;">
                                    
                                    <!-- LEFT SECTION: Logo (Top) + Photo (Middle) + Company Name (Bottom) -->
                                    <div style="flex: 0 0 220px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 10px 0;">
                                        <!-- Logo at Top -->
                                        <img src="images/logo.jpeg" alt="Instantlly Cards Logo" style="width: 140px; height: 140px; object-fit: contain; border-radius: 15px;">
                                        
                                        <!-- Photo in Middle -->
                                        <img src="${photo || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNzUiIGN5PSI3NSIgcj0iNzUiIGZpbGw9IiNlMmU4ZjAiLz48L3N2Zz4='}" 
                                             alt="${name}" 
                                             style="width: 150px; height: 170px; object-fit: cover; border-radius: 15px; border: 4px solid #0066cc;">
                                        
                                        <!-- Company Name at Bottom -->
                                        <div style="width: 100%;">
                                            <h6 style="margin: 0; margin-bottom: 5px; color: #0066cc; font-weight: bold; font-size: 1.1rem; line-height: 1.2;">INSTANTLLY CARDS</h6>
                                            <small style="color: #ffa500; font-size: 0.9rem; font-weight: 600;">Channel Partner</small>
                                        </div>
                                    </div>
                                    
                                    <!-- RIGHT SECTION: User Details -->
                                    <div style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
                                        <!-- Name -->
                                        <h3 style="color: #333; font-weight: bold; margin: 0 0 25px 0; font-size: 1.8rem; line-height: 1.2;">${name}</h3>
                                        
                                        <!-- Details List -->
                                        <div style="margin-bottom: 15px;">
                                            <i class="fas fa-phone" style="color: #0066cc; width: 25px; font-size: 1rem;"></i>
                                            <strong style="font-size: 1rem;">Phone:</strong> <span style="font-size: 1rem;">${phone}</span>
                                        </div>
                                        <div style="margin-bottom: 15px;">
                                            <i class="fas fa-id-badge" style="color: #ffa500; width: 25px; font-size: 1rem;"></i>
                                            <strong style="font-size: 1rem;">Partner ID:</strong> <span style="font-size: 1rem;">${partnerId}</span>
                                        </div>
                                        <div style="margin-bottom: 20px;">
                                            <i class="fas fa-calendar" style="color: #00a8ff; width: 25px; font-size: 1rem;"></i>
                                            <strong style="font-size: 1rem;">Joined:</strong> <span style="font-size: 1rem;">${new Date().toLocaleDateString()}</span>
                                        </div>
                                        
                                        <!-- Authorized Badge -->
                                        <div style="background: linear-gradient(135deg, #0066cc 0%, #ffa500 100%); color: white; padding: 12px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
                                            <strong style="font-size: 1rem; letter-spacing: 0.5px;">AUTHORIZED CHANNEL PARTNER</strong>
                                        </div>
                                        
                                        <!-- Footer -->
                                        <div style="padding-top: 15px; border-top: 2px solid #0066cc;">
                                            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                                                <small style="color: #666; font-size: 0.8rem;">
                                                    <i class="fas fa-globe me-1"></i>
                                                    www.instantllycards.com
                                                </small>
                                                <small style="color: #666; font-size: 0.8rem;">
                                                    <i class="fas fa-envelope me-1"></i>
                                                    instantllycardsonlinemeeting@gmail.com
                                                </small>
                                            </div>
                                        </div>
                                    </div>
                                    
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary" onclick="downloadIDCard('${name}', '${phone}', '${photo}', '${partnerId}')">
                                <i class="fas fa-download me-2"></i>Download as PDF
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('idCardModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('idCardModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error showing ID card:', error);
        alert('Error loading ID card. Please try again.');
    }
}

// Download ID Card as PDF (landscape)
async function downloadIDCard(name, phone, photo, personCode) {
    try {
        const element = document.getElementById('idCardContent');
        
        if (!element) {
            alert('ID Card content not found. Please try again.');
            return;
        }
        
        // Show loading message
        const downloadBtn = event.target;
        const originalText = downloadBtn.innerHTML;
        downloadBtn.disabled = true;
        downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating PDF...';
        
        console.log('🎨 Starting PDF generation...');
        console.log('📋 Name:', name, 'Phone:', phone, 'Partner ID:', personCode);
        
        // Convert all images to base64 to avoid CORS issues
        const images = element.querySelectorAll('img');
        console.log('🖼️ Found', images.length, 'images to process');
        
        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            console.log(`🔄 Processing image ${i + 1}:`, img.src.substring(0, 50) + '...');
            
            try {
                // If it's already base64, skip
                if (img.src.startsWith('data:')) {
                    console.log(`✓ Image ${i + 1} already base64`);
                    continue;
                }
                
                // Convert to base64
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Wait for image to load
                await new Promise((resolve, reject) => {
                    if (img.complete && img.naturalWidth > 0) {
                        resolve();
                    } else {
                        img.onload = () => resolve();
                        img.onerror = () => reject(new Error('Image failed to load'));
                        setTimeout(() => reject(new Error('Image load timeout')), 5000);
                    }
                });
                
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                ctx.drawImage(img, 0, 0);
                
                // Convert to base64
                const base64 = canvas.toDataURL('image/jpeg', 0.95);
                img.src = base64;
                console.log(`✅ Image ${i + 1} converted to base64 (${base64.length} chars)`);
                
            } catch (imgError) {
                console.warn(`⚠️ Failed to convert image ${i + 1}:`, imgError.message);
                // Use placeholder for failed images
                img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNzUiIGN5PSI3NSIgcj0iNzUiIGZpbGw9IiNlMmU4ZjAiLz48L3N2Zz4=';
            }
        }
        
        console.log('⏳ Waiting for DOM to settle...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        console.log('📄 Generating PDF with html2pdf...');
        
        // Standard ID card size: 90mm × 54mm
        // At 300 DPI: 1063px × 638px
        // We'll use half scale for reasonable file size: 850px × 510px
        const opt = {
            margin: 0,
            filename: `ID_Card_${name.replace(/\s+/g, '_')}_${Date.now()}.pdf`,
            image: { type: 'jpeg', quality: 1.0 },
            html2canvas: { 
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: true,
                letterRendering: true,
                imageTimeout: 0,
                backgroundColor: null,
                removeContainer: true,
                scrollY: 0,
                scrollX: 0,
                width: 850,
                height: 510
            },
            jsPDF: { 
                unit: 'mm',
                format: [90, 54],
                orientation: 'landscape'
            },
            pagebreak: { mode: 'avoid-all' }
        };
        
        // Generate PDF
        const worker = html2pdf().set(opt).from(element);
        await worker.save();
        
        console.log('✅ PDF generated and downloaded successfully!');
        
        // Restore button
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = originalText;
        
        // Show success notification
        showNotification('ID Card PDF downloaded successfully!', 'success');
        
    } catch (error) {
        console.error('❌ Error downloading ID card:', error);
        console.error('Error stack:', error.stack);
        
        alert('❌ Error downloading ID card: ' + error.message + '\n\nPlease check:\n1. Images are loading properly\n2. Browser console for detailed errors\n3. Try again after refreshing the page');
        
        // Restore button if error occurs
        if (event && event.target) {
            event.target.disabled = false;
            event.target.innerHTML = '<i class="fas fa-download me-2"></i>Download as PDF';
        }
    }
}

// Phone number search for referral dropdown
let searchTimeout;
document.addEventListener('DOMContentLoaded', function() {
    const introducedByInput = document.getElementById('introducedBy');
    const dropdown = document.getElementById('referralDropdown');
    
    if (introducedByInput && dropdown) {
        // Hide dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!introducedByInput.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
        
        // Search as user types
        introducedByInput.addEventListener('input', async function(e) {
            const searchTerm = e.target.value.trim();
            
            // Clear previous timeout
            clearTimeout(searchTimeout);
            
            // Hide dropdown if search is empty or too short
            if (searchTerm.length < 2) {
                dropdown.style.display = 'none';
                return;
            }
            
            // Debounce search
            searchTimeout = setTimeout(async () => {
                try {
                    // Fetch all users and filter by phone containing search term
                    const response = await fetch(`${API_BASE_URL}/admin/users-stats`, {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    
                    if (!response.ok) {
                        console.error('Failed to fetch users');
                        return;
                    }
                    
                    const data = await response.json();
                    const users = data.users || [];
                    
                    // Filter users whose phone contains the search term
                    const matchingUsers = users.filter(user => 
                        user.phone && user.phone.includes(searchTerm)
                    ).slice(0, 10); // Limit to 10 results
                    
                    if (matchingUsers.length === 0) {
                        dropdown.style.display = 'none';
                        return;
                    }
                    
                    // Build dropdown HTML
                    const dropdownHTML = matchingUsers.map(user => `
                        <a href="#" class="dropdown-item py-2" onclick="selectReferrer('${user.phone}', '${user.name || 'Unknown'}'); return false;">
                            <div>
                                <strong>+91 ${user.phone}</strong>
                                <div class="text-muted small">${user.name || 'Unknown'}</div>
                            </div>
                        </a>
                    `).join('');
                    
                    dropdown.innerHTML = dropdownHTML;
                    dropdown.style.display = 'block';
                    dropdown.style.position = 'absolute';
                    dropdown.style.zIndex = '1000';
                    
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

