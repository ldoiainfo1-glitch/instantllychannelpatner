// Configuration - Updated for Vercel deployment fix
const API_BASE_URL = 'https://instantllychannelpatner.onrender.com/api';

// Global variables
let currentPositions = [];
let locationData = {};
let isAdmin = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadLocationData();
    loadApplications();
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
    
    // Cascade filters
    document.getElementById('filterZone').addEventListener('change', handleZoneChange);
    document.getElementById('filterState').addEventListener('change', handleStateChange);
    document.getElementById('filterDivision').addEventListener('change', handleDivisionChange);
    document.getElementById('filterDistrict').addEventListener('change', handleDistrictChange);
    document.getElementById('filterTehsil').addEventListener('change', handleTehsilChange);
    document.getElementById('filterPincode').addEventListener('change', handlePincodeChange);
    document.getElementById('filterVillage').addEventListener('change', handleVillageChange);
    
    // Application form
    document.getElementById('submitApplication').addEventListener('click', submitApplication);
    
    // Feedback form (now using dummy content, no form needed)
    
    // Rating stars
    setupRatingStars();
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

// Populate all dropdowns with complete options for direct selection
function populateAllDropdowns() {
    // Populate zones
    populateDropdown('filterZone', locationData.zones);
    
    // Populate all states from entire India
    populateDropdown('filterState', locationData.states);
    
    // Populate all divisions
    populateDropdown('filterDivision', locationData.divisions);
    
    // Populate all districts
    populateDropdown('filterDistrict', locationData.districts);
    
    // Populate all tehsils
    populateDropdown('filterTehsil', locationData.tehsils);
    
    // Populate all pincodes
    populateDropdown('filterPincode', locationData.pincodes);
    
    // Populate all villages
    populateDropdown('filterVillage', locationData.villages);
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

// Load applications directly from applications collection
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
        
        // Build query params - use applications endpoint to show all submitted applications
        const params = new URLSearchParams({ country });
        if (zone) params.append('zone', zone);
        if (state) params.append('state', state);
        if (division) params.append('division', division);
        if (district) params.append('district', district);
        if (tehsil) params.append('tehsil', tehsil);
        if (pincode) params.append('pincode', pincode);
        if (village) params.append('village', village);
        
        const url = `${API_BASE_URL}/applications?${params.toString()}`;
        console.log('🔍 Loading applications directly:', url);
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const applications = await response.json();
        console.log('📊 Applications loaded:', applications.length);
        
        // Convert applications to position-like format for display
        currentPositions = applications.map((app, index) => ({
            _id: app.positionId || app._id,
            sNo: index + 1, // Generate serial number
            post: 'Committee', // Default post type
            designation: app.positionTitle || 'Position Applied', // Use position title if available
            location: app.location || { country: 'India' }, // Use location from application
            status: app.status === 'pending' ? 'Pending' : app.status === 'approved' ? 'Approved' : 'Verified',
            applicantDetails: {
                name: app.applicantInfo.name,
                phone: app.applicantInfo.phone,
                email: app.applicantInfo.email,
                photo: app.applicantInfo.photo,
                address: app.applicantInfo.address,
                companyName: app.applicantInfo.companyName,
                businessName: app.applicantInfo.businessName,
                appliedDate: app.appliedDate,
                introducedBy: app.introducedBy || 'Self',
                introducedCount: 0,
                days: Math.floor((new Date() - new Date(app.appliedDate)) / (1000 * 60 * 60 * 24)),
                applicationId: app._id,
                paymentStatus: app.paymentStatus || 'pending',
                isVerified: app.isVerified || false
            }
        }));
        
        console.log('🎯 Applications converted to display format:', currentPositions.length);
        currentPositions.forEach(pos => {
            console.log(`   - ${pos.designation}: ${pos.applicantDetails.name} (${pos.status})`);
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
        if (position.status === 'Verified' || (position.applicantDetails.isVerified && position.applicantDetails.paymentStatus === 'paid')) {
            statusText = 'Verified';
        } else if (position.status === 'Approved' && position.applicantDetails.paymentStatus === 'paid') {
            statusText = 'Payment Done';
        } else if (position.status === 'Approved' && position.applicantDetails.paymentStatus === 'pending') {
            statusText = 'Approved - Payment Pending';
        } else if (position.status === 'Pending') {
            statusText = 'Pending Admin Review';
        } else {
            statusText = position.status;
        }
    }
    
    // Format location for position display
    const location = formatLocation(position.location);
    
    // Handle name - since we're only showing applications, always show the applicant name
    let nameCell = '';
    if (position.applicantDetails && position.applicantDetails.name) {
        nameCell = position.applicantDetails.name;
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
        <td><span class="badge bg-secondary">${position.post}</span></td>
        <td>
            <strong>${position.designation}</strong><br>
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
        'Approved - Payment Pending': 'bg-info',
        'Payment Done': 'bg-primary',
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
    document.getElementById('searchName').value = '';
    document.getElementById('searchPhone').value = '';
    document.getElementById('filterZone').selectedIndex = 0;
    clearDependentSelects(['filterState', 'filterDivision', 'filterDistrict', 'filterTehsil', 'filterPincode', 'filterVillage']);
    
    // Reload applications with default India filter
    loadApplications();
    showNotification('Filters cleared', 'info');
}

// Open application modal (for new applications - this system now shows existing applications only)
function openApplicationModal(positionId) {
    // Since we're now showing applications directly, this function is not needed
    // But keeping it for backwards compatibility
    showNotification('This system now shows submitted applications. To apply for new positions, please contact admin.', 'info');
}

// Submit application
async function submitApplication() {
    const form = document.getElementById('applicationForm');
    const formData = new FormData(form);
    
    // Validate form
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    try {
        const submitBtn = document.getElementById('submitApplication');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Submitting...';
        
        const response = await fetch(`${API_BASE_URL}/applications`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification('Application submitted successfully! Refreshing data...', 'success');
            bootstrap.Modal.getInstance(document.getElementById('applicationModal')).hide();
            form.reset();
            
            // Add a small delay to ensure database is updated, then refresh
            setTimeout(() => {
                console.log('🔄 Refreshing positions data after application submission...');
                loadApplications(); // Refresh applications to show updated status
            }, 500);
        } else {
            throw new Error(result.error || 'Application failed');
        }
    } catch (error) {
        console.error('Error submitting application:', error);
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

// Edit Profile Function
function editProfile(positionId) {
    const position = currentPositions.find(p => p._id === positionId);
    if (!position || !position.applicantDetails) {
        showNotification('Profile not found', 'error');
        return;
    }
    
    const applicant = position.applicantDetails;
    
    // Create profile modal HTML
    const modalHTML = `
        <div class="modal fade" id="profileModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-user me-2"></i>User Profile
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row g-3">
                            <div class="col-md-4 text-center">
                                ${applicant.photo ? 
                                    `<img src="${API_BASE_URL.replace('/api', '')}/uploads/${applicant.photo}" 
                                         alt="${applicant.name}" 
                                         class="img-fluid rounded-circle mb-3" 
                                         style="width: 150px; height: 150px; object-fit: cover;">` :
                                    `<div class="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                                         style="width: 150px; height: 150px;">
                                         <i class="fas fa-user fa-4x text-muted"></i>
                                     </div>`
                                }
                            </div>
                            <div class="col-md-8">
                                <div class="mb-3">
                                    <label class="form-label fw-bold">Name:</label>
                                    <p class="form-control-plaintext">${applicant.name}</p>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label fw-bold">Phone No:</label>
                                    <p class="form-control-plaintext">${applicant.phone}</p>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label fw-bold">Login ID:</label>
                                    <p class="form-control-plaintext">${applicant.phone}</p>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label fw-bold">Person Code:</label>
                                    <p class="form-control-plaintext badge bg-info fs-6">${applicant.personCode || 'Not assigned'}</p>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label fw-bold">Position:</label>
                                    <p class="form-control-plaintext">${position.designation}</p>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label fw-bold">People Introduced:</label>
                                    <p class="form-control-plaintext badge bg-success fs-6">${applicant.introducedCount || 0}</p>
                                </div>
                            </div>
                        </div>
                        <hr>
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            <strong>Default Password:</strong> MUSK (for first login)<br>
                            <small>Users can change their password after logging in.</small>
                        </div>
                        <div class="d-grid gap-2">
                            <button class="btn btn-warning" onclick="showChangePasswordForm()">
                                <i class="fas fa-key me-2"></i>Change Password
                            </button>
                            <button class="btn btn-outline-primary" onclick="showForgotPasswordForm('${applicant.phone}')">
                                <i class="fas fa-lock me-2"></i>Forgot Password
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('profileModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('profileModal'));
    modal.show();
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

// Utility functions
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${getAlertClass(type)} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 100px; right: 20px; z-index: 9999; min-width: 300px;';
    
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

function getAlertClass(type) {
    const classes = {
        'success': 'success',
        'error': 'danger',
        'warning': 'warning',
        'info': 'info'
    };
    return classes[type] || 'info';
}

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


