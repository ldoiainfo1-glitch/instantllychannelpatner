# Credits and Login System Implementation

## Overview
This document explains the newly implemented credits system and login functionality.

## Features Implemented

### 1. ✅ Credits System (500 Credits on Approval)

#### Backend Changes:
- **User Model** (`backend/api/models/User.js`):
  - Added `hasReceivedInitialCredits` field to track if user has received initial 500 credits
  - `credits` field with minimum value of 0
  - Phone number is now indexed for faster lookups
  - Email, personCode, and loginId are now optional (sparse unique indexes)

- **Admin Approval Route** (`backend/api/routes/admin.js`):
  - When admin approves an application:
    1. Checks if user exists with the phone number
    2. Creates new user account if doesn't exist (password defaults to phone number)
    3. Grants 500 credits on first approval if `hasReceivedInitialCredits` is false
    4. Links the application to the user account
  - Response now includes credits information

### 2. ✅ Login System

#### Backend Changes:
- **Authentication Routes** (`backend/api/routes/auth.js`):
  - `POST /api/auth/register` - Register new user (for future use)
  - `POST /api/auth/login` - Login with phone number and password
  - `GET /api/auth/verify` - Verify JWT token
  - `GET /api/auth/profile` - Get user profile with credits
  - `PUT /api/auth/change-password` - Change password

- **Server** (`backend/server/index.js`):
  - Registered auth routes at `/api/auth`

#### Frontend Changes:
- **Navigation Bar** (`frontend/index.html`):
  - Added Login button (visible when not logged in)
  - Added User dropdown menu (visible when logged in)
  - Shows user name and credits in dropdown
  - Profile and Logout options

- **Login Modal**:
  - Phone number input
  - Password input
  - Default password hint (phone number)
  - Error message display

- **Profile Modal**:
  - User photo display
  - Name, phone, email
  - **Credits display** (large card showing available credits)
  - Introduced by information
  - People introduced count
  - Change password button

- **Authentication JavaScript** (`frontend/js/app.js`):
  - Token-based authentication (JWT stored in localStorage)
  - Auto-login on page load if token exists
  - `openLoginModal()` - Open login modal
  - `handleLogin()` - Process login
  - `verifyToken()` - Verify session on page load
  - `updateAuthUI()` - Update navigation based on login state
  - `logout()` - Clear session and logout
  - `showProfile()` - Display user profile with credits
  - `changePassword()` - Change user password
  - `showNotification()` - Toast-style notifications

### 3. ✅ Bug Fixes

- **Action Button Visibility**: Fixed issue where delete buttons weren't showing in approved/rejected tabs
- **Designation Column Removed**: Removed the designation column from the position table as requested

## How It Works

### User Registration Flow:
1. User applies for a position
2. Admin approves the application
3. System automatically:
   - Creates user account with phone number
   - Sets default password as phone number
   - Grants 500 credits (first approval only)
   - Links application to user account

### Login Flow:
1. User clicks "Login" button in navigation
2. Enters phone number and password (default: phone number)
3. System validates credentials
4. Returns JWT token (valid for 7 days)
5. Token stored in browser localStorage
6. UI updates to show user menu with credits

### Credits Display:
- Credits shown in navigation dropdown
- Full details in profile modal
- Initial 500 credits granted on first approval
- Credits balance persisted in database

## Default Credentials

After approval, users can login with:
- **Phone Number**: Their registered phone number
- **Password**: Their phone number (they should change this)

Example:
- Phone: 9876543210
- Password: 9876543210

## Security Features

- Passwords are hashed using bcryptjs before storage
- JWT tokens expire after 7 days
- Token verification on protected routes
- Password change functionality included

## Testing

### Test the Credits System:
1. Submit an application
2. Admin approves it from admin panel
3. Check console logs - should show "Granted 500 initial credits"
4. User account created automatically

### Test Login:
1. After approval, go to main page
2. Click "Login" button in navigation
3. Enter phone number and phone number as password
4. Should see user menu with credits

### Test Profile:
1. Click on user name dropdown when logged in
2. Select "Profile"
3. Should see all user details and credits balance

## API Endpoints

### Authentication:
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register (manual)
- `GET /api/auth/verify` - Verify token
- `GET /api/auth/profile` - Get profile
- `PUT /api/auth/change-password` - Change password

### Admin (Updated):
- `PUT /api/admin/applications/:id/approve` - Now grants credits

## Database Schema Changes

### User Model:
```javascript
{
  name: String,
  phone: String (unique, indexed),
  email: String (optional),
  password: String (hashed),
  credits: Number (default: 0, min: 0),
  hasReceivedInitialCredits: Boolean (default: false),
  introducedBy: String,
  introducedCount: Number,
  photo: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Application Model (Updated):
```javascript
{
  userId: ObjectId (reference to User),
  // ... other fields remain same
}
```

## Next Steps (Future Enhancements)

1. **Credits Usage System**:
   - Deduct credits for specific actions
   - Add credits history/transactions
   - Credits transfer between users

2. **Enhanced Profile**:
   - Edit profile information
   - Upload new profile photo
   - View application history

3. **Forgot Password**:
   - OTP-based password reset
   - Email/SMS integration

4. **Two-Factor Authentication**:
   - OTP verification on login
   - Enhanced security

5. **Credits Rewards**:
   - Earn credits for referrals
   - Bonus credits for milestones

## Files Modified

### Backend:
- `/backend/api/models/User.js` - Updated user schema
- `/backend/api/routes/auth.js` - **NEW** Authentication routes
- `/backend/api/routes/admin.js` - Updated approve endpoint
- `/backend/server/index.js` - Registered auth routes

### Frontend:
- `/frontend/index.html` - Added navigation, login modal, profile modal
- `/frontend/js/app.js` - Added authentication functions
- `/frontend/admin.html` - Fixed action button visibility

## Troubleshooting

### Login Not Working:
- Check if application was approved
- Try phone number as password
- Check browser console for errors

### Credits Not Showing:
- Verify application status is "approved"
- Check if `hasReceivedInitialCredits` is true in database
- Refresh profile page

### Token Expired:
- Simply login again
- Token valid for 7 days

## Support

For issues or questions:
1. Check browser console for errors
2. Check backend server logs
3. Verify MongoDB connection
4. Ensure all dependencies installed (`npm install`)
