// Configuration - Updated for Vercel deployment fix
const API_BASE_URL = 'https://instantllychannelpatner.onrender.com/api';

// Global variables
let currentPositions = [];
let locationData = {};
let isAdmin = false;

// Store auth token
let authToken = localStorage.getItem('authToken');
let currentUser = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadLocationData();
    loadApplications();
    
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
    try {
        console.log('Loading location data...');
        
        // Load ALL location data from entire India
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
        
        // Store all options
        locationData = {
            zones: zones || [],
            states: states || [],
            divisions: divisions || [],
            districts: districts || [],
            tehsils: tehsils || [],
            pincodes: pincodes || [],
            villages: villages || []
        };
        
        // Populate all dropdowns with complete options
        populateAllDropdowns();
        
        console.log('Location data loaded successfully');
        console.log('Available zones:', locationData.zones.length);
        console.log('Available states:', locationData.states.length);
        console.log('Available divisions:', locationData.divisions.length);
        console.log('Available districts:', locationData.districts.length);
        console.log('Available tehsils:', locationData.tehsils.length);
        console.log('Available pincodes:', locationData.pincodes.length);
        console.log('Available villages:', locationData.villages.length);
    } catch (error) {
        console.error('Error loading location data:', error);
        showNotification('Error loading location data', 'error');
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
        showLoading(true);
        
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
        console.log('🔍 Loading dynamic positions for location:', url);
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const positions = await response.json();
        console.log('📊 Dynamic positions generated:', positions.length);
        
        // Store positions directly - they are already formatted with application data
        currentPositions = positions.map((pos, index) => ({
            ...pos,
            sNo: index + 1 // Ensure sequential numbering
        }));
        
        console.log('🎯 Positions loaded with application status:');
        currentPositions.forEach(pos => {
            const statusInfo = pos.status === 'Available' ? 'Available for Application' : 
                              pos.applicantDetails ? `Applied by ${pos.applicantDetails.name} (${pos.status})` : 'Available';
            console.log(`   - ${pos.designation}: ${statusInfo}`);
        });
        
        displayPositions(currentPositions);
    } catch (error) {
        console.error('❌ Error loading applications:', error);
        showNotification('Error loading applications: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Display positions in table
function displayPositions(positions) {
    const tbody = document.getElementById('positionsTableBody');
    tbody.innerHTML = '';
    
    if (positions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="text-center py-4">
                    <i class="fas fa-search fa-2x text-muted mb-3"></i>
                    <p class="text-muted">No positions found matching your criteria</p>
                </td>
            </tr>
        `;
        return;
    }
    
    positions.forEach(position => {
        const row = createPositionRow(position);
        tbody.appendChild(row);
    });
    
    // Add fade-in animation
    tbody.querySelectorAll('tr').forEach((row, index) => {
        setTimeout(() => {
            row.classList.add('fade-in-up');
        }, index * 50);
    });
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
    
    // Handle name - show applicant name or Apply button
    let nameCell = '';
    if (position.status === 'Available') {
        nameCell = `<button class="btn btn-success btn-sm" onclick="openApplicationModal('${position._id}', '${position.designation}', ${JSON.stringify(position.location).replace(/"/g, '&quot;')})">
                        <i class="fas fa-plus me-1"></i>Apply Now
                    </button>
                    <br><small class="text-muted mt-1">ID: ${position._id}</small>`;
    } else if (position.applicantDetails && position.applicantDetails.name) {
        nameCell = `${position.applicantDetails.name}<br><small class="text-muted">ID: ${position._id}</small>`;
    } else {
        nameCell = '-';
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
    
    // Handle introduced count
    const introducedBy = position.applicantDetails 
        ? `${position.applicantDetails.introducedBy || 'Self'} (${position.applicantDetails.introducedCount || 0})`
        : '-';
    
    // Handle days since application
    const days = position.applicantDetails && position.applicantDetails.days !== undefined 
        ? position.applicantDetails.days 
        : '-';
    
    // Others column - Actions dropdown (disabled until verified)
    let othersCell = '';
    
    // Check if user has paid and admin has verified
    const isPaidAndVerified = position.applicantDetails && 
                              position.applicantDetails.userId && 
                              position.applicantDetails.userId.paymentStatus === 'paid' && 
                              position.isVerified === true;
    
    if (isPaidAndVerified) {
        // Enabled Actions dropdown - after payment and verification
        othersCell = `
            <div class="dropdown">
                <button class="btn btn-sm btn-outline-primary dropdown-toggle" type="button" 
                        id="actionMenu${position._id}" data-bs-toggle="dropdown" aria-expanded="false">
                    Actions ▼
                </button>
                <ul class="dropdown-menu" aria-labelledby="actionMenu${position._id}">
                    <li>
                        <a class="dropdown-item" href="#" onclick="editProfile('${position._id}'); return false;">
                            <i class="fas fa-edit me-2"></i>Edit
                        </a>
                    </li>
                    <li>
                        <a class="dropdown-item" href="#" onclick="viewPromotionCode('${position._id}'); return false;">
                            <i class="fas fa-qrcode me-2"></i>Promotion Code
                        </a>
                    </li>
                </ul>
            </div>
        `;
    } else {
        // Disabled Actions dropdown - before payment and verification
        othersCell = `
            <div class="dropdown">
                <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" 
                        disabled title="Available after payment verification">
                    Actions ▼
                </button>
            </div>
        `;
    }
    
    row.innerHTML = `
        <td><strong>${position.sNo}</strong></td>
        <td>
            <strong>${position.post}</strong><br>
            <small class="text-muted">${location}</small>
        </td>
        <td>${nameCell}</td>
        <td class="text-center">${photoCell}</td>
        <td>${phoneNo}</td>
        <td>${introducedBy}</td>
        <td><strong>${days}</strong></td>
        <td><span class="badge ${statusClass}">${statusText}</span></td>
        <td>${othersCell}</td>
    `;
    
    return row;
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
async function submitApplication() {
    const form = document.getElementById('applicationForm');
    
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
        const submitBtn = document.getElementById('submitApplication');
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
            console.log(`   ${key}: ${value}`);
        }
        
        const response = await fetch(`${API_BASE_URL}/applications`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification('Application submitted successfully! Please wait for admin review.', 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('applicationModal'));
            modal.hide();
            
            // Reload positions to show the new application
            await loadApplications();
            
            // Clear current position
            window.currentPosition = null;
        } else {
            throw new Error(result.error || 'Failed to submit application');
        }
    } catch (error) {
        console.error('❌ Error submitting application:', error);
        showNotification(error.message || 'Error submitting application', 'error');
    } finally {
        const submitBtn = document.getElementById('submitApplication');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Submit Application';
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

// View Promotion Code
function viewPromotionCode(positionId) {
    const position = currentPositions.find(p => p._id === positionId);
    if (!position || !position.applicantDetails) {
        showNotification('Position not found', 'error');
        return;
    }
    
    const personCode = position.applicantDetails.personCode || 'NOT_ASSIGNED';
    const promotionUrl = `${window.location.origin}?ref=${personCode}`;
    
    // Create promotion code modal
    const modalHTML = `
        <div class="modal fade" id="promotionModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-qrcode me-2"></i>Promotion Code
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body text-center">
                        <h4 class="mb-4">Your Promotion Code</h4>
                        <div class="bg-light p-4 rounded mb-3">
                            <h2 class="text-primary fw-bold">${personCode}</h2>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Referral URL:</label>
                            <div class="input-group">
                                <input type="text" class="form-control" id="promotionUrl" value="${promotionUrl}" readonly>
                                <button class="btn btn-outline-secondary" onclick="copyPromotionUrl()">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                        </div>
                        <p class="text-muted">
                            <i class="fas fa-info-circle me-1"></i>
                            Share this code with people you introduce to earn rewards
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('promotionModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('promotionModal'));
    modal.show();
}

// Copy promotion URL
function copyPromotionUrl() {
    const urlInput = document.getElementById('promotionUrl');
    urlInput.select();
    document.execCommand('copy');
    showNotification('Promotion URL copied to clipboard!', 'success');
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
    const toastElement = document.createElement('div');
    toastElement.innerHTML = toastHtml;
    toastContainer.appendChild(toastElement.firstElementChild);

    // Show toast
    const toast = new bootstrap.Toast(toastElement.firstElementChild, {
        autohide: true,
        delay: 3000
    });
    toast.show();

    // Remove from DOM after hiding
    toastElement.firstElementChild.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

// Utility functions
function showLoading(show) {
    const tbody = document.getElementById('positionsTableBody');
    if (show) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="text-center py-5">
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

// Show filter dropdown with search functionality
function showFilterDropdown(inputId, dropdownId, dataKey) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    const container = input.closest('.filter-container');
    
    if (!locationData[dataKey] || !Array.isArray(locationData[dataKey])) {
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

    const data = locationData[dataKey];
    
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
    
    // Trigger filter update
    loadApplications();
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
    
    // Trigger filter update
    loadApplications();
}


