# Payment System Implementation Guide

## Overview
The Channel Partner application now includes a comprehensive payment system with Razorpay integration, tier-based pricing, and automatic credit allocation after admin approval.

## Features Implemented

### 1. Two-Step Application Process
- **Step 1**: Fill application form (name, phone, company, etc.)
- **Step 2**: Select payment plan based on position level
- **Step 3**: Complete payment via Razorpay
- **Step 4**: Application submitted (pending admin approval)

### 2. Tier-Based Pricing

| Area Level | Min Pay | Max Pay | Min Credit | Max Credit |
|------------|---------|---------|------------|------------|
| India      | ₹90,000 | ₹90,000 | 600,000    | 600,000    |
| Zone       | ₹90,000 | ₹90,000 | 600,000    | 600,000    |
| State      | ₹90,000 | ₹90,000 | 600,000    | 600,000    |
| Division   | ₹75,000 | ₹90,000 | 500,000    | 600,000    |
| District   | ₹60,000 | ₹90,000 | 400,000    | 600,000    |
| Tehsil     | ₹45,000 | ₹90,000 | 300,000    | 600,000    |
| Pincode    | ₹30,000 | ₹90,000 | 200,000    | 600,000    |
| Village    | ₹15,000 | ₹90,000 | 100,000    | 600,000    |

**Formula**: 
- Pay 15% → Get 85% profit commission + 100% advertisement credits
- Example: Pay ₹30,000 → Get ₹170,000 profit + ₹200,000 ad credits

### 3. Razorpay Integration
- Secure payment gateway
- Real-time payment verification
- Order creation and tracking
- Payment signature validation

### 4. Credit Allocation
- Credits are **not allocated immediately** after payment
- Credits allocated **only after admin approval**
- Credits appear in user profile after approval
- Can be used for ads and transfers

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install razorpay
```

### 2. Configure Razorpay
Get your Razorpay credentials from https://dashboard.razorpay.com/

Add to `.env` file:
```env
RAZORPAY_KEY_ID=your_razorpay_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here
```

### 3. Test Mode vs Production
- **Test Mode**: Use test keys (starts with `rzp_test_`)
- **Production**: Use live keys (starts with `rzp_live_`)

### 4. Database Models Updated
- `Position.js`: Added `pricingTiers` and `customPricing` fields
- `Application.js`: Added `payment` object with tier info, Razorpay details, and `creditsAllocated` flag

## API Endpoints

### Payment Endpoints
- `POST /api/payments/create-order` - Create Razorpay order
- `POST /api/payments/verify-payment` - Verify payment signature
- `GET /api/payments/payment/:paymentId` - Get payment details

### Application Endpoints
- `POST /api/applications/with-payment` - Submit application with payment

## Admin Features (To Be Implemented)

### Custom Pricing Management
Admins can set custom pricing for specific positions:
1. Navigate to admin panel
2. Select position
3. Enable custom pricing
4. Set custom tier amounts
5. Save changes

Custom pricing overrides default tiers for that position.

## User Flow

### Application Process
1. User clicks "Apply Now" on available position
2. Fills application form (name, phone, company, etc.)
3. Clicks "Next: Select Payment Plan"
4. Views available payment tiers for position level
5. Selects desired tier (higher payment = more credits)
6. Clicks "Pay with Razorpay"
7. Completes payment through Razorpay checkout
8. Application submitted with "pending" status

### After Payment
- Application shows "Payment Completed" status
- Credits NOT yet allocated
- Waiting for admin approval

### After Admin Approval
- Admin reviews application
- Admin clicks "Approve"
- System automatically allocates credits to user
- Credits appear in user profile
- User can use credits for ads and transfers

## Security Features

1. **Payment Signature Verification**: All payments verified using Razorpay signature
2. **Server-side Validation**: Payment amount and details validated on backend
3. **Unique Person Code**: Generated for each application
4. **Payment Status Tracking**: Track payment completion and allocation

## Testing

### Test Razorpay Payment
Use Razorpay test cards:
- **Success**: 4111 1111 1111 1111
- **Failure**: 4000 0000 0000 0002
- **CVV**: Any 3 digits
- **Expiry**: Any future date

### Test Flow
1. Create test account in Razorpay dashboard
2. Use test keys in `.env`
3. Make test payment on website
4. Verify in Razorpay dashboard
5. Check application status in database

## Troubleshooting

### Payment Failed
- Check Razorpay keys are correct
- Verify internet connection
- Check console for errors
- Ensure amount is in correct format (paise for Razorpay)

### Credits Not Allocated
- Check if admin has approved application
- Verify `creditsAllocated` flag in database
- Check User model credits field
- Review server logs for errors

### Custom Pricing Not Working
- Ensure `customPricing.enabled` is true
- Verify tiers array is not empty
- Check position ID matches

## Future Enhancements

1. **Admin Dashboard for Pricing**: Visual interface to manage pricing
2. **Payment Analytics**: Track revenue, successful payments, failed payments
3. **Refund System**: Handle payment refunds
4. **Multiple Payment Methods**: Add UPI, wallet, net banking
5. **Payment Receipts**: Generate and email payment receipts
6. **Installment Plans**: Allow payment in installments

## Support

For issues or questions:
1. Check server logs
2. Review Razorpay dashboard
3. Verify database entries
4. Contact development team

## Important Notes

⚠️ **Credits are allocated ONLY after admin approval**
⚠️ **Always verify payment signatures on backend**
⚠️ **Never expose Razorpay secret key in frontend**
⚠️ **Test thoroughly before going live**
⚠️ **Keep test and live keys separate**
