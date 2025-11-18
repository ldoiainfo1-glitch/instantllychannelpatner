const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Search users by phone prefix for credit transfer
router.post('/search-users', authenticateToken, async (req, res) => {
  try {
    const { phonePrefix } = req.body;

    if (!phonePrefix || phonePrefix.length < 2) {
      return res.json({ users: [] });
    }

    // Find users whose phone contains the search prefix (exclude current user)
    const users = await User.find({
      phone: { $regex: phonePrefix, $options: 'i' },
      _id: { $ne: req.userId }
    })
    .select('name phone photo personCode')
    .limit(10);

    // Format users for display
    const formattedUsers = users.map(user => ({
      _id: user._id,
      name: user.name,
      phone: user.phone,
      displayPhone: user.phone,
      profilePicture: user.photo || null,
      personCode: user.personCode
    }));

    res.json({ success: true, users: formattedUsers });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current user's credit balance
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('credits creditsHistory');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      credits: user.credits || 0,
      history: user.creditsHistory || []
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Transfer credits to another user
router.post('/transfer', authenticateToken, async (req, res) => {
  try {
    const { toUserId, amount, description } = req.body;

    // Validate amount
    const transferAmount = parseInt(amount);
    if (!transferAmount || transferAmount < 1) {
      return res.status(400).json({ error: 'Invalid transfer amount' });
    }

    // Get sender
    const sender = await User.findById(req.userId);
    if (!sender) {
      return res.status(404).json({ error: 'Sender not found' });
    }

    // Check if sender has enough credits
    if (sender.credits < transferAmount) {
      return res.status(400).json({ 
        error: `Insufficient credits. You have ${sender.credits} credits.` 
      });
    }

    // Get receiver
    const receiver = await User.findById(toUserId);
    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found' });
    }

    // Prevent self-transfer
    if (sender._id.toString() === receiver._id.toString()) {
      return res.status(400).json({ error: 'Cannot transfer credits to yourself' });
    }

    // Perform transfer
    sender.credits -= transferAmount;
    receiver.credits += transferAmount;

    // Add to credits history for sender
    if (!sender.creditsHistory) sender.creditsHistory = [];
    sender.creditsHistory.push({
      type: 'deduction',
      amount: -transferAmount,
      description: description || `Transferred to ${receiver.name}`,
      date: new Date()
    });

    // Add to credits history for receiver
    if (!receiver.creditsHistory) receiver.creditsHistory = [];
    receiver.creditsHistory.push({
      type: 'bonus',
      amount: transferAmount,
      description: description || `Received from ${sender.name}`,
      date: new Date()
    });

    // Save both users
    await sender.save();
    await receiver.save();

    console.log(`✅ Transfer successful: ${sender.name} → ${receiver.name}: ${transferAmount} credits`);

    res.json({
      success: true,
      message: `Successfully transferred ${transferAmount} credits to ${receiver.name}`,
      senderCredits: sender.credits,
      receiverCredits: receiver.credits
    });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get transfer history (recent transactions)
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const user = await User.findById(req.userId).select('creditsHistory name');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get recent transactions from credits history
    const history = user.creditsHistory || [];
    const recentTransactions = history
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);

    // Format transactions for display
    const formattedTransactions = recentTransactions.map(transaction => {
      // Determine transaction type
      let type = 'other';
      if (transaction.description?.includes('Transferred to')) {
        type = 'transfer_sent';
      } else if (transaction.description?.includes('Received from')) {
        type = 'transfer_received';
      } else if (transaction.type === 'referral') {
        type = 'referral_bonus';
      } else if (transaction.type === 'initial') {
        type = 'joining_bonus';
      }

      return {
        _id: transaction._id,
        type: type,
        amount: Math.abs(transaction.amount),
        description: transaction.description,
        createdAt: transaction.date,
        // Extract other user name from description
        fromUser: transaction.description?.includes('Received from') 
          ? { name: transaction.description.split('Received from ')[1] || 'Unknown' }
          : null,
        toUser: transaction.description?.includes('Transferred to')
          ? { name: transaction.description.split('Transferred to ')[1] || 'Unknown' }
          : null
      };
    });

    res.json({
      success: true,
      transactions: formattedTransactions
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
