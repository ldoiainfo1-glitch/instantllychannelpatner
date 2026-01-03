# Manual Payment Flow Implementation

## Overview
Replaced Razorpay payment gateway with manual payment flow using QR code scanner and payment screenshot upload.

## Changes Made

### 1. Frontend Changes (index.html)

#### Removed:
- Payment Processing Modal with Razorpay integration

#### Added:
- **Payment Scanner Modal** with:
  - Payment amount display
  - QR code scanner image display
  - Payment screenshot upload field
  - Image preview functionality
  - Submit button (enabled only after screenshot upload)

### 2. JavaScript Changes (app.js)

#### Removed Functions:
- `initiateRazorpayPayment()` - Razorpay payment initialization
- `handlePaymentSuccess()` - Razorpay payment success handler

#### Added Functions:
- `showPaymentScanner()` - Displays payment scanner modal with QR code
- `handleScreenshotSelect()` - Handles payment screenshot file selection and preview
- `cancelPayment()` - Returns to payment plans modal
- `submitApplicationWithScreenshot()` - Submits application with payment screenshot

#### Modified Functions:
- `selectPaymentTier()` - Removed "with Razorpay" text from button

### 3. Backend Changes

#### File: `backend/api/routes/applications.js`

**Multer Configuration:**
- Updated to handle multiple files:
  - `photo` - Applicant photo (optional)
  - `paymentScreenshot` - Payment screenshot (required)
- Added dynamic filename prefix based on fieldname

**Route: `/with-payment` (POST)**

Removed:
- Razorpay order ID, payment ID, signature validation
- Razorpay signature verification logic

Added:
- Multiple file upload support using `upload.fields()`
- Payment screenshot validation (required field)
- Payment screenshot processing and base64 conversion
- Payment status as 'pending' (awaiting admin verification)

Updated Application Data:
```javascript
payment: {
  selectedTier: { pay, profit, credit },
  paymentScreenshot: paymentScreenshotBase64, // NEW
  amount: paymentAmount,
  status: 'pending', // pending verification
  paidAt: Date
}
```

#### File: `backend/api/models/Application.js`

**Payment Schema Changes:**

Removed Fields:
- `razorpayOrderId: String`
- `razorpayPaymentId: String`
- `razorpaySignature: String`

Added Fields:
- `paymentScreenshot: String` - Base64 encoded payment screenshot
- `verifiedAt: Date` - Timestamp when payment verified by admin
- `verifiedBy: String` - Admin who verified the payment

Updated Status Enum:
- Before: `['pending', 'completed', 'failed']`
- After: `['pending', 'verified', 'rejected']`

## User Flow

### Previous Flow (Razorpay):
1. User fills application form
2. Selects payment plan
3. Click "Pay Now" → Opens Razorpay checkout
4. Completes payment via Razorpay
5. Application submitted with payment proof

### New Flow (Manual Payment):
1. User fills application form
2. Selects payment plan
3. Click "Pay Now" → Shows QR code scanner modal
4. User scans QR code using any UPI app
5. Completes payment in their UPI app
6. Takes screenshot of successful payment
7. Uploads screenshot in the modal
8. Preview shown automatically
9. Clicks "Submit Application"
10. Application submitted with payment screenshot (pending admin verification)

## Admin Workflow

Admins now need to:
1. Review submitted applications
2. View payment screenshot
3. Verify payment was received
4. Update payment status to 'verified' or 'rejected'
5. Approve application (which then credits the partner account)

## Scanner Setup

**Required File:** `frontend/images/scanner.jpg`

The scanner image should contain:
- UPI QR code for payment
- Should be scannable by PhonePe, Google Pay, Paytm, etc.
- Recommended size: 300x300 to 600x600 pixels

**Fallback:** If scanner.jpg is missing, the Instantly Cards logo is shown instead.

Refer to `frontend/images/SCANNER_SETUP.md` for detailed instructions.

## API Changes

### Endpoint: POST `/api/applications/with-payment`

**Request Format:**
- Content-Type: `multipart/form-data`

**Required Fields:**
- `positionId`: String
- `name`: String
- `phone`: String
- `paymentAmount`: Number
- `paymentProfit`: Number
- `paymentCredit`: Number
- `paymentScreenshot`: File (image) - **NEW & REQUIRED**

**Optional Fields:**
- `photo`: File (image) - Applicant photo
- `email`, `address`, `companyName`, `businessName`
- Location fields: `country`, `zone`, `state`, etc.
- `introducedBy`: Referrer phone number

**Response:**
```json
{
  "success": true,
  "message": "Application submitted successfully! Your payment will be verified by admin.",
  "applicationId": "...",
  "application": { ... }
}
```

## Benefits of Manual Payment

1. **No Payment Gateway Fees** - Save 2-3% on every transaction
2. **No Razorpay Account Required** - No need for merchant account setup
3. **Direct Bank Transfer** - Money comes directly to your UPI account
4. **Simple Setup** - Just need a QR code image
5. **Flexibility** - Can accept payments via any UPI app
6. **Better Control** - Admin verifies each payment manually

## Testing Checklist

- [ ] Application form submission works
- [ ] Payment plan selection works
- [ ] Scanner modal displays correctly
- [ ] Scanner image loads (or shows fallback)
- [ ] Screenshot upload works
- [ ] Preview displays after upload
- [ ] Submit button enables after upload
- [ ] Application submits with screenshot
- [ ] Backend stores payment screenshot as base64
- [ ] Application status shows "pending"
- [ ] Payment status shows "pending"

## Next Steps for Admin Panel

The admin panel needs to be updated to:
1. Display payment screenshots in application details
2. Add "Verify Payment" and "Reject Payment" buttons
3. Update payment status when verified/rejected
4. Show verification timestamp and admin name
5. Only allow application approval after payment verification

## Environment Variables

**No longer required:**
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

You can remove these from your `.env` file if not used elsewhere.

## File Structure

```
instantllychannelpatner-main/
├── frontend/
│   ├── images/
│   │   ├── scanner.jpg           # ADD THIS - Your UPI QR code
│   │   └── SCANNER_SETUP.md      # Setup instructions
│   ├── index.html                # Updated with scanner modal
│   └── js/
│       └── app.js                # Updated with manual payment flow
└── backend/
    └── api/
        ├── models/
        │   └── Application.js    # Updated payment schema
        └── routes/
            ├── applications.js   # Updated to handle screenshot upload
            └── payments.js       # Can be removed if not used elsewhere
```

## Important Notes

1. **Scanner Image**: Make sure to add `scanner.jpg` to the images folder before deployment
2. **File Size**: Payment screenshots are limited to 5MB
3. **Storage**: Screenshots stored as base64 in MongoDB - consider future optimization
4. **Admin Verification**: Every payment must be manually verified by admin
5. **Payment Status**: Applications now have two statuses:
   - `application.status` - pending/approved/rejected (overall)
   - `application.payment.status` - pending/verified/rejected (payment only)

## Deployment Notes

### Before Deployment:
1. Add scanner.jpg to frontend/images/
2. Test the complete flow locally
3. Ensure MongoDB can store base64 images (increase document size limit if needed)
4. Update admin panel to show payment screenshots

### After Deployment:
1. Test application submission
2. Verify payment screenshot is stored correctly
3. Check admin panel displays screenshot
4. Test payment verification workflow

---

**Implementation Date:** December 12, 2024
**Version:** 2.0.0 - Manual Payment System
