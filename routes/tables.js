// routes/tables.js
const express = require('express');
const router = express.Router();
const { 
  getTables,
  getTableById,
  createTable,
  updateTable,
  deleteTable
} = require('../controllers/tableController');
const auth = require('../middleware/auth');

// @route   GET /api/tables
// @desc    Get tables
// @access  Private
router.get('/', auth, getTables);

// @route   GET /api/tables/:id
// @desc    Get table by ID
// @access  Private
router.get('/:id', auth, getTableById);

// @route   POST /api/tables
// @desc    Create a table
// @access  Private (Owner, Manager with permission)
router.post('/', auth, createTable);

// @route   PUT /api/tables/:id
// @desc    Update a table
// @access  Private (Owner, Manager with permission, Waiter for status only)
router.put('/:id', auth, updateTable);

// @route   DELETE /api/tables/:id
// @desc    Delete a table
// @access  Private (Owner, Manager with permission)
router.delete('/:id', auth, deleteTable);

module.exports = router;