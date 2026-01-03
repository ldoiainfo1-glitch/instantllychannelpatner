# Advertisement Feature Documentation

## Overview
The Advertisement Feature allows channel partners to create, manage, and submit advertisements that will appear in the Instantlly Cards mobile app. Partners can create image or video-based advertisements with customizable durations and automatic credit deduction.

---

## Table of Contents
1. [Features](#features)
2. [Credit System](#credit-system)
3. [User Interface](#user-interface)
4. [Functions & Methods](#functions--methods)
5. [API Endpoints](#api-endpoints)
6. [Data Schema](#data-schema)
7. [Workflow](#workflow)
8. [File Upload Specifications](#file-upload-specifications)
9. [Validation Rules](#validation-rules)

---

## Features

### Core Capabilities
- ✅ Create image or video advertisements
- ✅ Set advertisement duration (1-12 months)
- ✅ Automatic credit calculation and deduction
- ✅ Dual image upload (bottom banner + fullscreen)
- ✅ Real-time preview of uploaded images
- ✅ Admin review and approval system
- ✅ View all user advertisements in a table
- ✅ Edit and delete advertisements
- ✅ Automatic end date calculation

### Advertisement Display Locations
1. **Bottom Banner** - Appears in carousel at bottom of app
2. **Fullscreen** - Shown when user taps the banner (optional)

---

## Credit System

### Pricing Structure
```javascript
Base Rate: ₹1,200 per month = 1,200 credits
```

### Credit Deduction Flow
1. **Cash Credits** used first (paid amount)
2. **Extra Credits** used after cash credits finish (bonus/transferred)

### Cost Calculation
```javascript
Total Cost = Duration (months) × 1,200 credits
```

**Examples:**
- 1 month = 1,200 credits
- 3 months = 3,600 credits
- 6 months = 7,200 credits
- 12 months = 14,400 credits

### Credit Check
```javascript
if (totalCredits < requiredCredits) {
    alert('Insufficient credits');
    return;
}
```

---

## User Interface

### Advertisements Tab Structure

#### 1. My Advertisements Table
```html
<table>
  <thead>
    <tr>
      <th>Title</th>
      <th>Phone</th>
      <th>Start Date</th>
      <th>End Date</th>
      <th>Status</th>
      <th>Actions</th>
    </tr>
  </thead>
</table>
```

**Status Values:**
- `pending` - Awaiting admin review
- `approved` - Live in the app
- `rejected` - Not approved by admin
- `expired` - End date has passed

#### 2. Create Ad Form
**File:** `/frontend/profile.html`  
**Lines:** 845-1064

**Form Fields:**
1. **Title** (text, required)
2. **Media Type** (radio, required)
   - Image
   - Video
3. **Contact Phone** (tel, required)
4. **Duration** (select, required)
5. **Start Date** (date, required)
6. **Bottom Banner** (file, required) - 624 × 174px
7. **Fullscreen Image** (file, optional) - 624 × 1000px

---

## Functions & Methods

### Main Functions

#### 1. `showCreateAdForm()`
**Purpose:** Display the advertisement creation form  
**File:** `/frontend/profile.html`  
**Lines:** ~2420-2435  
**Code:**
```javascript
function showCreateAdForm() {
    document.getElementById('createAdForm').style.display = 'block';
    document.getElementById('createAdForm').scrollIntoView({ behavior: 'smooth' });
    
    // Update credits display
    const creditsEl = document.getElementById('adFormCredits');
    if (creditsEl && currentUser) {
        creditsEl.textContent = currentUser.credits.toLocaleString('en-IN');
    }
    
    // Set minimum start date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('adStartDate').min = today;
}
```

#### 2. `hideCreateAdForm()`
**Purpose:** Hide the form and reset fields  
**File:** `/frontend/profile.html`  
**Lines:** ~2437-2443  
**Code:**
```javascript
function hideCreateAdForm() {
    document.getElementById('createAdForm').style.display = 'none';
    document.getElementById('adCreationForm').reset();
    document.getElementById('bottomImagePreview').style.display = 'none';
    document.getElementById('fullscreenImagePreview').style.display = 'none';
}
```

#### 3. `updateAdPrice()`
**Purpose:** Calculate and display total cost based on duration  
**Triggered:** When duration is selected  
**File:** `/frontend/profile.html`  
**Lines:** ~2445-2465  
**Code:**
```javascript
function updateAdPrice() {
    const duration = parseInt(document.getElementById('adDuration').value) || 0;
    const pricePerMonth = 1200;
    const totalCredits = duration * pricePerMonth;
    const totalAmount = duration * 1200;
    
    document.getElementById('adCost').value = 
        `₹${totalAmount.toLocaleString('en-IN')} (${totalCredits.toLocaleString('en-IN')} credits)`;
    
    document.getElementById('adFormCostDisplay').textContent = 
        `${totalCredits.toLocaleString('en-IN')} credits`;
    
    document.getElementById('submitAdBtn').innerHTML = 
        `<i class="fas fa-paper-plane me-2"></i>Submit Advertisement (${totalCredits.toLocaleString('en-IN')} Credits)`;
    
    // Update end date if start date is set
    updateAdEndDate();
}
```

#### 4. `updateAdEndDate()`
**Purpose:** Calculate and display advertisement end date  
**Triggered:** When start date or duration changes  
**File:** `/frontend/profile.html`  
**Lines:** ~2467-2488  
**Code:**
```javascript
function updateAdEndDate() {
    const startDate = document.getElementById('adStartDate').value;
    const duration = parseInt(document.getElementById('adDuration').value) || 0;
    
    if (startDate && duration) {
        const start = new Date(startDate);
        const end = new Date(start);
        end.setMonth(end.getMonth() + duration);
        
        const endDateStr = end.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        document.getElementById('adEndDateDisplay').textContent = endDateStr;
    } else {
        document.getElementById('adEndDateDisplay').textContent = 
            'Select start date and duration';
    }
}
```

#### 5. `submitAdvertisement(event)`
**Purpose:** Handle form submission and validation  
**File:** `/frontend/profile.html`  
**Lines:** ~2490-2540  
**Flow:**
1. Validate all required fields
2. Check credit balance
3. Show confirmation modal
4. Upload images to server
5. Create advertisement record
6. Deduct credits
7. Refresh advertisements list

**Code:**
```javascript
async function submitAdvertisement(event) {
    event.preventDefault();
    
    // Get form values
    const title = document.getElementById('adTitle').value.trim();
    const mediaType = document.querySelector('input[name="adMediaType"]:checked').value;
    const phone = document.getElementById('adPhone').value.trim();
    const duration = parseInt(document.getElementById('adDuration').value);
    const startDate = document.getElementById('adStartDate').value;
    const bottomImage = document.getElementById('adBottomImage').files[0];
    const fullscreenImage = document.getElementById('adFullscreenImage').files[0];
    
    // Validate
    if (!title || !phone || !duration || !startDate || !bottomImage) {
        alert('Please fill all required fields');
        return;
    }
    
    // Calculate cost
    const requiredCredits = duration * 1200;
    const totalCredits = currentUser.credits || 0;
    
    if (totalCredits < requiredCredits) {
        alert(`Insufficient credits. You need ${requiredCredits} credits but have ${totalCredits}`);
        return;
    }
    
    // Store data for confirmation
    window.pendingAdData = {
        title,
        mediaType,
        phone,
        duration,
        startDate,
        bottomImage,
        fullscreenImage,
        requiredCredits
    };
    
    // Show confirmation modal
    showAdConfirmationModal(title, duration, requiredCredits, totalCredits);
}
```

#### 6. `showAdConfirmationModal()`
**Purpose:** Display confirmation modal with ad details  
**File:** `/frontend/profile.html`  
**Lines:** ~2542-2560  
**Parameters:**
- `title` - Ad title
- `duration` - Duration in months
- `requiredCredits` - Credits to be deducted
- `availableCredits` - User's current credits

**Code:**
```javascript
function showAdConfirmationModal(title, duration, requiredCredits, availableCredits) {
    document.getElementById('confirmAdTitle').textContent = title;
    document.getElementById('confirmAdDuration').textContent = `${duration} month(s)`;
    document.getElementById('confirmAdCost').textContent = requiredCredits.toLocaleString('en-IN');
    document.getElementById('confirmAvailableCredits').textContent = availableCredits.toLocaleString('en-IN');
    document.getElementById('confirmRemainingCredits').textContent = 
        (availableCredits - requiredCredits).toLocaleString('en-IN');
    
    const modal = new bootstrap.Modal(document.getElementById('adConfirmationModal'));
    modal.show();
}
```

#### 7. `confirmAndSubmitAd()`
**Purpose:** Upload images and create advertisement  
**Called:** When user clicks "Confirm & Submit" button  
**File:** `/frontend/profile.html`  
**Lines:** ~2562-2650  
**Process:**
1. Upload bottom banner image
2. Upload fullscreen image (if provided)
3. Create advertisement with image URLs
4. Deduct credits from user account

**Code:**
```javascript
async function confirmAndSubmitAd() {
    const submitBtn = document.getElementById('confirmAdSubmissionBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Submitting...';
    
    try {
        const data = window.pendingAdData;
        const formData = new FormData();
        
        // Calculate end date
        const startDate = new Date(data.startDate);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + data.duration);
        
        // Append all fields
        formData.append('title', data.title);
        formData.append('mediaType', data.mediaType);
        formData.append('phone', data.phone);
        formData.append('duration', data.duration);
        formData.append('startDate', data.startDate);
        formData.append('endDate', endDate.toISOString().split('T')[0]);
        formData.append('cost', data.requiredCredits);
        formData.append('bottomImage', data.bottomImage);
        
        if (data.fullscreenImage) {
            formData.append('fullscreenImage', data.fullscreenImage);
        }
        
        // Submit to API
        const response = await fetch(`${API_BASE_URL}/advertisements`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Close modal
            bootstrap.Modal.getInstance(document.getElementById('adConfirmationModal')).hide();
            
            // Show success message
            showNotification('Advertisement submitted successfully! Pending admin approval.', 'success');
            
            // Refresh data
            await loadUserProfile(); // Refresh credits
            await loadUserAdvertisements(); // Refresh ads list
            
            // Hide form
            hideCreateAdForm();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to submit advertisement');
        }
    } catch (error) {
        console.error('Ad submission error:', error);
        alert(error.message || 'Failed to submit advertisement');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Confirm & Submit';
    }
}
```

#### 8. `loadUserAdvertisements()`
**Purpose:** Fetch and display user's advertisements  
**File:** `/frontend/profile.html`  
**Lines:** ~2652-2675  
**Code:**
```javascript
async function loadUserAdvertisements() {
    try {
        const response = await fetch(`${API_BASE_URL}/advertisements/me`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const ads = await response.json();
            displayUserAdvertisements(ads);
        } else {
            throw new Error('Failed to load advertisements');
        }
    } catch (error) {
        console.error('Load ads error:', error);
        document.getElementById('userAdsTableBody').innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger">
                    Failed to load advertisements
                </td>
            </tr>
        `;
    }
}
```

#### 9. `displayUserAdvertisements(ads)`
**Purpose:** Render advertisements table  
**File:** `/frontend/profile.html`  
**Lines:** ~2677-2735  
**Parameters:** `ads` - Array of advertisement objects  
**Code:**
```javascript
function displayUserAdvertisements(ads) {
    const tbody = document.getElementById('userAdsTableBody');
    
    if (!ads || ads.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
                    No advertisements yet. Create your first ad!
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = ads.map(ad => {
        const statusClass = {
            'pending': 'warning',
            'approved': 'success',
            'rejected': 'danger',
            'expired': 'secondary'
        }[ad.status] || 'secondary';
        
        const startDate = new Date(ad.startDate).toLocaleDateString('en-IN');
        const endDate = new Date(ad.endDate).toLocaleDateString('en-IN');
        
        return `
            <tr>
                <td>${ad.title}</td>
                <td>${ad.phone}</td>
                <td>${startDate}</td>
                <td>${endDate}</td>
                <td><span class="badge bg-${statusClass}">${ad.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewAd('${ad._id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${ad.status === 'pending' ? `
                    <button class="btn btn-sm btn-danger" onclick="deleteAd('${ad._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                    ` : ''}
                </td>
            </tr>
        `;
    }).join('');
}
```

---

## API Endpoints

### 1. Create Advertisement
**Endpoint:** `POST /api/advertisements`  
**Backend File:** `/backend/api/routes/advertisements.js`  
**Lines:** ~50-150  
**Authentication:** Required (Bearer Token)  
**Content-Type:** `multipart/form-data`

**Request Body:**
```javascript
{
    title: string,              // Ad title
    mediaType: 'image' | 'video',
    phone: string,              // Contact number
    duration: number,           // Duration in months
    startDate: string,          // ISO date
    endDate: string,            // ISO date (calculated)
    cost: number,               // Credits deducted
    bottomImage: File,          // Bottom banner image
    fullscreenImage?: File      // Optional fullscreen image
}
```

**Response:**
```javascript
{
    success: true,
    advertisement: {
        _id: string,
        title: string,
        status: 'pending',
        bottomImageUrl: string,
        fullscreenImageUrl?: string,
        createdAt: string
    }
}
```

### 2. Get User Advertisements
**Endpoint:** `GET /api/advertisements/me`  
**Backend File:** `/backend/api/routes/advertisements.js`  
**Lines:** ~152-180  
**Authentication:** Required

**Response:**
```javascript
[
    {
        _id: string,
        title: string,
        phone: string,
        mediaType: string,
        startDate: string,
        endDate: string,
        status: 'pending' | 'approved' | 'rejected' | 'expired',
        cost: number,
        bottomImageUrl: string,
        fullscreenImageUrl?: string,
        createdBy: string,
        createdAt: string,
        updatedAt: string
    }
]
```

### 3. Get Single Advertisement
**Endpoint:** `GET /api/advertisements/:id`  
**Backend File:** `/backend/api/routes/advertisements.js`  
**Lines:** ~182-200  
**Authentication:** Required

### 4. Delete Advertisement
**Endpoint:** `DELETE /api/advertisements/:id`  
**Backend File:** `/backend/api/routes/advertisements.js`  
**Lines:** ~202-230  
**Authentication:** Required  
**Note:** Only pending ads can be deleted

---

## Data Schema

### Advertisement Model
**Backend File:** `/backend/api/models/Advertisement.js`  
**Lines:** 1-80

```javascript
{
    _id: ObjectId,
    title: {
        type: String,
        required: true,
        trim: true
    },
    mediaType: {
        type: String,
        enum: ['image', 'video'],
        required: true
    },
    phone: {
        type: String,
        required: true,
        match: /^[+]?[\d\s-()]+$/
    },
    duration: {
        type: Number,
        required: true,
        min: 1,
        max: 12
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    cost: {
        type: Number,
        required: true
    },
    bottomImageUrl: {
        type: String,
        required: true
    },
    fullscreenImageUrl: {
        type: String
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'expired'],
        default: 'pending'
    },
    createdBy: {
        type: ObjectId,
        ref: 'User',
        required: true
    },
    approvedBy: {
        type: ObjectId,
        ref: 'Admin'
    },
    approvedAt: {
        type: Date
    },
    rejectionReason: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}
```

---

## Workflow

### Advertisement Creation Flow

```
1. User clicks "Create New Ad"
   ↓
2. showCreateAdForm() displays form
   ↓
3. User fills form fields:
   - Title
   - Media Type (Image/Video)
   - Contact Phone
   - Duration
   - Start Date
   - Bottom Banner Image
   - Fullscreen Image (optional)
   ↓
4. updateAdPrice() calculates cost
   ↓
5. updateAdEndDate() calculates end date
   ↓
6. User clicks "Submit Advertisement"
   ↓
7. submitAdvertisement() validates:
   - All required fields filled
   - Sufficient credits available
   - Valid phone number format
   ↓
8. showAdConfirmationModal() displays:
   - Ad title
   - Duration
   - Cost breakdown
   - Available credits
   - Remaining credits after deduction
   ↓
9. User reviews and clicks "Confirm & Submit"
   ↓
10. confirmAndSubmitAd() executes:
    - Uploads bottom image to server
    - Uploads fullscreen image (if provided)
    - Creates advertisement record
    - Deducts credits from user account
    - Records transaction in credits history
    ↓
11. API returns success:
    - Ad status set to "pending"
    - Awaiting admin approval
    ↓
12. loadUserProfile() refreshes credits display
    ↓
13. loadUserAdvertisements() refreshes ads table
    ↓
14. hideCreateAdForm() closes form
    ↓
15. Success notification shown
```

### Admin Review Flow

```
1. Admin views pending advertisements
   ↓
2. Admin reviews ad content:
   - Checks images for quality
   - Verifies contact information
   - Ensures compliance with policies
   ↓
3. Admin approves or rejects:
   ↓
   If APPROVED:
   - Ad status → 'approved'
   - Ad appears in mobile app
   - Visible to all users
   ↓
   If REJECTED:
   - Ad status → 'rejected'
   - Credits refunded to user
   - Rejection reason provided
```

### Advertisement Expiry

```
Daily Cron Job checks:
  ↓
If current_date > endDate:
  ↓
  status = 'expired'
  Ad removed from active display
```

---

## File Upload Specifications

### Bottom Banner Image
- **Recommended Size:** 624 × 174 pixels
- **Format:** JPG, PNG, WebP
- **Max File Size:** 5 MB
- **Aspect Ratio:** ~3.6:1
- **Display Location:** Bottom carousel in mobile app
- **Required:** Yes

### Fullscreen Image
- **Recommended Size:** 624 × 1000 pixels
- **Format:** JPG, PNG, WebP
- **Max File Size:** 10 MB
- **Aspect Ratio:** ~0.624:1
- **Display Location:** Fullscreen modal when user taps banner
- **Required:** No (optional)

### Video Support
When `mediaType: 'video'` is selected:
- Accept video files (MP4, MOV, AVI)
- Max size: 50 MB
- Duration: 15-60 seconds recommended
- Labels update dynamically to "Video" instead of "Image"

---

## Validation Rules

### Form Validation

#### Title
```javascript
- Required: Yes
- Min Length: 3 characters
- Max Length: 100 characters
- Pattern: Alphanumeric with spaces
```

#### Phone Number
```javascript
- Required: Yes
- Pattern: /^[+]?[\d\s-()]+$/
- Example: +919876543210, 9876543210
- Min Length: 10 digits
```

#### Duration
```javascript
- Required: Yes
- Type: Integer
- Min: 1 month
- Max: 12 months
- Options: 1, 2, 3, 4, 5, 6, 12
```

#### Start Date
```javascript
- Required: Yes
- Min: Current date
- Format: YYYY-MM-DD
- Validation: Cannot be in the past
```

#### Bottom Image
```javascript
- Required: Yes
- Types: image/*, video/* (based on mediaType)
- Max Size: 5 MB (image), 50 MB (video)
- Extensions: .jpg, .jpeg, .png, .webp, .mp4, .mov
```

#### Fullscreen Image
```javascript
- Required: No
- Types: image/*, video/* (based on mediaType)
- Max Size: 10 MB (image), 50 MB (video)
```

### Credit Validation
```javascript
function validateCredits(required, available) {
    if (available < required) {
        return {
            valid: false,
            message: `Insufficient credits. Need ${required}, have ${available}`
        };
    }
    return { valid: true };
}
```

---

## Event Listeners

### Media Type Change
**File:** `/frontend/profile.html`  
**Lines:** ~2737-2765  
**Code:**

```javascript
document.querySelectorAll('input[name="adMediaType"]').forEach(radio => {
    radio.addEventListener('change', function() {
        const isVideo = this.value === 'video';
        
        // Update labels
        document.getElementById('adBottomLabel').innerHTML = 
            `<i class="fas fa-${isVideo ? 'video' : 'image'} me-2"></i>
             Bottom ${isVideo ? 'Video' : 'Banner Image'} *`;
        
        document.getElementById('adFullscreenLabel').innerHTML = 
            `<i class="fas fa-${isVideo ? 'video' : 'image'} me-2"></i>
             Fullscreen ${isVideo ? 'Video' : 'Image'} (Optional)`;
        
        // Update hints
        document.getElementById('adBottomHint').textContent = 
            isVideo ? 'Max 15-60 seconds' : 'Recommended: 624 × 174px';
        
        // Update accept attributes
        const accept = isVideo ? 'video/*' : 'image/*';
        document.getElementById('adBottomImage').accept = accept;
        document.getElementById('adFullscreenImage').accept = accept;
    });
});
```

### Image Preview
```javascript
document.getElementById('adBottomImage').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('bottomImagePreviewImg').src = e.target.result;
            document.getElementById('bottomImagePreview').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
});

document.getElementById('adFullscreenImage').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('fullscreenImagePreviewImg').src = e.target.result;
            document.getElementById('fullscreenImagePreview').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
});
```

---

## Error Handling

### Common Errors

#### 1. Insufficient Credits
```javascript
Error: "Insufficient credits. You need X credits but have Y"
Solution: Purchase more credits or wait for credit addition
```

#### 2. File Too Large
```javascript
Error: "File size exceeds maximum limit"
Solution: Compress image/video or use smaller file
```

#### 3. Invalid Date
```javascript
Error: "Start date cannot be in the past"
Solution: Select today or future date
```

#### 4. Network Error
```javascript
Error: "Failed to upload. Please check your internet connection"
Solution: Retry submission
```

#### 5. Authentication Error
```javascript
Error: "Session expired. Please login again"
Solution: Redirect to login page
```

---

## Security Considerations

### 1. Authentication
- All API calls require valid JWT token
- Token stored in localStorage
- Automatic logout on token expiration

### 2. File Upload
- Validate file types on client and server
- Scan for malicious content
- Limit file sizes
- Store in secure cloud storage (e.g., AWS S3)

### 3. Credit Deduction
- Atomic transaction to prevent double-spending
- Verify balance before deduction
- Log all credit transactions
- Rollback on failure

### 4. Data Validation
- Sanitize all user inputs
- Validate on client and server
- Prevent SQL/NoSQL injection
- XSS protection

---

## Testing Checklist

### Unit Tests
- [ ] `updateAdPrice()` calculates correctly
- [ ] `updateAdEndDate()` calculates end date properly
- [ ] Credit validation works
- [ ] File size validation
- [ ] Phone number validation

### Integration Tests
- [ ] Form submission flow
- [ ] Image upload to server
- [ ] Credit deduction
- [ ] Advertisement creation
- [ ] Status transitions

### E2E Tests
- [ ] Complete ad creation workflow
- [ ] Admin approval process
- [ ] Credit refund on rejection
- [ ] Advertisement expiry
- [ ] Mobile app display

---

## Future Enhancements

### Planned Features
1. **Bulk Upload** - Create multiple ads at once
2. **Analytics** - Track views, clicks, conversions
3. **A/B Testing** - Test different ad variations
4. **Scheduling** - Schedule ads for specific times
5. **Targeting** - Location-based ad targeting
6. **Templates** - Pre-designed ad templates
7. **Video Preview** - Show video thumbnails
8. **Auto-Renewal** - Automatically renew expiring ads

---

## Support & Contact

For technical support or queries:
- **Email:** support@instantlly.com
- **Phone:** +91 9833752025
- **Website:** https://instantlly.com

---

## Version History

- **v1.0.0** - Initial release with image advertisements
- **v1.1.0** - Added video support
- **v1.2.0** - Dual credit system (cash + extra)
- **v1.3.0** - Admin approval workflow

---

## License
© 2026 Instantlly Cards. All rights reserved.
