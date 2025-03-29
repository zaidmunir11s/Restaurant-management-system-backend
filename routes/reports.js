// routes/reports.js
const express = require('express');
const router = express.Router();
const { 
  getSalesByDateRange,
  getTopSellingItems,
  getSalesByCategory
} = require('../controllers/reportController');
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

// @route   GET /api/reports/sales
// @desc    Get sales by date range
// @access  Private (Owner, Manager)
router.get('/sales', auth, checkRole(['owner', 'manager']), getSalesByDateRange);

// @route   GET /api/reports/top-items
// @desc    Get top selling items
// @access  Private (Owner, Manager)
router.get('/top-items', auth, checkRole(['owner', 'manager']), getTopSellingItems);

// @route   GET /api/reports/sales-by-category
// @desc    Get sales by category
// @access  Private (Owner, Manager)
router.get('/sales-by-category', auth, checkRole(['owner', 'manager']), getSalesByCategory);

module.exports = router;