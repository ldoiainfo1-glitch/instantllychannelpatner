# Admin and User Login Credentials

## 🔐 Admin Panel Access

### Admin Panel URL
```
https://instantllychannelpatner.onrender.com/admin.html
```

### Admin Password
```
Password: admin123
```

### How to Access Admin Panel
1. Navigate to `admin.html`
2. You will be prompted: "Enter admin password to access this page:"
3. Enter: `admin123`
4. Click OK
5. You will be logged into the admin dashboard

### Admin Panel Features
- **Dashboard Stats**: View total positions, applications, approvals
- **Pending Applications**: Review and approve/reject applications
- **Approved Applications**: View all approved applications
- **Rejected Applications**: View all rejected applications
- **Approve/Reject**: Click action buttons to approve or reject applications
- **Video Management**: Upload instruction videos

### Logout
- Click the "Logout" button in the top navigation
- This will clear the stored password and redirect to homepage

---

## 👤 User Login System

### User Login URL
```
https://instantllychannelpatner.onrender.com/profile.html
```

### Login Credentials Format
- **Login ID**: Phone number (10 digits)
- **Password**: First 4 letters of name in CAPITAL

### Example: Muskaan Shaikh
```
Login ID: 8828188930
Password: MUSK
```

### How Password is Generated
```javascript
// Step 1: Remove spaces from name
"Muskaan Shaikh" → "MuskaanShaikh"

// Step 2: Take first 4 characters
"MuskaanShaikh".substring(0, 4) → "Musk"

// Step 3: Convert to UPPERCASE
"Musk".toUpperCase() → "MUSK"

// If name has less than 4 letters, pad with 'X'
"Sam" → "SAMX"
"Li" → "LIXX"
```

### More Examples
| Name | Phone | Login ID | Password |
|------|-------|----------|----------|
| Muskaan Shaikh | 8828188930 | 8828188930 | MUSK |
| Rajesh Kumar | 9876543210 | 9876543210 | RAJE |
| Priya Sharma | 9123456789 | 9123456789 | PRIY |
| Sam | 9111111111 | 9111111111 | SAMX |
| A B | 9222222222 | 9222222222 | ABXX |

### When User Account is Created
User accounts are automatically created when:
1. User applies for a position via `index.html`
2. Admin approves the application via `admin.html`
3. System creates User record with:
   - `loginId` = phone number
   - `password` = first 4 letters of name (CAPITAL, hashed in DB)
   - `personCode` = unique referral code (e.g., IC12345678)
   - `credits` = 0 (becomes 60,000 after payment)

### How to Login
1. Go to `profile.html`
2. Enter your phone number in "Phone Number" field
3. Enter your password (first 4 letters of name in CAPITAL)
4. Click "Login to Dashboard"
5. If correct, you'll see your profile dashboard

### First Login
- After first login, users can change their password
- Default passwords are predictable for security
- System tracks if user has changed password (`isFirstLogin` flag)

### Forgot Password
Users can:
1. Contact admin to reset password
2. Admin can use test endpoint to reset:
```bash
curl -X POST https://instantllychannelpatner.onrender.com/api/admin/test-user/PHONE \
  -H "Content-Type: application/json" \
  -d '{"newPassword": "NEWPASS"}'
```

---

## 🔍 How to Check User Credentials

### Method 1: Via Admin Panel
1. Login to admin.html with `admin123`
2. Go to "Approved Applications" tab
3. Find the user
4. Click "Actions ▼" → "Login Credentials"
5. Alert will show the login ID and password

### Method 2: Via API (for testing)
```bash
# Check if user exists
curl -X POST https://instantllychannelpatner.onrender.com/api/admin/test-user/8828188930
```

### Method 3: Calculate Manually
```
Login ID = Phone number
Password = First 4 letters of name (UPPERCASE, spaces removed)
```

---

## 🎯 Complete User Journey

### Step 1: Application
1. User visits `index.html`
2. Clicks "Apply Now" on available position
3. Fills form with name, phone, photo, etc.
4. Submits application
5. Status: **Pending**

### Step 2: Admin Approval
1. Admin logs into `admin.html` with `admin123`
2. Views "Pending Applications"
3. Reviews application details
4. Clicks "Approve" button
5. System automatically:
   - Creates User account
   - Generates loginId (phone)
   - Generates password (MUSK for Muskaan Shaikh)
   - Assigns person code (IC12345678)
   - Updates position status to "Approved"

### Step 3: User Login
1. User receives confirmation (email/SMS - if configured)
2. User goes to `profile.html`
3. Enters phone number: `8828188930`
4. Enters password: `MUSK`
5. Clicks "Login to Dashboard"
6. System validates credentials
7. User sees their dashboard with:
   - Profile information
   - Credits: 0 (pending payment)
   - Person code for referrals
   - Edit profile option

### Step 4: Payment & Verification
1. User makes payment (₹10,000)
2. Admin verifies payment
3. Credits updated: 0 → 60,000
4. Payment status: pending → paid
5. User can now use credits

### Step 5: Access Full Features
1. Action button becomes active in "Others" column
2. User can:
   - Edit profile
   - View promotion code
   - Share referral code
   - Earn credits from referrals (5000 per referral)

---

## 🛠️ Testing Credentials

### Test Admin Access
```
URL: https://instantllychannelpatner.onrender.com/admin.html
Password: admin123
```

### Test User Login (if Muskaan Shaikh is approved)
```
URL: https://instantllychannelpatner.onrender.com/profile.html
Login ID: 8828188930
Password: MUSK
```

### Test API Authentication
```bash
# Test admin test-user endpoint
curl -X POST https://instantllychannelpatner.onrender.com/api/admin/test-user/8828188930

# Test login endpoint
curl -X POST https://instantllychannelpatner.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "8828188930",
    "password": "MUSK"
  }'
```

---

## 🔒 Security Notes

### Admin Panel
- **Simple password authentication**: Uses basic password check
- **Stored in localStorage**: Password persists in browser until logout
- **No backend validation**: Frontend-only security
- **Production**: Should implement proper JWT-based admin authentication

### User Login
- **Passwords are hashed**: Uses bcrypt with salt
- **JWT tokens**: Expire after 7 days
- **Secure storage**: Passwords never exposed in API responses
- **First login flag**: Tracks password changes

### Recommendations
1. Change admin password from `admin123` to something secure
2. Implement backend admin authentication
3. Add 2FA for admin access
4. Force users to change password on first login
5. Implement password strength requirements

---

## 📋 Quick Reference

### Admin
- **URL**: `/admin.html`
- **Password**: `admin123`
- **Logout**: Click "Logout" button

### Users
- **Login URL**: `/profile.html`
- **Login ID**: Phone number
- **Password**: First 4 letters of name (CAPITAL)
- **Example**: Muskaan Shaikh = 8828188930 / MUSK

### System Flow
```
Apply → Pending → Admin Approves → User Account Created → User Can Login → Payment → Full Access
```

### Default Values
- **Initial Credits**: 0
- **Credits After Payment**: 60,000
- **Payment Amount**: ₹10,000
- **Referral Credits**: 5,000 per successful referral
