const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'your_razorpay_key_id',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'your_razorpay_key_secret'
});

// Create Razorpay order
router.post('/create-order', async (req, res) => {
  try {
    const { amount, positionId, applicantPhone } = req.body;

    if (!amount || !positionId || !applicantPhone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const options = {
      amount: amount * 100, // Amount in paise
      currency: 'INR',
      receipt: `receipt_${positionId}_${Date.now()}`,
      notes: {
        positionId: positionId,
        applicantPhone: applicantPhone,
        description: 'Channel Partner Position Payment'
      }
    };

    const order = await razorpay.orders.create(options);

    console.log('✅ Razorpay order created:', order.id);

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'your_razorpay_key_id'
    });
  } catch (error) {
    console.error('❌ Error creating Razorpay order:', error);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// Verify Razorpay payment signature
router.post('/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification details' });
    }

    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'your_razorpay_key_secret')
      .update(sign.toString())
      .digest('hex');

    if (razorpay_signature === expectedSign) {
      console.log('✅ Payment signature verified');
      res.json({ success: true, message: 'Payment verified successfully' });
    } else {
      console.error('❌ Invalid payment signature');
      res.status(400).json({ error: 'Invalid payment signature' });
    }
  } catch (error) {
    console.error('❌ Error verifying payment:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// Get payment details
router.get('/payment/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await razorpay.payments.fetch(paymentId);
    
    res.json({
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount / 100,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        createdAt: payment.created_at
      }
    });
  } catch (error) {
    console.error('❌ Error fetching payment:', error);
    res.status(500).json({ error: 'Failed to fetch payment details' });
  }
});

module.exports = router;
