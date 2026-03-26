const express = require('express');
const router = express.Router();

// Razorpay is not used - all payment routes return 503
router.post('/create-order', (req, res) => res.status(503).json({ error: 'Payment service not enabled' }));
router.post('/verify-payment', (req, res) => res.status(503).json({ error: 'Payment service not enabled' }));
router.post('/webhook', (req, res) => res.status(503).json({ error: 'Payment service not enabled' }));
router.get('/payment/:paymentId', (req, res) => res.status(503).json({ error: 'Payment service not enabled' }));

module.exports = router;



// Initialize Razorpay instance (safe init - won't crash server if keys missing)
let razorpay = null;
try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log('✅ Razorpay initialized');
  } else {
    console.warn('⚠️ Razorpay keys not set - payment routes will return 503');
  }
} catch (e) {
  console.error('⚠️ Razorpay init failed:', e.message);
}

// Create Razorpay order
router.post('/create-order', async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(503).json({ error: 'Payment service not configured' });
    }
    const { amount, positionId, applicantPhone } = req.body;

    if (!amount || !positionId || !applicantPhone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const options = {
      amount: amount * 100, // Amount in paise
      // amount: 1 * 100, // Amount in
      currency: 'INR',
      receipt: `${positionId}_${Date.now().toString().slice(-6)}`,
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
      razorpayKeyId: process.env.RAZORPAY_KEY_ID 
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

// Post Webhook to handle payment events
router.post(
  "/webhook",
  express.raw({ type: "*/*" }),
  async (req, res) => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    const signature = req.headers["x-razorpay-signature"];

    const hash = crypto
      .createHmac("sha256", webhookSecret)
      .update(req.body)
      .digest("hex");

    if (hash !== signature) {
      console.log("❌ Invalid webhook signature");
      return res.status(400).json({ error: "Invalid signature" });
    }

    const event = JSON.parse(req.body.toString());
    console.log("WEBHOOK:", event.event);

    // HANDLE ONLY THIS 👇
    if (event.event !== "payment.captured") {
      return res.json({ ignore: true });
    }

    const payment = event.payload.payment.entity;

    const positionId = payment.notes.positionId;
    const phone = payment.notes.phone;
    const amount = payment.amount / 100;

    // Find application
    const application = await Application.findOne({
      "applicantInfo.phone": phone
    });

    if (!application) return res.json({ message: "App not found" });

    // Save payment
    application.payment = {
      razorpayOrderId: payment.order_id,
      razorpayPaymentId: payment.id,
      amount,
      status: "completed",
      paidAt: new Date()
    };

    await application.save();

    console.log("✔ Payment Verified + Credits Added");
    res.json({ ok: true });
  }
);

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
