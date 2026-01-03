## Payment Scanner Image

To complete the manual payment flow, you need to add a scanner QR code image:

### Required File:
**File Name:** `scanner.jpg`
**Location:** `/frontend/images/scanner.jpg`

### What to include:
- A QR code for UPI payment
- Or a screenshot of your payment details
- Recommended size: 300x300 to 600x600 pixels
- Format: JPG or PNG

### How to add:
1. Create or obtain your payment QR code
2. Save it as `scanner.jpg`
3. Place it in the `frontend/images/` folder
4. The system will automatically display it in the payment modal

### Fallback:
If the scanner.jpg file is not found, the system will display the Instantly Cards logo as a fallback.

### Note:
Make sure the QR code is clearly visible and scannable by popular UPI apps like:
- PhonePe
- Google Pay
- Paytm
- BHIM UPI
- Any other UPI-enabled banking app
