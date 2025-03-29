// routes/orders.js
const express = require('express');
const router = express.Router();
const { 
  getOrders,
  getActiveOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder
} = require('../controllers/orderController');
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

// @route   GET /api/orders
// @desc    Get orders
// @access  Private
router.get('/', auth, getOrders);

// @route   GET /api/orders/active
// @desc    Get active orders
// @access  Private
router.get('/active', auth, getActiveOrders);

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get('/:id', auth, getOrderById);

// @route   POST /api/orders
// @desc    Create an order
// @access  Private (Owner, Manager, Waiter with POS access)
router.post('/', auth, createOrder);

// @route   PUT /api/orders/:id
// @desc    Update an order
// @access  Private (Owner, Manager, Waiter with POS access)
router.put('/:id', auth, updateOrder);

// @route   DELETE /api/orders/:id
// @desc    Delete an order
// @access  Private (Owner, Manager)
router.delete('/:id', auth, checkRole(['owner', 'manager']), deleteOrder);

module.exports = router;    