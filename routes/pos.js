// routes/pos.js
const express = require('express');
const router = express.Router();
const { 
  getPosData,
  processPayment
} = require('../controllers/posController');
const auth = require('../middleware/auth');

// @route   GET /api/pos/data
// @desc    Get POS data
// @access  Private (Owner, Manager, Waiter with POS access)
router.get('/data', auth, getPosData);

// @route   POST /api/pos/payment
// @desc    Process payment
// @access  Private (Owner, Manager, Waiter with POS access)
router.post('/payment', auth, processPayment);

module.exports = router;