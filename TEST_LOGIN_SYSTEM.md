# Login System Test Guide

## Overview
The login system is now FIXED and uses the following credentials:

### Login Credentials Format
- **Login ID**: Phone number (e.g., 8828188930)
- **Password**: First 4 letters of name in CAPITAL (e.g., "MUSK" for "Muskaan Shaikh")

## How It Works

### 1. Application Approval Process
When an admin approves an application:
1. User account is automatically created in MongoDB
2. Login credentials are generated:
   - `loginId` = applicant's phone number
   - `password` = first 4 capital letters of name (spaces removed)
3. User can now login to profile.html

### 2. Password Generation Logic
```javascript
// Example: "Muskaan Shaikh" with phone "8828188930"
const nameForPassword = "MuskaanShaikh"; // Spaces removed
const password = "MUSK"; // First 4 letters in CAPITAL
```

If name has less than 4 letters, it pads with 'X':
- "Sam" → "SAMX"
- "Li" → "LIXX"

### 3. Login Process
1. User goes to `profile.html`
2. Enters phone number as Login ID
3. Enters password (first 4 letters of name in CAPITAL)
4. System authenticates via `/api/auth/login`
5. JWT token is generated and stored
6. User is redirected to their dashboard

## Testing Steps

### Test Case 1: Muskaan Shaikh
```bash
# Login credentials:
Login ID: 8828188930
Password: MUSK

# Test via curl:
curl -X POST https://instantllychannelpatner.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "8828188930",
    "password": "MUSK"
  }'
```

### Test Case 2: Check if user exists
```bash
curl https://instantllychannelpatner.onrender.com/api/admin/user/8828188930
```

### Test Case 3: Reset password if needed
```bash
curl -X POST https://instantllychannelpatner.onrender.com/api/admin/test-user/8828188930 \
  -H "Content-Type: application/json" \
  -d '{
    "newPassword": "MUSK"
  }'
```

## Fixed Issues

### ✅ Issue 1: Action Button Not Visible
**Problem**: Action button in "Others" column not showing even when status is "Approved"

**Fix**: Changed condition from checking payment status to checking approval status:
```javascript
// OLD (Wrong):
const isPaidAndVerified = position.applicantDetails && 
                          position.applicantDetails.userId && 
                          position.applicantDetails.userId.paymentStatus === 'paid' && 
                          position.isVerified === true;

// NEW (Correct):
const isApprovedOrVerified = position.status === 'Approved' || 
                             position.status === 'Verified' ||
                             (position.applicantDetails && position.applicantDetails.userId);
```

### ✅ Issue 2: Edit Button Links to Login
**Fix**: Now "Edit Profile" button properly redirects to profile.html:
```javascript
<a class="dropdown-item" href="profile.html" 
   onclick="localStorage.setItem('editMode', 'true'); localStorage.setItem('editPositionId', '${position._id}');">
    <i class="fas fa-edit me-2"></i>Edit Profile
</a>
```

### ✅ Issue 3: Login Credentials Display
**Fix**: Added new menu item to show login credentials:
```javascript
<a class="dropdown-item" href="#" onclick="showLoginCredentials('${phone}', '${name}'); return false;">
    <i class="fas fa-key me-2"></i>Login Credentials
</a>
```

When clicked, shows alert:
```
🔐 YOUR LOGIN CREDENTIALS

Login ID: 8828188930
Password: MUSK

📱 Login at: profile.html

💡 Note: Your login ID is your phone number
         Your password is the first 4 letters of your name in CAPITAL
```

## File Changes Made

### 1. frontend/js/app.js
- **Line 590-632**: Fixed action button visibility logic
- **Line 1865-1920**: Added helper functions:
  - `showLoginCredentials(phone, name)` - Display login info
  - `viewPromotionCode(positionId)` - Show promotion code

### 2. frontend/profile.html
- **Line 164-167**: Updated password hint to show correct format

## Database Structure

### User Model Fields
```javascript
{
  name: String,           // "Muskaan Shaikh"
  phone: String,          // "8828188930" (unique)
  loginId: String,        // "8828188930" (same as phone, for login)
  password: String,       // Hashed version of "MUSK"
  personCode: String,     // "IC12345678" (for referrals)
  credits: Number,        // Default 0, becomes 60000 after payment
  paymentStatus: String,  // "pending" or "paid"
  isVerified: Boolean,    // Admin verification status
  isFirstLogin: Boolean,  // True until user changes password
  positionId: ObjectId,   // Reference to Position
  // ...more fields
}
```

## Browser Testing

### Step 1: Open index.html
```
https://instantllychannelpatner.onrender.com/index.html
```

### Step 2: Find an approved application
1. Look in the positions table
2. Find a row where Status = "Approved"
3. Click on "Actions ▼" button in "Others" column
4. Click "Login Credentials" to see the password

### Step 3: Login
1. Click "Edit Profile" or go to profile.html
2. Enter phone number as Login ID
3. Enter password (first 4 letters of name)
4. Click "Login to Dashboard"

### Step 4: Verify
- Should see user dashboard
- Check credits, profile info
- Try changing password

## Common Issues & Solutions

### Issue: "Invalid phone number or password"
**Causes**:
1. User account not created (application not approved yet)
2. Wrong password format (check spaces, capitals)
3. Phone number mismatch

**Solution**:
```bash
# Check if user exists:
curl https://instantllychannelpatner.onrender.com/api/admin/user/PHONE_NUMBER

# If exists but password wrong, check in admin panel or reset
```

### Issue: Action button still not visible
**Causes**:
1. Status is not "Approved" or "Verified"
2. Application not linked to user account
3. Frontend code not updated

**Solution**:
1. Check browser console for errors (F12)
2. Verify status in database
3. Clear browser cache and refresh

### Issue: Password not working
**Causes**:
1. Spaces in name affect password generation
2. Name has less than 4 letters
3. Password was manually changed

**Solution**:
```bash
# Reset password via API:
curl -X POST https://instantllychannelpatner.onrender.com/api/admin/test-user/PHONE \
  -H "Content-Type: application/json" \
  -d '{"newPassword": "NEWPASS"}'
```

## Security Notes

1. **Default passwords are predictable** - Users should change on first login
2. **Passwords are hashed** - bcrypt with salt is used
3. **JWT tokens expire** - After 7 days, must login again
4. **First login flag** - System tracks if user has changed password

## Next Steps

1. ✅ Action button now shows for approved applications
2. ✅ Login system uses correct password format
3. ✅ Users can see their login credentials
4. 🔄 Test with actual user "Muskaan Shaikh" (8828188930)
5. 🔄 Verify edit profile functionality works
6. 🔄 Test promotion code generation

## Support

If login still doesn't work:
1. Check browser console (F12) for JavaScript errors
2. Check server logs for authentication errors
3. Verify user exists in MongoDB Users collection
4. Check that application.userId is populated after approval
